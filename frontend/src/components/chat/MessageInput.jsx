import React, { useState, useRef } from 'react';
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

export default function MessageInput({ conversationId }) {
    const [text, setText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [recording, setRecording] = useState(false);
    const [uploading, setUploading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const inputRef = useRef(null);
    const addMessage = useChatStore(s => s.addMessage);
    const updateMessageStatus = useChatStore(s => s.updateMessageStatus);
    const user = useChatStore(s => s.user);

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
            updateMessageStatus(conversationId, tempId, { _failed: true });
            toast.error('Message failed to send');
        }
    };

    const handleSend = () => {
        if (text.trim()) {
            sendMessage('TEXT', text);
            setText('');
            setShowEmoji(false);
            inputRef.current?.focus();
        }
    };

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
        noClick: true,
        noKeyboard: true,
        accept: ALLOWED_MIME,
        onDrop: async (acceptedFiles) => {
            for (const file of acceptedFiles) {
                if (file.type.startsWith('video/')) {
                    toast.error('Video files are not allowed');
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
                    toast.error('File upload failed');
                }
            }
            setUploading(false);
        },
    });

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = async () => {
                setRecording(false);
                const blob = new Blob(chunks, { type: 'audio/webm' });
                try {
                    const { data } = await chatApi.getPresignedUrl('voice.webm', 'audio/webm');
                    await fetch(data.presigned_url, { method: 'PUT', body: blob });
                    sendMessage('VOICE', '', data.file_url);
                } catch (err) {
                    toast.error('Voice upload failed');
                }
            };
            recorder.start();
            setRecording(true);
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, 10000);
        } catch (err) {
            toast.error('Microphone not accessible');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    return (
        <div
            {...getRootProps()}
            className={`relative border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg px-4 py-3 ${isDragActive ? 'ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                }`}
        >
            <input {...getInputProps()} />
            <div className="flex items-end gap-2">
                {/* Emoji button */}
                <div className="relative">
                    <button
                        onClick={() => setShowEmoji(!showEmoji)}
                        className="p-2.5 rounded-xl text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <FiSmile size={20} />
                    </button>
                    {showEmoji && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                            <div className="absolute bottom-full left-0 mb-2 z-50">
                                <EmojiPicker
                                    onEmojiClick={(emojiData) => {
                                        setText(prev => prev + emojiData.emoji);
                                        setShowEmoji(false);
                                    }}
                                    emojiStyle={EmojiStyle.NATIVE}
                                    width={320}
                                    height={400}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* File upload */}
                <button
                    onClick={open}
                    disabled={uploading}
                    className={`p-2.5 rounded-xl transition-colors ${uploading
                            ? 'text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 cursor-wait'
                            : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <FiPaperclip size={20} />
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message..."
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                        className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Send / Voice record */}
                {text.trim() ? (
                    <button
                        onClick={handleSend}
                        className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                    >
                        <FiSend size={20} />
                    </button>
                ) : (
                    <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`p-2.5 rounded-xl transition-all ${recording
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        {recording ? <FiSquare size={20} /> : <FiMic size={20} />}
                    </button>
                )}
            </div>

            {/* Recording indicator */}
            {recording && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-500 font-medium">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    Recording… (max 10s)
                    <button onClick={stopRecording} className="ml-auto text-gray-500 hover:text-red-500">
                        <FiX size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}