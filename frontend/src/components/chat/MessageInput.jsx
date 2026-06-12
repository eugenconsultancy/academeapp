// src/components/chat/MessageInput.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import useChatStore from '../../stores/useChatStore';
import chatApi from '../../api/chatApi';               // ✅ ADDED import
import toast from 'react-hot-toast';                    // ✅ ADDED import

const MessageInput = ({ conversationId, replyingTo, onCancelReply }) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // ✅ Get both socket and userId from store
  const socket = useChatStore((state) => state.socket);
  const isSocketConnected = useChatStore((state) => state.isSocketConnected);
  const userId = useChatStore((state) => state.userId);

  const typingTimeoutRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Typing Indicator Logic ───
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

  const handleInputChange = (e) => {
    setContent(e.target.value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);

    if (!isTyping) {
      setIsTyping(true);
      sendTypingEvent(true);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingEvent(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // ─── Send Message ───
  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || !userId) return;       // ✅ Guard against missing userId

    const messageData = {
      type: 'chat_message',
      sender_id: userId,                    // ✅ Uses store userId instead of socket.userId
      content: trimmed,
      msg_type: 'TEXT',
    };

    if (replyingTo) {
      messageData.reply_to_id = replyingTo.id;
    }

    if (socket && isSocketConnected) {
      socket.send(JSON.stringify(messageData));
    }

    setContent('');
    setIsTyping(false);
    sendTypingEvent(false);

    if (onCancelReply) onCancelReply();
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Voice Recording ───
  const startRecording = async () => {
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
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const uploadAndSendVoice = async (audioBlob) => {
    if (!userId) return;                    // ✅ Guard

    try {
      const fileName = `voice_${Date.now()}.webm`;
      const { presigned_url, file_url } = await chatApi.getPresignedUrl(
        fileName,
        'audio/webm'
      );

      await fetch(presigned_url, {
        method: 'PUT',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' },
      });

      const messageData = {
        type: 'chat_message',
        sender_id: userId,                   // ✅ Uses store userId
        content: '',
        msg_type: 'VOICE',
        file_url,
        duration: recordingDuration,
      };

      if (socket && isSocketConnected) {
        socket.send(JSON.stringify(messageData));
      }
    } catch (err) {
      console.error('Failed to upload voice message:', err);
      toast.error('Failed to send voice message.');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Render ───
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Replying to {replyingTo.senderName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {replyingTo.preview}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">
            Recording... {formatDuration(recordingDuration)}
          </span>
          <div className="flex-1" />
          <button
            onClick={cancelRecording}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={stopRecording}
            className="px-4 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      ) : (
        /* Normal Input */
        <div className="flex items-end gap-2">
          {/* Microphone Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Hold to record voice message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-600 transition-colors"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="flex-shrink-0 p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageInput;