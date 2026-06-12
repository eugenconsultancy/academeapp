import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import useChatStore from '../../stores/useChatStore';
import { chatApi } from '../../api/chatApi';
import toast from 'react-hot-toast';
import { FiPaperclip, FiMic, FiSend, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const MAX_VOICE_DURATION = 120; // 2 minutes
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MessageInput = ({ conversationId, replyingTo, onCancelReply }) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');

  const socket = useChatStore((state) => state.socket);
  const isSocketConnected = useChatStore((state) => state.isSocketConnected);
  const userId = useChatStore((state) => state.userId);
  const addPendingMessage = useChatStore((state) => state.addPendingMessage);
  const queueMessage = useChatStore((state) => state.queueMessage);
  const flushQueue = useChatStore((state) => state.flushQueue);
  const removePendingMessage = useChatStore((state) => state.removePendingMessage);
  const markMessageFailed = useChatStore((state) => state.markMessageFailed);

  const typingTimeoutRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const pendingMessageRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Typing Indicator
  const sendTypingEvent = useCallback(
    (isTyping) => {
      if (socket && isSocketConnected) {
        socket.send(
          JSON.stringify({
            type: 'typing',
            is_typing: isTyping,
          })
        );
      }
    },
    [socket, isSocketConnected]
  );

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setContent(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      sendTypingEvent(true);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingEvent(false);
    }, 3000);
  }, [isTyping, sendTypingEvent]);

  // Message Sending
  const sendMessage = useCallback(async (messageData) => {
    if (!userId) return;

    const tempId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = addPendingMessage(conversationId, tempId, messageData.content, messageData.msg_type, messageData.file_url);
    pendingMessageRef.current = { tempId, conversationId };

    const wsMessage = {
      type: 'chat_message',
      sender_id: userId,
      content: messageData.content,
      msg_type: messageData.msg_type,
      file_url: messageData.file_url,
      reply_to_id: messageData.reply_to_id,
      duration: messageData.duration,
      _tempId: tempId,
    };

    if (socket && isSocketConnected) {
      try {
        socket.send(JSON.stringify(wsMessage));
      } catch (err) {
        console.error('Failed to send via WebSocket:', err);
        queueMessage(conversationId, wsMessage);
        markMessageFailed(conversationId, tempId);
        toast.error('Message saved offline. Will send when connected.');
      }
    } else {
      queueMessage(conversationId, wsMessage);
      markMessageFailed(conversationId, tempId);
      toast.success('Message saved (Offline mode)');
    }
  }, [userId, conversationId, socket, isSocketConnected, addPendingMessage, queueMessage, markMessageFailed]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !userId) return;

    const messageData = {
      content: trimmed,
      msg_type: 'TEXT',
      file_url: null,
      reply_to_id: replyingTo?.id,
      duration: null,
    };

    sendMessage(messageData);
    setContent('');
    setIsTyping(false);
    sendTypingEvent(false);

    if (onCancelReply) onCancelReply();
    if (inputRef.current) inputRef.current.focus();
  }, [content, userId, sendMessage, replyingTo, onCancelReply, sendTypingEvent]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // File Handling
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    abortControllerRef.current = new AbortController();

    try {
      const fileName = `file_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { presigned_url, file_url } = await chatApi.getPresignedUrl(
        fileName,
        file.type,
        file.size
      );

      // Upload with progress
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.open('PUT', presigned_url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.onload = () => {
          if (xhr.status === 200) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      const messageData = {
        content: file.name,
        msg_type: 'FILE',
        file_url: file_url,
        reply_to_id: replyingTo?.id,
        duration: null,
      };

      await sendMessage(messageData);
      toast.success('File sent');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
      abortControllerRef.current = null;
      e.target.value = '';
    }
  }, [sendMessage, replyingTo]);

  // Voice Recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAndSendVoice(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_VOICE_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);

  const uploadAndSendVoice = useCallback(async (audioBlob) => {
    if (!userId) return;

    setIsUploading(true);
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const { presigned_url, file_url } = await chatApi.getPresignedUrl(
        fileName,
        'audio/webm',
        audioBlob.size
      );

      await fetch(presigned_url, {
        method: 'PUT',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' },
      });

      const messageData = {
        content: '',
        msg_type: 'VOICE',
        file_url,
        reply_to_id: replyingTo?.id,
        duration: recordingDuration,
      };

      await sendMessage(messageData);
      toast.success('Voice message sent');
    } catch (err) {
      console.error('Failed to upload voice message:', err);
      toast.error('Failed to send voice message.');
    } finally {
      setIsUploading(false);
    }
  }, [userId, recordingDuration, sendMessage, replyingTo]);

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const remaining = MAX_VOICE_DURATION - seconds;
    const remainingMins = Math.floor(remaining / 60);
    const remainingSecs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} / ${remainingMins}:${remainingSecs.toString().padStart(2, '0')}`;
  }, []);

  const isNearMaxDuration = recordingDuration >= MAX_VOICE_DURATION - 5;
  const canSend = content.trim() && !isUploading;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {uploadFileName || 'Uploading...'}
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 animate-in fade-in slide-in-from-top">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Replying to {replyingTo.senderName}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-1">{replyingTo.preview}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 p-1.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              Recording... {formatDuration(recordingDuration)}
            </span>
            {isNearMaxDuration && (
              <span className="text-xs font-bold text-red-500 animate-pulse flex items-center gap-1">
                <FiAlertCircle size={14} /> Almost at limit!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg transition-all duration-200 flex items-center gap-1"
            >
              <FiCheckCircle size={14} /> Send
            </button>
          </div>
        </div>
      ) : (
        /* Normal Input */
        <div className="flex items-end gap-2">
          {/* File Attachment */}
          <label className="flex-shrink-0 p-2.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200 cursor-pointer group">
            <FiPaperclip size={20} className="group-hover:scale-110 transition-transform" />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>

          {/* Voice Recording */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="flex-shrink-0 p-2.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200 active:scale-95 group"
            title="Hold to record voice message"
          >
            <FiMic size={20} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            disabled={isUploading}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`flex-shrink-0 p-2.5 text-white rounded-lg transition-all duration-200 active:scale-95 ${canSend
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              }`}
            title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
          >
            <FiSend size={20} />
          </button>
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      {!isRecording && (
        <p className="text-xs text-gray-400 dark:text-gray-500 px-2">
          {content.trim() ? '↵ to send · Shift+↵ for new line' : 'Press Shift+Enter for new line'}
        </p>
      )}

      <style>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-in {
          animation: slideInFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .slide-in-from-bottom-2 {
          animation: slideInFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .slide-in-from-top {
          animation: slideInFromTop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MessageInput;