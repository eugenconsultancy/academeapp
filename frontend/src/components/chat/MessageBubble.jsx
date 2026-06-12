// src/components/chat/MessageBubble.jsx
import React, { useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import useChatStore from '../../stores/useChatStore';
import toast from 'react-hot-toast';

const MessageBubble = ({
    message,
    isOwn,
    senderName,
    senderAvatar,
    onReply,
    onEdit,
    onDelete,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || '');
    const [isDeleting, setIsDeleting] = useState(false);
    const audioRef = useRef(null);
    const editInputRef = useRef(null);

    const retryMessage = useChatStore(state => state.retryMessage);
    const userId = useChatStore(state => state.userId);

    const formattedTime = message.created_at
        ? format(new Date(message.created_at), 'h:mm a')
        : message.timestamp
            ? format(new Date(message.timestamp), 'h:mm a')
            : '';

    // Check if message is within edit window (5 minutes)
    const canEdit = useCallback(() => {
        if (!isOwn) return false;
        const messageTime = new Date(message.created_at || message.timestamp);
        const now = new Date();
        const diffMinutes = (now - messageTime) / (1000 * 60);
        return diffMinutes <= 5 && !message._deleted;
    }, [isOwn, message.created_at, message.timestamp, message._deleted]);

    // Scroll to replied message
    const handleReplyClick = () => {
        if (message.reply_to_id) {
            const el = document.getElementById(`msg-${message.reply_to_id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-message');
                setTimeout(() => el.classList.remove('highlight-message'), 2000);
            }
        }
    };

    // Edit message
    const handleEditSubmit = async () => {
        if (!editContent.trim() || editContent === message.content) {
            setIsEditing(false);
            return;
        }

        if (onEdit) {
            const success = await onEdit(message.id, editContent.trim());
            if (success) {
                setIsEditing(false);
                toast.success('Message edited');
            } else {
                toast.error('Failed to edit message');
            }
        }
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEditSubmit();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditContent(message.content || '');
        }
    };

    // Delete message
    const handleDelete = async (deleteForEveryone = true) => {
        if (isDeleting) return;
        setIsDeleting(true);

        if (onDelete) {
            const success = await onDelete(message.id, deleteForEveryone);
            if (success) {
                toast.success(deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted for you');
            } else {
                toast.error('Failed to delete message');
            }
        }
        setIsDeleting(false);
    };

    // Retry failed message
    const handleRetry = async () => {
        if (message._tempId) {
            const success = await retryMessage(message.conversation_id, message._tempId);
            if (!success) {
                toast.error('Failed to retry. Please try again.');
            }
        }
    };

    // Voice message playback
    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Status indicators (fixed logic)
    const renderStatus = () => {
        if (!isOwn) return null;

        if (message._deleted) {
            return <span className="text-gray-400 text-xs ml-1" title="Deleted">🗑️</span>;
        }

        if (message._failed) {
            return (
                <button
                    onClick={handleRetry}
                    className="text-red-500 hover:text-red-600 ml-1 transition-colors"
                    title="Failed to send. Click to retry."
                >
                    ⟳
                </button>
            );
        }

        if (message._pending) {
            return (
                <span className="inline-block ml-1">
                    <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </span>
            );
        }

        // Delivered vs Read status
        if (message.is_read) {
            return (
                <span className="text-blue-500 text-xs ml-1" title="Read">
                    ✓✓
                </span>
            );
        }

        // Delivered (assuming server sets is_delivered flag)
        if (message.is_delivered) {
            return (
                <span className="text-gray-500 text-xs ml-1" title="Delivered">
                    ✓✓
                </span>
            );
        }

        return (
            <span className="text-gray-400 text-xs ml-1" title="Sent">
                ✓
            </span>
        );
    };

    // Don't render deleted messages (just a placeholder)
    if (message._deleted && !isOwn) {
        return (
            <div className="flex gap-3 mb-4 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="max-w-[70%]">
                    <p className="text-xs text-gray-400 italic">This message was deleted</p>
                </div>
            </div>
        );
    }

    return (
        <div
            id={`msg-${message.id || message._tempId}`}
            className={`flex gap-3 mb-4 transition-all duration-300 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className="flex-shrink-0">
                <img
                    src={senderAvatar || '/default-avatar.png'}
                    alt={senderName || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                />
            </div>

            {/* Bubble Content */}
            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender Name */}
                {!isOwn && senderName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
                        {senderName}
                    </p>
                )}

                <div
                    className={`group relative rounded-2xl px-4 py-2 ${isOwn
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        } ${message._deleted ? 'opacity-50' : ''}`}
                >
                    {/* Reply Preview */}
                    {message.reply_preview && (
                        <div
                            onClick={handleReplyClick}
                            className={`mb-1 p-2 rounded-lg cursor-pointer text-xs ${isOwn
                                ? 'bg-indigo-700 text-indigo-100'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <p className="font-medium truncate">Reply to {message.reply_to_sender_name || 'message'}</p>
                            <p className="truncate">{message.reply_preview}</p>
                        </div>
                    )}

                    {/* Edit mode */}
                    {isEditing && !message._deleted ? (
                        <div className="flex flex-col gap-2">
                            <textarea
                                ref={editInputRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditSubmit}
                                    className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Text Message */}
                            {message.msg_type === 'TEXT' && (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                    {message._deleted ? '[Message deleted]' : message.content}
                                </p>
                            )}

                            {/* File Message */}
                            {message.msg_type === 'FILE' && !message._deleted && (
                                <a
                                    href={message.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-sm underline ${isOwn ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                        />
                                    </svg>
                                    {message.content || 'File attachment'}
                                </a>
                            )}

                            {/* Voice Message */}
                            {message.msg_type === 'VOICE' && !message._deleted && (
                                <div className="flex items-center gap-3 min-w-[160px]">
                                    <button
                                        onClick={togglePlayback}
                                        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${isOwn
                                            ? 'bg-indigo-500 hover:bg-indigo-400'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                            } transition-colors`}
                                    >
                                        {isPlaying ? (
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="h-1.5 bg-gray-300 dark:bg-gray-500 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-white dark:bg-indigo-400 rounded-full transition-all duration-300"
                                                style={{
                                                    width: message.duration
                                                        ? `${(currentTime / message.duration) * 100}%`
                                                        : '0%',
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs mt-0.5 opacity-80">
                                            {isPlaying
                                                ? formatDuration(currentTime)
                                                : formatDuration(message.duration)}
                                        </p>
                                    </div>

                                    <audio
                                        ref={audioRef}
                                        src={message.file_url}
                                        onTimeUpdate={handleTimeUpdate}
                                        onEnded={handleAudioEnded}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Action Buttons */}
                    {!message._deleted && (
                        <div className="absolute -top-2 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onReply && (
                                <button
                                    onClick={() => onReply(message)}
                                    className="p-1 rounded-full bg-white dark:bg-gray-600 shadow-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                                    title="Reply"
                                >
                                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                            )}

                            {canEdit() && !isEditing && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setEditContent(message.content || '');
                                        setTimeout(() => editInputRef.current?.focus(), 100);
                                    }}
                                    className="p-1 rounded-full bg-white dark:bg-gray-600 shadow-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                                    title="Edit"
                                >
                                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}

                            {isOwn && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Delete this message for everyone?')) {
                                            handleDelete(true);
                                        }
                                    }}
                                    className="p-1 rounded-full bg-white dark:bg-gray-600 shadow-md hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                                    title="Delete for everyone"
                                    disabled={isDeleting}
                                >
                                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Timestamp & Status */}
                <p
                    className={`text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}
                >
                    {formattedTime}
                    {renderStatus()}
                    {message.edited_at && (
                        <span className="text-gray-400 text-xs" title={`Edited at ${format(new Date(message.edited_at), 'h:mm a')}`}>
                            (edited)
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default MessageBubble;