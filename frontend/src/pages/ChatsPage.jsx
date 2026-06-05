import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chatApi';
import { accountsApi } from '../api/accountsApi';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import {
    FiMessageSquare, FiSearch, FiPlus, FiUser, FiX,
    FiClock, FiChevronRight
} from 'react-icons/fi';

export default function ChatsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const conversations = useChatStore(s => s.conversations);
    const setConversations = useChatStore(s => s.setConversations);
    const navigate = useNavigate();

    const fetchConversations = useCallback(async () => {
        try {
            const res = await chatApi.getConversations();
            setConversations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [setConversations]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleSearch = useCallback(async (q) => {
        setSearchQuery(q);
        if (q.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await accountsApi.searchStudents(q);
            // Filter out the current user
            const filtered = (res.data || []).filter(u => u.id !== user.id);
            setSearchResults(filtered);
        } catch (err) {
            console.error(err);
            setSearchResults([]);
        }
    }, [user.id]);

    const startChat = async (otherUserId) => {
        try {
            const res = await chatApi.startConversation(otherUserId);
            navigate(`/chat/${res.data.id}`);
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to get the other participant's name and details
    const getOtherParticipant = (conv) => {
        if (!user) return { name: 'Unknown', avatar: '' };
        const otherId = conv.participants.find(id => id !== user.id);
        // In a full implementation, you would fetch user details or store them.
        // For now, we use a placeholder; ideally you'd have a users map or fetch.
        // But for demonstration, we'll show the conversation ID trimmed.
        return {
            name: otherId ? `User ${otherId.slice(0, 8)}` : 'Unknown',
            avatar: null, // could fetch from user service
            id: otherId,
        };
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const msgDate = new Date(timestamp);
        const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return msgDate.toLocaleDateString([], { weekday: 'short' });
        return msgDate.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Messages
                    </h1>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-95"
                    >
                        <FiPlus size={18} />
                        <span className="hidden sm:inline">New Chat</span>
                    </button>
                </div>

                {/* Search panel for new chat */}
                {showSearch && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search students by name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                                className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {searchResults.map((student) => (
                                    <div
                                        key={student.id}
                                        onClick={() => startChat(student.id)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow">
                                            {student.full_name?.[0] || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white">{student.full_name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.class_name || 'Student'}</p>
                                        </div>
                                        <FiChevronRight className="text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery.length >= 2 && searchResults.length === 0 && (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No students found.</p>
                        )}
                    </div>
                )}

                {/* Conversations list */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
                            <FiMessageSquare className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No conversations yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Search for a student and start chatting!</p>
                        <button
                            onClick={() => setShowSearch(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                        >
                            Find someone to chat
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {conversations.map(conv => {
                            const other = getOtherParticipant(conv);
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => navigate(`/chat/${conv.id}`)}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                                                {other.name?.[0] || '?'}
                                            </div>
                                            {/* Online indicator (simulated) */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {other.name}
                                                </h3>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2 flex items-center gap-1">
                                                    <FiClock size={12} />
                                                    {formatTime(conv.last_message_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {conv.last_message_preview || 'No messages yet'}
                                            </p>
                                        </div>
                                        <FiChevronRight className="text-gray-400 group-hover:text-indigo-500 transition-colors ml-2" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}