// src/components/chat/MessageBubble.jsx
import React, { useRef, useState } from 'react';
import { format } from 'date-fns';

const MessageBubble = ({
    message,
    isOwn,
    senderName,
    senderAvatar,
    onReply,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    const formattedTime = message.created_at
        ? format(new Date(message.created_at), 'h:mm a')
        : message.timestamp
            ? format(new Date(message.timestamp), 'h:mm a')
            : '';

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

    const formatCurrentDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Checkmark logic
    const renderCheckmarks = () => {
        if (!isOwn) return null;
        if (message.is_read) {
            return (
                <span className="text-blue-500 ml-1" title="Read">
                    ✓✓
                </span>
            );
        }
        return (
            <span className="text-gray-400 ml-1" title="Sent">
                ✓
            </span>
        );
    };

    return (
        <div
            id={`msg-${message.id}`}
            className={`flex gap-3 mb-4 transition-all duration-300 ${isOwn ? 'flex-row-reverse' : 'flex-row'
                }`}
        >
            {/* Avatar */}
            <div className="flex-shrink-0">
                <img
                    src={senderAvatar || '/default-avatar.png'}
                    alt={senderName || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
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
                        }`}
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
                            <p className="font-medium truncate">Reply</p>
                            <p className="truncate">{message.reply_preview}</p>
                        </div>
                    )}

                    {/* Text Message */}
                    {message.msg_type === 'TEXT' && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                        </p>
                    )}

                    {/* File Message */}
                    {message.msg_type === 'FILE' && (
                        <a
                            href={message.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-sm underline ${isOwn ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'
                                }`}
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
                    {message.msg_type === 'VOICE' && (
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

                            {/* Progress */}
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
                                        ? formatCurrentDuration(currentTime)
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

                    {/* Reply Button (on hover) */}
                    {onReply && (
                        <button
                            onClick={() => onReply(message)}
                            className={`absolute -top-2 ${isOwn ? '-left-2' : '-right-2'
                                } p-1 rounded-full bg-white dark:bg-gray-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity`}
                            title="Reply"
                        >
                            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Timestamp & Checkmarks */}
                <p
                    className={`text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1 ${isOwn ? 'justify-end mr-1' : 'ml-1'
                        }`}
                >
                    {formattedTime}
                    {renderCheckmarks()}
                </p>
            </div>
        </div>
    );
};

export default MessageBubble;