// frontend/src/components/chat/MessageComposer.jsx
import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { FiSend, FiPaperclip } from 'react-icons/fi';

const MessageComposer = ({ onSend, onTyping, disabled, rateLimit, replyingTo, conversationId }) => {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auto-resize textarea
    const autoResize = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 150) + 'px';
        }
    };

    useEffect(() => {
        autoResize();
    }, [text]);

    // Typing indicator
    const handleTyping = (val) => {
        onTyping?.(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => onTyping?.(false), 2000);
    };

    const handleChange = (e) => {
        setText(e.target.value);
        handleTyping();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiSelect = (emoji) => {
        setText((prev) => prev + emoji.native);
    };

    const handleSend = () => {
        if (disabled) return;
        const trimmed = text.trim();
        if (!trimmed && attachments.length === 0) return;
        onSend(trimmed, attachments);
        setText('');
        setAttachments([]);
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleAttach = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        // In a real app you would upload the file and get a URL, then add to attachments.
        // For now we just show a file name and assume the parent handles upload.
        const newAttachments = files.map((f) => ({
            name: f.name,
            type: f.type.startsWith('image/') ? 'IMAGE' : 'FILE',
            file: f, // temporary; upload should be handled separately
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
        e.target.value = ''; // reset
    };

    const remaining = rateLimit ? rateLimit.remaining : 60;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex flex-col">
            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs flex items-center gap-1">
                            {att.type === 'IMAGE' ? '🖼️' : '📄'} {att.name}
                            <button
                                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-gray-500 hover:text-red-500 ml-1"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2">
                {/* Emoji picker */}
                <EmojiPicker onSelect={handleEmojiSelect} theme={localStorage.getItem('theme') || 'light'} />

                {/* File attach */}
                <label className="cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <FiPaperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <input type="file" multiple className="hidden" onChange={handleAttach} />
                </label>

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={disabled ? 'Message limit reached' : 'Type a message…'}
                        disabled={disabled}
                        rows={1}
                        className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={disabled || (!text.trim() && attachments.length === 0)}
                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FiSend className="w-5 h-5" />
                </button>
            </div>

            {/* Rate limit counter */}
            <div className="text-right mt-1 text-xs text-gray-500 dark:text-gray-400">
                {remaining} / {rateLimit?.limit || 60} messages remaining today
            </div>
        </div>
    );
};

export default React.memo(MessageComposer);