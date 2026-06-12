// src/pages/ChatsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../stores/useChatStore';
import toast from 'react-hot-toast';           // ✅ ADDED import
import { format } from 'date-fns';             // ✅ ADDED import

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archived' },
];

const ChatsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const {
    conversations,
    archivedConversations,
    loadingConversations,
    fetchConversations,
    unarchiveConversation,
  } = useChatStore();

  // ─── Fetch on Mount ───
  useEffect(() => {
    fetchConversations(false);
  }, [fetchConversations]);

  // ─── Fetch on Tab Change ───
  useEffect(() => {
    if (activeTab === 'archived') {
      fetchConversations(true);
    } else {
      fetchConversations(false);
    }
  }, [activeTab, fetchConversations]);

  // ─── Handle Unarchive ───
  const handleUnarchive = async (convId) => {
    const success = await unarchiveConversation(convId);
    if (success) {
      toast.success('Conversation restored');
    } else {
      toast.error('Failed to restore conversation');
    }
  };

  // ─── Filtered Lists ───
  const activeConversations = activeTab === 'unread'
    ? conversations.filter((c) => c.unread_count > 0)
    : conversations;

  const displayConversations = activeTab === 'archived'
    ? archivedConversations
    : activeConversations;

  // ─── Format last active time ───
  const formatLastActive = (date) => {
    if (!date) return '';
    const msgDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return format(msgDate, 'h:mm a');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return format(msgDate, 'EEEE');
    return format(msgDate, 'MMM d');
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* ─── Header ─── */}
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Messages
        </h1>
      </header>

      {/* ─── Tabs ─── */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.key
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ─── Conversation List ─── */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-4">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {activeTab === 'archived'
                ? 'No archived conversations'
                : activeTab === 'unread'
                  ? 'No unread messages'
                  : 'No conversations yet'}
            </p>
          </div>
        ) : (
          displayConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                if (activeTab !== 'archived') {
                  navigate(`/chats/${conv.id}`);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${activeTab === 'archived' ? 'opacity-70' : ''
                }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={conv.participant?.avatar_url || '/default-avatar.png'}
                  alt={conv.participant?.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {/* Online Dot */}
                {conv.participant?.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    {conv.participant?.full_name || 'Unknown User'}
                    {conv.is_pinned && <span className="text-xs">📌</span>}
                    {conv.is_muted && <span className="text-xs">🔕</span>}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                    {conv.last_message_at
                      ? formatLastActive(conv.last_message_at)
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conv.last_message_preview || 'No messages yet'}
                  </p>
                  {conv.unread_count > 0 && activeTab !== 'archived' && (
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-indigo-600 rounded-full">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Unarchive Button (only for archived tab) */}
              {activeTab === 'archived' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnarchive(conv.id);
                  }}
                  className="flex-shrink-0 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                >
                  Restore
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatsPage;