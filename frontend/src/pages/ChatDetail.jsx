import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import { chatApi } from '../api/chatApi';
import { FiArrowLeft, FiUser, FiPhone, FiInfo } from 'react-icons/fi';

export default function ChatDetail() {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const setActiveConversation = useChatStore(s => s.setActiveConversation);
    const connectWebSocket = useChatStore(s => s.connectWebSocket);
    const disconnectWebSocket = useChatStore(s => s.disconnectWebSocket);
    const fetchMessages = useChatStore(s => s.setMessages);
    const [loading, setLoading] = useState(true);
    const [otherParticipant, setOtherParticipant] = useState(null);
    const conversations = useChatStore(s => s.conversations);

    // Determine the other participant from the conversation
    useEffect(() => {
        const conv = conversations.find(c => c.id === conversationId);
        if (conv && user) {
            const otherId = conv.participants.find(id => id !== user.id);
            // In a real app you'd fetch user details; here we use a placeholder
            setOtherParticipant({
                id: otherId,
                name: otherId ? `User ${otherId.slice(0, 8)}` : 'Unknown',
                status: 'online', // could be dynamic
                avatar: null,
            });
        }
    }, [conversationId, conversations, user]);

    useEffect(() => {
        setActiveConversation({ id: conversationId });
        connectWebSocket(conversationId);

        chatApi.getMessages(conversationId, null, 30).then(res => {
            fetchMessages(conversationId, res.data.reverse());
            setLoading(false);
        });

        return () => {
            disconnectWebSocket();
        };
    }, [conversationId, setActiveConversation, connectWebSocket, disconnectWebSocket, fetchMessages]);

    const handleBack = () => {
        navigate('/chats');
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Chat header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <FiArrowLeft size={20} />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow">
                            {otherParticipant?.name?.[0] || '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                            {otherParticipant?.name || 'Loading...'}
                        </h2>
                        <p className="text-xs text-green-500 dark:text-green-400 font-medium">
                            Online
                        </p>
                    </div>
                </div>

                <button className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <FiPhone size={18} />
                </button>
                <button className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <FiInfo size={18} />
                </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-pulse text-gray-400">Loading messages...</div>
                    </div>
                ) : (
                    <ChatWindow conversationId={conversationId} />
                )}
            </div>

            {/* Message input */}
            <MessageInput conversationId={conversationId} />
        </div>
    );
}