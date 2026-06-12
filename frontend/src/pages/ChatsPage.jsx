import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../stores/useChatStore';
import { chatApi } from '../api/chatApi';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiPlus, FiSearch, FiX, FiMessageCircle, FiLoader } from 'react-icons/fi';

const TABS = [
  { key: 'all', label: 'All', icon: '💬' },
  { key: 'unread', label: 'Unread', icon: '🔔' },
  { key: 'archived', label: 'Archived', icon: '📦' },
];

// Skeleton Loader Component
const ConversationSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
    <div className="flex-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
    </div>
  </div>
);

// Conversation Item Component - Memoized for Performance
const ConversationItem = React.memo(({
  conv,
  isActive,
  activeTab,
  typingUser,
  onNavigate,
  onUnarchive,
  formatLastActive,
}) => {
  const isArchived = activeTab === 'archived';
  const isTyping = typingUser && typingUser !== '';

  return (
    <div
      onClick={() => {
        if (!isArchived && conv.id) onNavigate(`/chat/${conv.id}`);
      }}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-all duration-200 ${isArchived ? 'opacity-70 cursor-default hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-800/50'
        }`}
    >
      {/* Avatar with Online Indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
          {conv.participant?.avatar_url ? (
            <img
              src={conv.participant.avatar_url}
              alt={conv.participant?.full_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600">
            {conv.participant?.full_name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        {conv.participant?.is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
            {conv.participant?.full_name || 'Unknown User'}
            <span className="flex gap-1">
              {conv.is_pinned && <span className="text-xs">📌</span>}
              {conv.is_muted && <span className="text-xs">🔕</span>}
            </span>
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {conv.last_message_at ? formatLastActive(conv.last_message_at) : ''}
          </span>
        </div>

        {/* Message Preview or Typing Indicator */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isTyping ? (
              <p className="text-xs text-indigo-500 font-medium animate-pulse">{typingUser} is typing...</p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {conv.last_message_preview || 'No messages yet'}
              </p>
            )}
          </div>
          {conv.unread_count > 0 && !isArchived && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full ml-2 shadow-md">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>

      {/* Archive/Restore Button */}
      {isArchived && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnarchive(conv.id);
          }}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors duration-200"
        >
          Restore
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.conv.id === nextProps.conv.id &&
    prevProps.typingUser === nextProps.typingUser &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.conv.unread_count === nextProps.conv.unread_count &&
    prevProps.conv.last_message_preview === nextProps.conv.last_message_preview
  );
});

ConversationItem.displayName = 'ConversationItem';

// New Chat Modal Component
const NewChatModal = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  onSearch,
  searchResults,
  searching,
  startingChat,
  onStartChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col z-50"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Message</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start a conversation</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="Search by name..."
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={onSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {searching ? <FiLoader size={16} className="animate-spin" /> : <FiSearch size={16} />}
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {searchResults.map((foundUser) => (
                <button
                  key={foundUser.id}
                  onClick={() => onStartChat(foundUser.id)}
                  disabled={startingChat === foundUser.id}
                  className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                      {foundUser.profile_pic ? (
                        <img
                          src={foundUser.profile_pic}
                          alt={foundUser.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className="flex items-center justify-center w-full h-full">
                        {foundUser.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    {foundUser.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-700 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{foundUser.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{foundUser.class_name || 'Student'}</p>
                  </div>
                  {startingChat === foundUser.id && (
                    <div className="flex-shrink-0">
                      <FiLoader size={18} className="text-indigo-500 animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery && !searching ? (
            <div className="flex flex-col items-center justify-center h-40 px-6">
              <FiSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No users found matching "{searchQuery}"</p>
            </div>
          ) : !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-40 px-6">
              <FiSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Search for a user by name to start messaging</p>
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// Main ChatsPage Component
const ChatsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(null);
  const [typingConversations, setTypingConversations] = useState({});

  const conversations = useChatStore((s) => s.conversations);
  const archivedConversations = useChatStore((s) => s.archivedConversations);
  const loadingConversations = useChatStore((s) => s.loadingConversations);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const unarchiveConversation = useChatStore((s) => s.unarchiveConversation);
  const socket = useChatStore((s) => s.socket);
  const userId = useChatStore((s) => s.userId);

  useEffect(() => {
    fetchConversations(false);
  }, [fetchConversations]);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchConversations(true);
    } else {
      fetchConversations(false);
    }
  }, [activeTab, fetchConversations]);

  // Real-time WebSocket Updates
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'chat_message': {
            const msg = data.message || data;
            const preview = msg.msg_type === 'VOICE' ? '🎤 Voice message' :
              msg.msg_type === 'FILE' ? '📎 File attachment' :
                msg.content?.substring(0, 200) || '';

            useChatStore.setState((state) => ({
              conversations: state.conversations.map(conv =>
                conv.id === msg.conversation_id
                  ? {
                    ...conv,
                    last_message_preview: preview,
                    last_message_at: msg.created_at || msg.timestamp,
                    unread_count: msg.sender_id !== userId
                      ? (conv.unread_count || 0) + 1
                      : conv.unread_count
                  }
                  : conv
              )
            }));
            break;
          }

          case 'typing': {
            if (data.user_id !== userId) {
              setTypingConversations(prev => ({
                ...prev,
                [data.conversation_id]: data.is_typing ? data.user_name : null
              }));
              if (data.is_typing) {
                setTimeout(() => {
                  setTypingConversations(prev => {
                    if (prev[data.conversation_id] === data.user_name) {
                      const newState = { ...prev };
                      delete newState[data.conversation_id];
                      return newState;
                    }
                    return prev;
                  });
                }, 3000);
              }
            }
            break;
          }

          case 'presence': {
            useChatStore.setState((state) => ({
              conversations: state.conversations.map(conv =>
                conv.participant?.id === data.user_id
                  ? { ...conv, participant: { ...conv.participant, is_online: data.is_online } }
                  : conv
              ),
              archivedConversations: state.archivedConversations.map(conv =>
                conv.participant?.id === data.user_id
                  ? { ...conv, participant: { ...conv.participant, is_online: data.is_online } }
                  : conv
              )
            }));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        // Ignore non-JSON messages
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, userId]);

  const handleUnarchive = useCallback(async (convId) => {
    const success = await unarchiveConversation(convId);
    if (success) {
      toast.success('Conversation restored');
      setActiveTab('all');
    } else {
      toast.error('Failed to restore conversation');
    }
  }, [unarchiveConversation]);

  const handleSearchUsers = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const response = await apiClient.get('/accounts/students/search/', { params: { q: searchQuery } });
      const results = response.data || [];
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleStartConversation = useCallback(async (userId) => {
    if (!userId) return;
    setStartingChat(userId);
    try {
      const conversation = await chatApi.startConversation(userId);
      const convId = conversation?.id || conversation?.data?.id;
      if (convId) {
        toast.success('Conversation started');
        setShowNewChat(false);
        setSearchQuery('');
        setSearchResults([]);
        fetchConversations(false);
        navigate(`/chat/${convId}`);
      } else {
        toast.error('Could not create conversation');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start conversation');
    } finally {
      setStartingChat(null);
    }
  }, [navigate, fetchConversations]);

  const formatLastActive = useCallback((date) => {
    if (!date) return '';
    const msgDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return format(msgDate, 'h:mm a');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return format(msgDate, 'EEEE');
    return format(msgDate, 'MMM d');
  }, []);

  // Filter and memoize displayed conversations
  const displayConversations = useMemo(() => {
    if (activeTab === 'archived') {
      return Array.isArray(archivedConversations) ? archivedConversations : [];
    }
    if (!Array.isArray(conversations)) return [];
    if (activeTab === 'unread') {
      return conversations.filter((c) => c.unread_count > 0);
    }
    return conversations;
  }, [conversations, archivedConversations, activeTab]);

  const unreadCount = useMemo(() => {
    return Array.isArray(conversations) ? conversations.filter((c) => c.unread_count > 0).length : 0;
  }, [conversations]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Messages</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stay connected</p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="p-2.5 text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="New conversation"
          title="Start a new conversation"
        >
          <FiPlus size={24} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-6 sticky top-16 z-30">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'unread' ? unreadCount : undefined;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-4 px-1 text-sm font-medium transition-all duration-200 relative ${isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full">
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : !Array.isArray(displayConversations) || displayConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-12">
            <div className="text-6xl mb-4 opacity-50">
              {activeTab === 'archived' ? '📦' : activeTab === 'unread' ? '✨' : '💬'}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {activeTab === 'archived' ? 'No archived conversations' : activeTab === 'unread' ? 'All caught up!' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              {activeTab === 'archived' ? 'Your archived conversations will appear here' : activeTab === 'unread' ? 'You have read all your messages' : 'Start a new conversation to begin messaging'}
            </p>
            {activeTab !== 'archived' && (
              <button
                onClick={() => setShowNewChat(true)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={activeTab !== 'archived'}
                activeTab={activeTab}
                typingUser={typingConversations[conv.id]}
                onNavigate={navigate}
                onUnarchive={handleUnarchive}
                formatLastActive={formatLastActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => {
          setShowNewChat(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearchUsers}
        searchResults={searchResults}
        searching={searching}
        startingChat={startingChat}
        onStartChat={handleStartConversation}
      />
    </div>
  );
};

export default ChatsPage;