// src/pages/ChatDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../api/chatApi';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import ConfirmDialog from '../components/chat/ConfirmDialog';
import ReportModal from '../components/chat/ReportModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ChatDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Get current user from AuthContext using the useAuth hook
  const { user } = useAuth();
  const currentUserId = user?.id;

  // ─── Store ───
  const {
    conversations,
    archivedConversations,
    messages,
    loadingMessages,
    socket,
    isSocketConnected,
    blockedUserIds,
    fetchMessages,
    addMessage,
    setActiveConversation,
    setUserId,
    fetchBlockedUsers,
    blockUser,
    unblockUser,
    toggleMute,
    togglePin,
    archiveConversation,
    deleteConversation,
    markMessagesAsRead,
  } = useChatStore();

  // Set userId in store when auth user changes
  useEffect(() => {
    if (currentUserId) {
      setUserId(currentUserId);
    }
  }, [currentUserId, setUserId]);

  // ─── Local State ───
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Confirmation dialogs
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // Loading states for actions
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // ─── Find conversation & participant ───
  const conversation =
    conversations.find((c) => c.id === conversationId) ||
    archivedConversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (conversation) {
      setOtherParticipant(conversation.participant);
      setActiveConversation(conversationId);
    }
  }, [conversation, conversationId, setActiveConversation]);

  // ─── Fetch Messages ───
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  // ─── Mark Messages as Read ───
  useEffect(() => {
    if (!loadingMessages && conversationId && messages.length > 0) {
      chatApi.markAsRead(conversationId).catch(() => { });
    }
  }, [loadingMessages, conversationId, messages.length]);

  // ─── Fetch Blocked Users on Mount ───
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // ─── Scroll to Bottom ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── WebSocket Message Handling ───
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'chat_message': {
            const msg = data.message || data;
            if (msg.conversation_id === conversationId) {
              addMessage(msg);
            }
            break;
          }

          case 'typing':
            if (data.user_id !== currentUserId) {
              setTypingUser(data.is_typing ? data.user_name : null);
              if (!data.is_typing) {
                setTimeout(() => setTypingUser(null), 500);
              }
            }
            break;

          case 'presence':
            setOtherParticipant((prev) =>
              prev
                ? { ...prev, is_online: data.is_online }
                : prev
            );
            break;

          case 'messages_read':
            if (data.conversation_id === conversationId) {
              markMessagesAsRead(conversationId, data.read_by);
            }
            break;

          case 'error':
            toast.error(data.message);
            break;

          default:
            break;
        }
      } catch (err) {
        // Ignore non-JSON messages
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, conversationId, currentUserId, addMessage, markMessagesAsRead]);

  // ─── Actions ───

  const handleBlockUser = async () => {
    setIsBlocking(true);
    const success = await blockUser(otherParticipant.id);
    setIsBlocking(false);
    setConfirmBlock(false);
    if (success) {
      toast.success('User blocked');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    const success = await unblockUser(otherParticipant.id);
    if (success) {
      toast.success('User unblocked');
    } else {
      toast.error('Failed to unblock user');
    }
  };

  const handleToggleMute = async () => {
    const success = await toggleMute(conversationId, conversation?.is_muted);
    if (success) {
      toast.success(
        conversation?.is_muted
          ? 'Notifications unmuted'
          : 'Notifications muted'
      );
    } else {
      toast.error('Failed to update mute settings');
    }
  };

  const handleTogglePin = async () => {
    const success = await togglePin(conversationId, conversation?.is_pinned);
    if (success) {
      toast.success(
        conversation?.is_pinned ? 'Conversation unpinned' : 'Conversation pinned'
      );
    } else {
      toast.error('Failed to update pin settings');
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const success = await archiveConversation(conversationId);
    setIsArchiving(false);
    setConfirmArchive(false);
    if (success) {
      toast.success('Conversation archived');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to archive conversation');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteConversation(conversationId);
    setIsDeleting(false);
    setConfirmDelete(false);
    if (success) {
      toast.success('Conversation deleted');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to delete conversation');
    }
  };

  const handleViewProfile = () => {
    setShowDrawer(false);
    navigate(`/profile/${otherParticipant?.id}`);
  };

  // Correctly determine reply sender name
  const handleReply = (message) => {
    const isMyMessage = message.sender_id === currentUserId;
    setReplyingTo({
      id: message.id,
      senderName: isMyMessage
        ? user?.full_name || 'You'
        : otherParticipant?.full_name || 'User',
      preview: message.content?.substring(0, 100) || 'File attachment',
    });
  };

  const cancelReply = () => setReplyingTo(null);

  // ─── Search ───
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = messages.filter(
      (m) =>
        m.msg_type === 'TEXT' && m.content?.toLowerCase().includes(query)
    );
    setSearchResults(results);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-message');
      setTimeout(() => el.classList.remove('highlight-message'), 2000);
    }
  };

  // ─── Is Blocked? ───
  const isBlocked = otherParticipant
    ? blockedUserIds.includes(otherParticipant.id)
    : false;

  // ─── Render ───
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 dark:text-gray-400">
        <p>Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* ─── Header ─── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Back Button */}
        <button
          onClick={() => navigate('/chats')}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <img
          src={otherParticipant?.avatar_url || '/default-avatar.png'}
          alt={otherParticipant?.full_name}
          className="w-10 h-10 rounded-full object-cover"
        />

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {otherParticipant?.full_name || 'Unknown User'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {typingUser ? (
              <span className="text-indigo-500 animate-pulse">typing...</span>
            ) : otherParticipant?.is_online ? (
              'Online'
            ) : otherParticipant?.last_active ? (
              `Last active ${format(new Date(otherParticipant.last_active), 'MMM d, h:mm a')}`
            ) : (
              'Offline'
            )}
          </p>
        </div>

        {/* Search Button */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Three-Dot Menu */}
        <button
          onClick={() => setShowDrawer(true)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
      </header>

      {/* ─── Search Bar ─── */}
      {showSearch && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search messages..."
              className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
              {searchResults.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => scrollToMessage(msg.id)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-xs text-gray-400 mr-2">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                  <span className="truncate">{msg.content?.substring(0, 80)}</span>
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No results found</p>
          )}
        </div>
      )}

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 dark:text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              senderName={otherParticipant?.full_name}
              senderAvatar={otherParticipant?.avatar_url}
              onReply={handleReply}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Message Input ─── */}
      <MessageInput
        conversationId={conversationId}
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
      />

      {/* ─── Info Drawer (Three-Dot Menu) ─── */}
      {showDrawer && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowDrawer(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Details
              </h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Participant Info */}
            <div className="px-4 py-6 text-center border-b border-gray-200 dark:border-gray-700">
              <img
                src={otherParticipant?.avatar_url || '/default-avatar.png'}
                alt={otherParticipant?.full_name}
                className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
              />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {otherParticipant?.full_name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {otherParticipant?.class_name || 'Student'}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span
                  className={`w-2 h-2 rounded-full ${otherParticipant?.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {otherParticipant?.is_online ? 'Active now' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 space-y-1">
              <button
                onClick={handleViewProfile}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                👤 View Profile
              </button>

              <button
                onClick={handleTogglePin}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {conversation?.is_pinned ? '📍 Unpin Conversation' : '📌 Pin Conversation'}
              </button>

              <button
                onClick={handleToggleMute}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {conversation?.is_muted ? '🔔 Unmute Notifications' : '🔕 Mute Notifications'}
              </button>

              <button
                onClick={() => setConfirmArchive(true)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📁 Archive Conversation
              </button>

              {isBlocked ? (
                <button
                  onClick={handleUnblockUser}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ✅ Unblock User
                </button>
              ) : (
                <button
                  onClick={() => setConfirmBlock(true)}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  🚫 Block User
                </button>
              )}

              <button
                onClick={() => {
                  setShowDrawer(false);
                  setShowReport(true);
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ⚠️ Report User
              </button>

              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                🗑️ Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation Dialogs ─── */}
      <ConfirmDialog
        isOpen={confirmBlock}
        title="Block User"
        message={`Block ${otherParticipant?.full_name}? They won't be able to message you, and your conversation will be deactivated.`}
        confirmText="Block"
        onConfirm={handleBlockUser}
        onCancel={() => setConfirmBlock(false)}
        isLoading={isBlocking}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Conversation"
        message="Delete this conversation? It will be removed for you. If the other user also deletes it, it will be permanently deleted."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={confirmArchive}
        title="Archive Conversation"
        message={`Archive this conversation with ${otherParticipant?.full_name}? You can find it later in the Archived tab.`}
        confirmText="Archive"
        confirmVariant="warning"
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
        isLoading={isArchiving}
      />

      {/* ─── Report Modal ─── */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={otherParticipant?.id}
        reportedUserName={otherParticipant?.full_name}
        conversationId={conversationId}
      />
    </div>
  );
};

export default ChatDetail;