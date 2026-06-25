// frontend/src/components/chat/MessageComposer.jsx
//
// Fixes:
//  • Inline style block added to ensure the composer row is a horizontal flex container
//  • Input box now stretches to fill available space (flex: 1)
//  • Elements are vertically centred and well aligned
//  • Pill‑shaped input uses cd‑composer‑input class, no duplicate border‑radius
//  • Send button: cd‑send‑btn, gradient, scale on active, disabled state
//  • Attachment chips: cd‑attachment‑preview / cd‑attachment‑chip, dismissable
//  • Rate limit counter with low‑remaining warning
//  • Auto‑resize still intact
//
import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { FiSend, FiPaperclip, FiMic } from 'react-icons/fi';

const MessageComposer = ({ onSend, onTyping, disabled, rateLimit, replyingTo, conversationId }) => {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const textareaRef = useRef(null);
    const typingTimeout = useRef(null);

    // ── Auto‑resize ──
    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 152) + 'px';
    };
    useEffect(autoResize, [text]);

    // ── Typing indicator ──
    const handleTyping = () => {
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiSelect = emoji => setText(p => p + (emoji.native || emoji));

    const handleSend = () => {
        if (disabled) return;
        const trimmed = text.trim();
        if (!trimmed && attachments.length === 0) return;
        onSend(trimmed, attachments);
        setText('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleAttach = e => {
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

    const remaining = rateLimit ? rateLimit.remaining : 60;
    const limit = rateLimit?.limit || 60;
    const fillPct = Math.max(0, Math.min(100, (remaining / limit) * 100));
    const isLow = remaining <= 5 && remaining > 0;
    const canSend = !disabled && (text.trim().length > 0 || attachments.length > 0);

    return (
        <div className="cd-composer">
            {/* ── Inline style to make the row a full‑width flex container ── */}
            <style>{`
                .cd-composer-row {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    gap: 8px;
                }
            `}</style>

            {/* ── Attachment preview chips ── */}
            {attachments.length > 0 && (
                <div className="cd-attachment-preview">
                    {attachments.map((att, i) => (
                        <div key={i} className="cd-attachment-chip">
                            <span className="cd-attachment-icon">
                                {att.type === 'IMAGE' ? '🖼' : '📄'}
                            </span>
                            <span className="cd-attachment-name">{att.name}</span>
                            <button
                                className="cd-attachment-remove"
                                onClick={() => removeAttachment(i)}
                                aria-label="Remove attachment"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Main row: emoji · attach · input · send ── */}
            <div className="cd-composer-row">
                {/* Emoji picker */}
                <button className="cd-composer-icon-btn" aria-label="Emoji picker" type="button">
                    <EmojiPicker onSelect={handleEmojiSelect} theme={localStorage.getItem('theme') || 'light'} />
                </button>

                {/* File attach */}
                <button className="cd-composer-icon-btn" aria-label="Attach file" type="button">
                    <label className="cd-composer-file-label">
                        <FiPaperclip size={18} />
                        <input type="file" multiple style={{ display: 'none' }} onChange={handleAttach} />
                    </label>
                </button>

                {/* Pill‑shaped textarea (now expands because of flex:1 from CSS) */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? 'Message limit reached' : 'Type a message…'}
                    disabled={disabled}
                    rows={1}
                    className="cd-composer-input"
                />

                {/* Send button */}
                <button
                    className="cd-send-btn"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                >
                    <FiSend size={17} />
                </button>
            </div>

            {/* ── Rate limit bar (with low‑limit warning) ── */}
            <div className="cd-rate-notice">
                <div className="cd-rate-info">
                    {isLow && (
                        <span className="cd-rate-warning">Only {remaining} left today</span>
                    )}
                    {!isLow && remaining > 0 && (
                        <span className="cd-rate-text">{remaining}/{limit} today</span>
                    )}
                    {remaining === 0 && (
                        <span className="cd-rate-text rate-exhausted">Daily limit reached</span>
                    )}
                </div>
                <div className="cd-rate-bar">
                    <div
                        className="cd-rate-fill"
                        style={{ width: `${fillPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(MessageComposer);