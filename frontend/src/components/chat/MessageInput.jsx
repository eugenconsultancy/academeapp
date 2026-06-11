// C:\Users\GATARA-BJTU\academe\frontend\src\components\chat\MessageInput.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { FiSmile, FiPaperclip, FiMic, FiSend, FiX, FiSquare } from 'react-icons/fi';
import { chatApi } from '../../api/chatApi';
import { useChatStore } from '../../stores/useChatStore';
import toast from 'react-hot-toast';

const ALLOWED_MIME = {
  'image/*': [],
  'application/pdf': [],
  'application/msword': [],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
};

const MAX_CHARS = 2000;

/* ─── Modern Input Styles ─── */
const INPUT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

  :root {
    /* Light Mode */
    --input-bg-light: #ffffff;
    --input-surface-light: #f8f9fa;
    --input-border-light: rgba(0,0,0,0.08);
    --input-text-light: #1a1d23;
    --input-muted-light: #6b7280;
    
    /* Dark Mode */
    --input-bg-dark: #0f1419;
    --input-surface-dark: #1a2332;
    --input-border-dark: rgba(255,255,255,0.08);
    --input-text-dark: #e5e7eb;
    --input-muted-dark: #9ca3af;
    
    /* Status colors */
    --input-accent: #3b82f6;
    --input-accent-glow: rgba(59, 130, 246, 0.15);
    
    /* Defaults to dark */
    --input-bg: var(--input-bg-dark);
    --input-surface: var(--input-surface-dark);
    --input-border: var(--input-border-dark);
    --input-text: var(--input-text-dark);
    --input-muted: var(--input-muted-dark);
  }

  html.light-mode {
    --input-bg: var(--input-bg-light);
    --input-surface: var(--input-surface-light);
    --input-border: var(--input-border-light);
    --input-text: var(--input-text-light);
    --input-muted: var(--input-muted-light);
  }

  * {
    box-sizing: border-box;
  }

  .mi-root {
    position: relative;
    border-top: 1px solid var(--input-border);
    background: var(--input-surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    padding: 10px 16px 12px;
    font-family: 'Geist', system-ui, sans-serif;
    transition: all 0.2s ease;
    z-index: 10;
    flex-shrink: 0;
  }

  .mi-root.drag-active {
    background: rgba(59, 130, 246, 0.05);
    border-top-color: var(--input-accent);
    box-shadow: inset 0 0 0 1px var(--input-accent-glow);
  }

  .mi-input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  /* ─── Icon Buttons ─── */
  .mi-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    border: 1.5px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    position: relative;
  }

  .mi-btn:hover:not(:disabled) {
    background: var(--input-accent);
    border-color: var(--input-accent);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--input-accent-glow);
  }

  .mi-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.95);
  }

  .mi-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ─── Textarea ─── */
  .mi-textarea-wrap {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  .mi-textarea {
    width: 100%;
    min-height: 38px;
    max-height: 120px;
    resize: none;
    border-radius: 12px;
    border: 1.5px solid var(--input-border);
    background: var(--input-bg);
    padding: 9px 14px;
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--input-text);
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .mi-textarea::placeholder {
    color: var(--input-muted);
  }

  .mi-textarea:focus {
    border-color: var(--input-accent);
    box-shadow: 0 0 0 3px var(--input-accent-glow);
    background: var(--input-bg);
  }

  /* ─── Character Count ─── */
  .mi-char-count {
    position: absolute;
    bottom: -18px;
    right: 4px;
    font-size: 10px;
    color: var(--input-muted);
    font-family: 'Geist Mono', monospace;
    transition: color 0.2s ease;
    pointer-events: none;
  }

  .mi-char-count.warning {
    color: #f59e0b;
  }

  .mi-char-count.danger {
    color: #ef4444;
  }

  /* ─── Send Button ─── */
  .mi-send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, var(--input-accent), #6366f1);
    color: #ffffff;
    cursor: pointer;
    flex-shrink: 0;
    font-weight: 600;
    box-shadow: 0 4px 12px var(--input-accent-glow);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .mi-send-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .mi-send-btn:hover::after {
    opacity: 1;
  }

  .mi-send-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  .mi-send-btn:active {
    transform: translateY(0) scale(0.94);
  }

  /* ─── Mic Button ─── */
  .mi-mic-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    border: 1.5px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .mi-mic-btn:hover:not(.recording) {
    background: var(--input-accent);
    border-color: var(--input-accent);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--input-accent-glow);
  }

  .mi-mic-btn.recording {
    background: rgba(239, 68, 68, 0.12);
    border-color: #ef4444;
    color: #ef4444;
    animation: pulse-mic 1.5s ease-in-out infinite;
  }

  @keyframes pulse-mic {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
  }

  /* ─── FIXED: Emoji Picker - position: fixed to escape parent overflow ─── */
  .mi-emoji-wrapper {
    /* NO position: relative — allows fixed child to reference viewport */
  }

  .mi-emoji-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    animation: fadeInBackdrop 0.15s ease;
  }

  @keyframes fadeInBackdrop {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mi-emoji-container {
    position: fixed;
    bottom: 80px;
    left: 12px;
    z-index: 9999;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1);
    animation: slideUpEmoji 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: calc(100vw - 24px);
    max-height: 420px;
  }

  @keyframes slideUpEmoji {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ─── Recording Bar ─── */
  .mi-recording-bar {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    padding: 10px 12px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 12px;
    font-size: 12px;
    color: #ef4444;
    font-family: 'Geist Mono', monospace;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mi-recording-dot {
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: blink 1s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes blink {
    0%, 49%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .mi-recording-time {
    flex: 1;
    font-weight: 600;
  }

  .mi-recording-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mi-recording-cancel {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mi-recording-cancel:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  /* ─── Upload Status ─── */
  .mi-upload-status {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--input-accent-glow);
    border-radius: 10px;
    font-size: 12px;
    color: var(--input-accent);
    font-family: 'Geist Mono', monospace;
  }

  .mi-upload-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(59, 130, 246, 0.2);
    border-top-color: var(--input-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* ─── Drag Overlay ─── */
  .mi-drag-overlay {
    position: absolute;
    inset: 0;
    background: rgba(59, 130, 246, 0.06);
    border: 2px dashed var(--input-accent);
    border-radius: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--input-accent);
    z-index: 20;
    pointer-events: none;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .mi-root {
      padding: 8px 10px 10px;
    }

    .mi-btn, .mi-send-btn, .mi-mic-btn {
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    .mi-textarea {
      font-size: 13px;
      min-height: 34px;
      padding: 8px 12px;
      border-radius: 10px;
    }

    .mi-input-row {
      gap: 4px;
    }

    .mi-emoji-container {
      bottom: 70px;
      left: 6px;
      max-width: calc(100vw - 12px);
      max-height: 350px;
    }

    .mi-recording-bar {
      font-size: 11px;
      padding: 8px 10px;
    }
  }

  @media (max-width: 380px) {
    .mi-btn, .mi-send-btn, .mi-mic-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
    }

    .mi-textarea {
      font-size: 12px;
      min-height: 30px;
      padding: 7px 10px;
    }

    .mi-emoji-container {
      bottom: 64px;
      max-height: 300px;
    }
  }
`;

export default function MessageInput({ conversationId }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const addMessage = useChatStore(s => s.addMessage);
  const updateMessageStatus = useChatStore(s => s.updateMessageStatus);
  const user = useChatStore(s => s.user);

  // ── Auto-resize textarea ──
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  // Send message
  const sendMessage = async (msgType, content = '', fileUrl = '') => {
    if (!conversationId || !user) return;

    const tempId = Math.random().toString(36).substr(2, 9);
    addMessage(conversationId, {
      _tempId: tempId,
      sender_id: user.id,
      content,
      file_url: fileUrl,
      msg_type: msgType,
      timestamp: new Date().toISOString(),
      _pending: true,
    });

    try {
      const response = await chatApi.sendMessage(conversationId, {
        content,
        file_url: fileUrl,
        msg_type: msgType,
      });
      updateMessageStatus(conversationId, tempId, {
        ...response.data,
        _pending: false,
      });
    } catch (err) {
      console.error('Send error:', err);
      updateMessageStatus(conversationId, tempId, { _failed: true });
      toast.error('Message failed to send');
    }
  };

  // Handle send text
  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      sendMessage('TEXT', trimmed);
      setText('');
      setShowEmoji(false);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      inputRef.current?.focus();
    }
  };

  // Handle emoji
  const handleEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  // Handle dropzone
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    accept: ALLOWED_MIME,
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        if (file.type.startsWith('video/')) {
          toast.error('Video files are not supported');
          continue;
        }

        setUploading(true);
        try {
          const { data } = await chatApi.getPresignedUrl(file.name, file.type);
          await fetch(data.presigned_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          sendMessage('FILE', '', data.file_url);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('File upload failed');
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }
    },
  });

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        setRecording(false);
        clearInterval(recordingTimerRef.current);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunks, { type: 'audio/webm' });

        try {
          const { data } = await chatApi.getPresignedUrl('voice.webm', 'audio/webm');
          await fetch(data.presigned_url, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'audio/webm' },
          });
          sendMessage('VOICE', '', data.file_url);
        } catch (err) {
          console.error('Voice upload error:', err);
          toast.error('Voice upload failed');
        }
      };

      recorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Microphone not accessible');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Close emoji on Escape
    if (e.key === 'Escape' && showEmoji) {
      setShowEmoji(false);
    }
  };

  // Close emoji picker on window resize (orientation change)
  useEffect(() => {
    const handleResize = () => {
      if (showEmoji && window.innerWidth < 640) {
        // Keep open but let it reposition
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showEmoji]);

  const charCount = text.length;
  const charCountClass = charCount > MAX_CHARS * 0.9 ? 'danger' : charCount > MAX_CHARS * 0.7 ? 'warning' : '';

  return (
    <>
      <style>{INPUT_STYLE}</style>
      <div {...getRootProps()} className={`mi-root${isDragActive ? ' drag-active' : ''}`}>
        <input {...getInputProps()} />

        {/* Drag Overlay */}
        {isDragActive && (
          <div className="mi-drag-overlay">
            <FiPaperclip size={18} />
            Drop files to upload
          </div>
        )}

        {/* Main Input Row */}
        <div className="mi-input-row">
          {/* Emoji Picker */}
          <div className="mi-emoji-wrapper">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="mi-btn"
              title="Add emoji"
              type="button"
              aria-label="Open emoji picker"
            >
              <FiSmile size={18} />
            </button>
            {showEmoji && (
              <>
                <div
                  className="mi-emoji-backdrop"
                  onClick={() => setShowEmoji(false)}
                  aria-hidden="true"
                />
                <div className="mi-emoji-container">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    emojiStyle={EmojiStyle.NATIVE}
                    width={320}
                    height={400}
                    lazyLoadEmojis={true}
                    searchPlaceholder="Search emoji..."
                  />
                </div>
              </>
            )}
          </div>

          {/* File Upload */}
          <button
            onClick={open}
            disabled={uploading}
            className="mi-btn"
            title="Attach file"
            type="button"
            aria-label="Attach file"
          >
            <FiPaperclip size={18} />
          </button>

          {/* Text Input */}
          <div className="mi-textarea-wrap">
            <textarea
              ref={(el) => {
                inputRef.current = el;
                textareaRef.current = el;
              }}
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setText(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Shift + Enter for new line)"
              className="mi-textarea"
              rows={1}
              aria-label="Message input"
              maxLength={MAX_CHARS}
            />
            {charCount > MAX_CHARS * 0.6 && (
              <span className={`mi-char-count ${charCountClass}`}>
                {charCount}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send or Record */}
          {text.trim() ? (
            <button
              onClick={handleSend}
              className="mi-send-btn"
              title="Send message (Enter)"
              type="button"
              aria-label="Send message"
            >
              <FiSend size={16} />
            </button>
          ) : (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`mi-mic-btn${recording ? ' recording' : ''}`}
              title={recording ? 'Stop recording' : 'Record voice message'}
              type="button"
              aria-label={recording ? 'Stop recording' : 'Start voice recording'}
            >
              {recording ? <FiSquare size={16} /> : <FiMic size={16} />}
            </button>
          )}
        </div>

        {/* Recording Status */}
        {recording && (
          <div className="mi-recording-bar">
            <div className="mi-recording-dot" />
            <span className="mi-recording-time">
              Recording… {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
            </span>
            <div className="mi-recording-actions">
              <button
                onClick={stopRecording}
                className="mi-recording-cancel"
                title="Stop recording"
                type="button"
                aria-label="Stop recording"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploading && (
          <div className="mi-upload-status">
            <div className="mi-upload-spinner" />
            <span>Uploading file…</span>
          </div>
        )}
      </div>
    </>
  );
}