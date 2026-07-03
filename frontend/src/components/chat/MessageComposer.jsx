// frontend/src/components/chat/MessageComposer.jsx
import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { FiSend, FiPaperclip, FiMic, FiStopCircle } from 'react-icons/fi';
import chatApi from '@/api/chatApi';
import toast from 'react-hot-toast';

const MessageComposer = ({ onSend, onTyping, disabled, rateLimit, replyingTo, conversationId, isBlocked }) => {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const textareaRef = useRef(null);
    const typingTimeout = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingBlob, setRecordingBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const recordingStartTimeRef = useRef(null);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    };
    useEffect(autoResize, [text]);

    const handleTyping = () => {
        if (isBlocked) return;
        onTyping?.(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => onTyping?.(false), 2000);
    };
    useEffect(() => () => clearTimeout(typingTimeout.current), []);

    const handleChange = e => {
        setText(e.target.value);
        handleTyping();
    };

    const handleKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey && !isBlocked) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiSelect = emoji => setText(p => p + (emoji.native || emoji));

    const handleSend = () => {
        if (disabled || isBlocked) return;
        const trimmed = text.trim();
        if (!trimmed && attachments.length === 0 && !recordingBlob) return;
        if (recordingBlob) { handleSendVoice(); return; }
        onSend(trimmed, attachments);
        setText('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleAttach = e => {
        if (isBlocked) { toast.error('You cannot send attachments to a blocked user.'); return; }
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const next = files.map(f => ({
            name: f.name,
            type: f.type.startsWith('image/') ? 'IMAGE' : 'FILE',
            file: f,
        }));
        setAttachments(p => [...p, ...next]);
        e.target.value = '';
    };

    const removeAttachment = idx => setAttachments(p => p.filter((_, i) => i !== idx));

    const startRecording = async () => {
        if (isBlocked) { toast.error('Cannot record voice to a blocked user.'); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordingBlob(blob);
                if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
                setIsRecording(false);
                if (recordingStartTimeRef.current) {
                    const duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
                    setRecordingDuration(duration);
                }
                if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
                if (blob.size > 0) handleSendVoice();
            };
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingStartTimeRef.current = Date.now();
            timerIntervalRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
            toast.success('Recording started...');
        } catch (err) {
            console.error('Microphone access denied:', err);
            toast.error('Microphone access required for voice messages');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    };

    const handleSendVoice = async () => {
        if (!recordingBlob) return;
        try {
            const file = new File([recordingBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
            const uploadResult = await chatApi.uploadFile(file);
            if (!uploadResult) { toast.error('Failed to upload voice message'); return; }
            const { file_url, file_name, file_size, file_mime_type } = uploadResult;
            onSend('', [{ file_url, file_name, file_size, file_mime_type, type: 'VOICE', duration: recordingDuration }], recordingDuration);
            setRecordingBlob(null);
            setRecordingDuration(0);
        } catch (err) {
            toast.error('Failed to send voice message');
            console.error(err);
        }
    };

    const remaining = rateLimit ? rateLimit.remaining : 60;
    const limit = rateLimit?.limit || 60;
    const fillPct = Math.max(0, Math.min(100, (remaining / limit) * 100));
    const isLow = remaining <= 10 && remaining > 0;
    const isExhausted = remaining === 0;
    const canSend = !disabled && !isBlocked && (text.trim().length > 0 || attachments.length > 0 || recordingBlob);

    return (
        <div className="mc-root">
            {/* Rate limit bar — top of composer, always visible */}
            <div className="mc-rate-bar-wrap">
                <div className="mc-rate-track">
                    <div
                        className={`mc-rate-fill ${isExhausted ? 'exhausted' : isLow ? 'low' : 'normal'}`}
                        style={{ width: `${fillPct}%` }}
                    />
                </div>
                <span className={`mc-rate-label ${isExhausted ? 'exhausted' : isLow ? 'low' : ''}`}>
                    {isExhausted ? '0 messages left today' : `${remaining}/${limit} today`}
                </span>
            </div>

            {/* Attachment previews */}
            {attachments.length > 0 && (
                <div className="mc-attachments">
                    {attachments.map((att, i) => (
                        <div key={i} className="mc-att-chip">
                            <span className="mc-att-icon">{att.type === 'IMAGE' ? '🖼' : '📄'}</span>
                            <span className="mc-att-name">{att.name}</span>
                            <button className="mc-att-remove" onClick={() => removeAttachment(i)} aria-label="Remove">✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Voice recording status */}
            {isRecording && (
                <div className="mc-voice-bar">
                    <span className="mc-voice-dot" />
                    <span className="mc-voice-timer">{recordingDuration}s — Recording…</span>
                    <button className="mc-voice-stop" onClick={stopRecording}>Stop</button>
                </div>
            )}

            {/* Main input row */}
            <div className="mc-row">
                {/* Left icon group */}
                <div className="mc-icon-group">
                    {/* Emoji */}
                    <button className="mc-icon-btn" aria-label="Emoji" type="button" disabled={isBlocked}>
                        <EmojiPicker onSelect={handleEmojiSelect} theme={localStorage.getItem('theme') || 'light'} />
                    </button>

                    {/* Attach */}
                    <label className="mc-icon-btn mc-attach-label" aria-label="Attach file">
                        <FiPaperclip size={17} />
                        <input type="file" multiple style={{ display: 'none' }} onChange={handleAttach} disabled={isBlocked} />
                    </label>

                    {/* Voice */}
                    <button
                        className={`mc-icon-btn${isRecording ? ' mc-recording' : ''}`}
                        aria-label="Voice message"
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={disabled || isBlocked}
                    >
                        {isRecording ? <FiStopCircle size={17} /> : <FiMic size={17} />}
                    </button>
                </div>

                {/* Text input */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isBlocked ? 'You have blocked this user' :
                            disabled ? 'Daily limit reached' :
                                'Type a message…'
                    }
                    disabled={disabled || isBlocked}
                    rows={1}
                    className="mc-input"
                    aria-label="Message input"
                />

                {/* Send button */}
                <button
                    className="mc-send-btn"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                >
                    <FiSend size={16} />
                </button>
            </div>

            <style>{`
                .mc-root {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    width: 100%;
                }

                /* ── Rate limit bar ── */
                .mc-rate-bar-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 4px 6px;
                }
                .mc-rate-track {
                    flex: 1;
                    height: 3px;
                    background: var(--chat-border, #e0e4f0);
                    border-radius: 10px;
                    overflow: hidden;
                }
                .mc-rate-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.4s ease, background 0.4s ease;
                }
                .mc-rate-fill.normal   { background: var(--chat-accent, #6c63ff); }
                .mc-rate-fill.low      { background: #f59e0b; }
                .mc-rate-fill.exhausted { background: #ef4444; width: 100% !important; }
                .mc-rate-label {
                    font-size: 10.5px;
                    font-weight: 600;
                    color: var(--chat-text3, #9aa3bf);
                    white-space: nowrap;
                    min-width: 72px;
                    text-align: right;
                }
                .mc-rate-label.low      { color: #f59e0b; }
                .mc-rate-label.exhausted { color: #ef4444; }

                /* ── Attachments ── */
                .mc-attachments {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    padding: 0 0 6px;
                }
                .mc-att-chip {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: var(--chat-surface2, #f8f9fd);
                    border: 1px solid var(--chat-border, #e0e4f0);
                    border-radius: 20px;
                    padding: 4px 10px 4px 8px;
                    font-size: 12px;
                    color: var(--chat-text2, #5a647e);
                    max-width: 200px;
                }
                .mc-att-icon { flex-shrink: 0; }
                .mc-att-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                }
                .mc-att-remove {
                    background: none; border: none;
                    color: var(--chat-text3, #9aa3bf);
                    cursor: pointer; padding: 0 2px; font-size: 13px;
                    line-height: 1; flex-shrink: 0;
                    transition: color 0.15s;
                }
                .mc-att-remove:hover { color: var(--chat-danger, #e0284a); }

                /* ── Voice status bar ── */
                .mc-voice-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 10px;
                    background: rgba(239,68,68,0.08);
                    border-radius: 10px;
                    margin-bottom: 6px;
                }
                .mc-voice-dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: #ef4444;
                    animation: mc-pulse 1s infinite;
                    flex-shrink: 0;
                }
                @keyframes mc-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
                .mc-voice-timer {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: var(--chat-text, #0f1421);
                    flex: 1;
                }
                .mc-voice-stop {
                    padding: 3px 12px;
                    border: none;
                    background: rgba(239,68,68,0.15);
                    color: #ef4444;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .mc-voice-stop:hover { background: rgba(239,68,68,0.25); }

                /* ── Main row ── */
                .mc-row {
                    display: flex;
                    align-items: flex-end;
                    gap: 6px;
                    width: 100%;
                }

                /* ── Icon group ── */
                .mc-icon-group {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    flex-shrink: 0;
                    padding-bottom: 2px;
                }

                .mc-icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: var(--chat-text2, #5a647e);
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: background 0.15s, color 0.15s;
                    padding: 0;
                }
                .mc-icon-btn:hover:not(:disabled) {
                    background: var(--chat-accent-soft, rgba(108,99,255,0.09));
                    color: var(--chat-accent, #6c63ff);
                }
                .mc-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .mc-icon-btn.mc-recording { color: #ef4444; }
                .mc-icon-btn.mc-recording:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

                .mc-attach-label {
                    cursor: pointer;
                }

                /* ── Text input ── */
                .mc-input {
                    flex: 1;
                    min-width: 0;
                    resize: none;
                    background: var(--chat-surface, #ffffff);
                    border: 1.5px solid var(--chat-border, #e0e4f0);
                    border-radius: 20px;
                    padding: 9px 14px;
                    font-size: 14px;
                    color: var(--chat-text, #0f1421);
                    outline: none;
                    line-height: 1.5;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    overflow-y: hidden;
                    max-height: 120px;
                    box-sizing: border-box;
                }
                .mc-input:focus {
                    border-color: var(--chat-accent, #6c63ff);
                    box-shadow: 0 0 0 3px var(--chat-accent-soft, rgba(108,99,255,0.09));
                }
                .mc-input::placeholder { color: var(--chat-text3, #9aa3bf); }
                .mc-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: var(--chat-surface2, #f8f9fd);
                }

                /* ── Send button ── */
                .mc-send-btn {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--chat-accent, #6c63ff), var(--chat-accent2, #9f7aea));
                    color: #fff;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s, transform 0.15s, box-shadow 0.15s;
                    box-shadow: 0 4px 14px var(--chat-accent-glow, rgba(108,99,255,0.3));
                    margin-bottom: 0;
                }
                .mc-send-btn:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: scale(1.07) translateY(-1px);
                    box-shadow: 0 6px 20px var(--chat-accent-glow, rgba(108,99,255,0.4));
                }
                .mc-send-btn:active:not(:disabled) { transform: scale(0.93); }
                .mc-send-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
            `}</style>
        </div>
    );
};

export default React.memo(MessageComposer);