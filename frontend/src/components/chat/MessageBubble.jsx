// frontend/src/components/chat/MessageBubble.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import useChatStore from '@/stores/useChatStore';
import useUserStore from '@/stores/useUserStore';
import chatApi from '@/api/chatApi';

const MessageBubble = ({ message, conversationId, currentUserId, onAction, onHeightChange }) => {
    const {
        updateMessageStatus,
        deleteMessageLocally,
        markMessageEdited,
        activeConversationId,
    } = useChatStore();
    const user = useUserStore((s) => s.user);
    const uid = currentUserId || user?.id;
    const convId = conversationId || activeConversationId;

    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(message.content);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);
    const longPressTimer = useRef(null);
    const bubbleRef = useRef(null);

    const isOwn = message.sender_id === uid;
    const deletedEveryone = message.deleted_for_everyone;
    const deletedSelf = message.deleted_for_self && isOwn;

    // ── Report height changes to parent (for virtualized list) ────────────
    useEffect(() => {
        if (bubbleRef.current && onHeightChange) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    onHeightChange(entry.contentRect.height);
                }
            });
            resizeObserver.observe(bubbleRef.current);
            // Initial measurement
            onHeightChange(bubbleRef.current.offsetHeight);
            return () => resizeObserver.disconnect();
        }
    }, [onHeightChange]);

    // ── Ticks ─────────────────────────────────────────────────────────────
    const tickIcon = () => {
        if (message.status === 'pending') return '🕒';
        if (message.status === 'sent') return '✓';
        if (message.status === 'delivered') return '✓✓';
        if (message.status === 'read') return '✓✓🔵';
        return '';
    };

    // ── Edit handlers ─────────────────────────────────────────────────────
    const handleEditSubmit = async () => {
        if (!editText.trim()) return;
        try {
            const res = await chatApi.editMessage(message.id, editText);
            markMessageEdited(convId, message.id, res.data.content, res.data.edited_at);
            setEditing(false);
        } catch (err) {
            alert('Edit failed');
        }
    };

    // ── Menu management ───────────────────────────────────────────────────
    const openMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const x = e.clientX || e.touches?.[0]?.clientX || 0;
        const y = e.clientY || e.touches?.[0]?.clientY || 0;
        setMenuPosition({ x, y });
        setMenuVisible(true);
    };

    const closeMenu = () => setMenuVisible(false);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                closeMenu();
            }
        };
        if (menuVisible) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuVisible]);

    // Long‑press for touch
    const handleTouchStart = (e) => {
        longPressTimer.current = setTimeout(() => openMenu(e), 500);
    };
    const handleTouchEnd = () => clearTimeout(longPressTimer.current);
    const handleTouchMove = () => clearTimeout(longPressTimer.current);

    // ── Actions dispatched to parent via onAction ─────────────────────────
    const triggerAction = (type) => {
        onAction?.(type, message);
        closeMenu();
    };

    // ── Reply preview ─────────────────────────────────────────────────────
    const renderReplyPreview = () => {
        if (!message.reply_to_id) return null;
        const preview = message.reply_preview || 'Message';
        return (
            <div className="text-xs bg-gray-100 rounded p-2 mb-1 italic">
                Replying to: {preview}
            </div>
        );
    };

    // ── Attachment rendering ──────────────────────────────────────────────
    const renderAttachment = () => {
        if (!message.file_url) return null;
        if (message.msg_type === 'IMAGE') {
            return (
                <img
                    src={message.thumbnail_url || message.file_url}
                    alt="attachment"
                    className="max-w-48 rounded mt-2 cursor-pointer"
                    onClick={() => window.open(message.file_url, '_blank')}
                />
            );
        }
        if (message.msg_type === 'VOICE') {
            return <audio controls src={message.file_url} className="mt-2 max-w-full" />;
        }
        if (message.msg_type === 'FILE') {
            return (
                <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-blue-600 underline"
                >
                    {message.file_name || 'Attachment'}
                </a>
            );
        }
        return null;
    };

    // ── Deleted states ────────────────────────────────────────────────────
    if (deletedEveryone) {
        return (
            <div className="flex justify-center my-2">
                <span className="text-xs text-gray-500 italic">This message was deleted</span>
            </div>
        );
    }

    if (deletedSelf) {
        return null;
    }

    return (
        <>
            <div
                ref={bubbleRef}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-2 px-4 group relative`}
                onContextMenu={openMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                <div className={`max-w-[75%] p-3 rounded-lg relative ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                    {editing ? (
                        <div>
                            <input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-white text-black w-full px-2 py-1 rounded"
                                autoFocus
                            />
                            <div className="flex justify-end mt-2 space-x-2">
                                <button
                                    onClick={handleEditSubmit}
                                    className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="text-xs bg-gray-400 text-white px-2 py-1 rounded"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {renderReplyPreview()}
                            {message.is_forwarded && (
                                <div className="text-xs text-gray-500 mb-1">Forwarded</div>
                            )}
                            <p>{message.content}</p>
                            {renderAttachment()}
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                                <div className="flex items-center space-x-1">
                                    {message.is_edited && <span className="text-xs opacity-70">edited</span>}
                                    {isOwn && <span className="text-xs">{tickIcon()}</span>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Context menu */}
            {menuVisible && (
                <div
                    ref={menuRef}
                    className="fixed bg-white dark:bg-gray-800 shadow-lg rounded border dark:border-gray-700 p-1 z-50 min-w-[120px]"
                    style={{ top: menuPosition.y, left: menuPosition.x }}
                >
                    {isOwn && !deletedEveryone && (
                        <button
                            onClick={() => { setEditing(true); closeMenu(); }}
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => triggerAction('forward')}
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        Forward
                    </button>
                    <button
                        onClick={() => triggerAction('delete')}
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => triggerAction('report')}
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                    >
                        Report
                    </button>
                    <button
                        onClick={() => triggerAction('reply')}
                        className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        Reply
                    </button>
                </div>
            )}
        </>
    );
};

export default React.memo(MessageBubble);