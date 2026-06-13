// src/pages/ChatDetail.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { chatApi } from '../api/chatApi';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import ConfirmDialog from '../components/chat/ConfirmDialog';
import ReportModal from '../components/chat/ReportModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─────────────────────────────────────────────
// Memoized UI Components for performance
// ─────────────────────────────────────────────

const Avatar = React.memo(({ src, name, size = 10, ring = false }) => (
  <img
    src={src || '/default-avatar.png'}
    alt={name || 'User'}
    onError={(e) => { e.target.src = '/default-avatar.png'; }}
    className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0
      ${ring ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
  />
));

const OnlineDot = React.memo(({ online }) => (
  <span
    className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0
      ${online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-gray-400'}`}
  />
));

const IconBtn = React.memo(({ onClick, label, children, className = '' }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
      hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all duration-150 ${className}`}
  >
    {children}
  </button>
));

// SVG Icons
const Icons = {
  Back: React.memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )),
  Search: React.memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )),
  More: React.memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  )),
  Close: React.memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )),
  Chat: React.memo(() => (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )),
  Wifi: React.memo(() => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  )),
};

const TypingIndicator = React.memo(() => (
  <div className="flex items-end gap-2 px-4 pb-2">
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  </div>
));

const DrawerAction = React.memo(({ onClick, emoji, label, danger = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-150
      ${danger
        ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
      }`}
  >
    <span className="text-base w-6 text-center">{emoji}</span>
    <span>{label}</span>
  </button>
));

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const ChatDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  // ── Refs ──────────────────────────────────
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());
  const initCompletedRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // ── Auth ──────────────────────────────────
  const { user } = useAuth();
  const currentUserId = user?.id;

  // ── Store ─────────────────────────────────
  const conversations = useChatStore((s) => s.conversations);
  const archivedConversations = useChatStore((s) => s.archivedConversations);
  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const loadingMessages = useChatStore((s) => s.loadingMessages);
  const loadingConversations = useChatStore((s) => s.loadingConversations);
  const blockedUserIds = useChatStore((s) => s.blockedUserIds);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setUserId = useChatStore((s) => s.setUserId);
  const fetchBlockedUsers = useChatStore((s) => s.fetchBlockedUsers);
  const blockUser = useChatStore((s) => s.blockUser);
  const unblockUser = useChatStore((s) => s.unblockUser);
  const toggleMute = useChatStore((s) => s.toggleMute);
  const togglePin = useChatStore((s) => s.togglePin);
  const archiveConversation = useChatStore((s) => s.archiveConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const markMessageAsReadInStore = useChatStore((s) => s.markMessagesAsRead);

  // ── WebSocket ─────────────────────────────
  const { isConnected: isWsConnected } = useWebSocket(conversationId);
  const socketConnected = useChatStore((s) => s.isSocketConnected);

  // ── Local state ───────────────────────────
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ── Derived - Memoized ────────────────────
  const conversation = useMemo(() => {
    if (!conversationId || conversationId === 'undefined') return null;
    const active = Array.isArray(conversations) ? conversations : [];
    const archived = Array.isArray(archivedConversations) ? archivedConversations : [];
    return (
      active.find((c) => c.id === conversationId) ||
      archived.find((c) => c.id === conversationId) ||
      null
    );
  }, [conversations, archivedConversations, conversationId]);

  const isBlocked = useMemo(() => {
    return otherParticipant && Array.isArray(blockedUserIds)
      ? blockedUserIds.includes(otherParticipant.id)
      : false;
  }, [otherParticipant, blockedUserIds]);

  const isTyping = useMemo(() => {
    return !!(otherParticipant && typingUsers[otherParticipant.id]);
  }, [otherParticipant, typingUsers]);

  const connected = socketConnected || isWsConnected;

  // ── Effects - Optimized initialization ───

  useEffect(() => {
    if (currentUserId) setUserId(currentUserId);
  }, [currentUserId, setUserId]);

  useEffect(() => {
    if (conversation) {
      setOtherParticipant(conversation.participant);
      setActiveConversation(conversationId);
    }
  }, [conversation, conversationId, setActiveConversation]);

  // SINGLE INITIALIZATION EFFECT
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') return;

    const initializeChat = async () => {
      if (initCompletedRef.current) return;
      initCompletedRef.current = true;

      try {
        await fetchMessages(conversationId);
        await fetchBlockedUsers();
        if (messages.length > 0) {
          await markMessageAsReadInStore(conversationId);
        }
      } catch (err) {
        console.error('Chat initialization error:', err);
      }
    };

    initializeChat();
  }, [conversationId, fetchMessages, fetchBlockedUsers, markMessageAsReadInStore, messages.length]);

  // Mark as read on visibility change
  useEffect(() => {
    const markAsReadIfVisible = () => {
      if (document.visibilityState === 'visible' && conversationId && messages.length > 0) {
        markMessageAsReadInStore(conversationId);
      }
    };

    document.addEventListener('visibilitychange', markAsReadIfVisible);
    window.addEventListener('focus', markAsReadIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', markAsReadIfVisible);
      window.removeEventListener('focus', markAsReadIfVisible);
    };
  }, [conversationId, messages.length, markMessageAsReadInStore]);

  // Auto-scroll to bottom
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > lastMessageCountRef.current && messagesContainerRef.current) {
      const nearBottom = messagesContainerRef.current.scrollHeight -
        messagesContainerRef.current.scrollTop -
        messagesContainerRef.current.clientHeight < 200;
      if (nearBottom) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
    lastMessageCountRef.current = currentCount;
  }, [messages.length]);

  // Mobile keyboard detection
  useEffect(() => {
    const handleVisualViewport = () => {
      if (!window.visualViewport) return;
      const isOpen = window.innerHeight - window.visualViewport.height > 150;
      setKeyboardVisible(isOpen);
      if (isOpen) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    window.visualViewport?.addEventListener('resize', handleVisualViewport);
    return () => window.visualViewport?.removeEventListener('resize', handleVisualViewport);
  }, []);

  // ── WebSocket message handler (ONLY via custom event - NO direct socket listener) ──
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = event.detail;

      if (!data || typeof data !== 'object' || typeof data.type === 'undefined') {
        return;
      }

      switch (data.type) {
        case 'chat_message': {
          const msg = data.message || data.payload || data;
          const msgConvId = msg.conversation_id || data.conversation_id;

          if (msgConvId === conversationId) {
            // Store handles deduplication
            useChatStore.getState().addMessage(conversationId, {
              ...msg,
              id: msg.id || data.id,
              conversation_id: msgConvId,
              sender_id: msg.sender_id || data.sender_id,
              content: msg.content || data.content,
              msg_type: msg.msg_type || data.msg_type || 'TEXT',
              created_at: msg.created_at || data.created_at || data.timestamp,
              is_read: msg.is_read || data.is_read || false,
            });
          }
          break;
        }

        case 'typing':
        case 'typing_indicator': {
          const userId = data.user_id;
          if (userId && userId !== currentUserId) {
            const prevTimeout = typingTimeoutsRef.current.get(userId);
            if (prevTimeout) clearTimeout(prevTimeout);

            setTypingUsers((prev) => ({ ...prev, [userId]: data.is_typing }));

            if (data.is_typing) {
              const timeout = setTimeout(() => {
                setTypingUsers((prev) => ({ ...prev, [userId]: false }));
              }, 3000);
              typingTimeoutsRef.current.set(userId, timeout);
            }
          }
          break;
        }

        case 'presence':
        case 'user_status':
          if (data.user_id !== currentUserId) {
            setOtherParticipant((prev) =>
              prev ? { ...prev, is_online: data.is_online } : prev
            );
          }
          break;

        case 'messages_read':
          if (data.conversation_id === conversationId && data.read_by !== currentUserId) {
            markMessageAsReadInStore(conversationId, data.read_by);
          }
          break;

        case 'message_edited':
          if (data.conversation_id === conversationId) {
            useChatStore.setState((state) => ({
              messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((m) =>
                  m.id === data.message_id
                    ? { ...m, content: data.new_content, edited_at: data.edited_at }
                    : m
                ),
              },
            }));
            toast.success('Message edited');
          }
          break;

        case 'message_deleted':
          if (data.conversation_id === conversationId) {
            useChatStore.setState((state) => ({
              messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((m) =>
                  m.id === data.message_id
                    ? { ...m, _deleted: true, content: '[Message deleted]' }
                    : m
                ),
              },
            }));
          }
          break;

        case 'error':
          toast.error(data.message || 'An error occurred');
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[WS] Failed to handle message:', err);
    }
  }, [conversationId, currentUserId, markMessageAsReadInStore]);

  // ONLY listen to custom event - NO direct socket listener to prevent duplicates
  useEffect(() => {
    const handler = (e) => handleWebSocketMessage(e);
    window.addEventListener('websocket_message', handler);
    return () => window.removeEventListener('websocket_message', handler);
  }, [handleWebSocketMessage]);

  // ── Action callbacks ──────────────────────
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      await chatApi.editMessage(conversationId, messageId, newContent);
      return true;
    } catch (err) {
      console.error('Edit failed:', err);
      return false;
    }
  }, [conversationId]);

  const handleDeleteMessage = useCallback(async (messageId, deleteForEveryone = true) => {
    try {
      await chatApi.deleteMessage(conversationId, messageId, deleteForEveryone);
      return true;
    } catch (err) {
      console.error('Delete failed:', err);
      return false;
    }
  }, [conversationId]);

  const handleBlockUser = useCallback(async () => {
    if (!otherParticipant?.id) return;
    setIsBlocking(true);
    const ok = await blockUser(otherParticipant.id);
    setIsBlocking(false);
    setConfirmBlock(false);
    if (ok) {
      toast.success('User blocked');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to block user');
    }
  }, [otherParticipant, blockUser, navigate]);

  const handleUnblockUser = useCallback(async () => {
    if (!otherParticipant?.id) return;
    const ok = await unblockUser(otherParticipant.id);
    toast[ok ? 'success' : 'error'](ok ? 'User unblocked' : 'Failed to unblock');
  }, [otherParticipant, unblockUser]);

  const handleToggleMute = useCallback(async () => {
    const ok = await toggleMute(conversationId, conversation?.is_muted);
    if (ok) {
      toast.success(conversation?.is_muted ? 'Notifications unmuted' : 'Notifications muted');
    } else {
      toast.error('Failed to update notifications');
    }
  }, [conversationId, conversation?.is_muted, toggleMute]);

  const handleTogglePin = useCallback(async () => {
    const ok = await togglePin(conversationId, conversation?.is_pinned);
    if (ok) {
      toast.success(conversation?.is_pinned ? 'Conversation unpinned' : 'Conversation pinned');
    } else {
      toast.error('Failed to update pin');
    }
  }, [conversationId, conversation?.is_pinned, togglePin]);

  const handleArchive = useCallback(async () => {
    setIsArchiving(true);
    const ok = await archiveConversation(conversationId);
    setIsArchiving(false);
    setConfirmArchive(false);
    if (ok) {
      toast.success('Conversation archived');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to archive');
    }
  }, [conversationId, archiveConversation, navigate]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    const ok = await deleteConversation(conversationId);
    setIsDeleting(false);
    setConfirmDelete(false);
    if (ok) {
      toast.success('Conversation deleted');
      setShowDrawer(false);
      navigate('/chats');
    } else {
      toast.error('Failed to delete');
    }
  }, [conversationId, deleteConversation, navigate]);

  // REMOVED: handleViewProfile - causing "Page Not Found" error
  // The profile page for other users doesn't exist yet

  const handleReply = useCallback((message) => {
    const isOwn = message.sender_id === currentUserId;
    setReplyingTo({
      id: message.id,
      senderName: isOwn ? (user?.full_name || 'You') : (otherParticipant?.full_name || 'User'),
      preview: (message.content || 'File attachment').substring(0, 100),
    });
  }, [currentUserId, user, otherParticipant]);

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      messages.filter(
        (m) => m.msg_type === 'TEXT' && m.content?.toLowerCase().includes(q) && !m._deleted
      )
    );
  }, [searchQuery, messages]);

  const scrollToMessage = useCallback((msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight-message');
    setTimeout(() => el.classList.remove('highlight-message'), 2000);
  }, []);

  const getMessageKey = useCallback((msg, idx) => {
    if (msg.id && !msg._tempId) return `msg-${msg.id}`;
    if (msg._tempId) return `pending-${msg._tempId}`;
    return `fallback-${idx}-${msg.created_at || Date.now()}`;
  }, []);

  // ── Render ────────────────────────────────
  if (loadingConversations && !conversation && !initCompletedRef.current) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (!conversation && !loadingConversations && conversationId && conversationId !== 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-900 px-6">
        <div className="p-5 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-5 text-gray-300 dark:text-gray-600">
          <Icons.Chat />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Conversation not found</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 text-center">
          This conversation may have been deleted or doesn't exist.
        </p>
        <button
          onClick={() => navigate('/chats')}
          className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200/80 dark:border-gray-700/80
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm sticky top-0 z-10">
        <IconBtn onClick={() => navigate('/chats')} label="Back">
          <Icons.Back />
        </IconBtn>

        <div className="relative flex-shrink-0">
          <Avatar src={otherParticipant?.avatar_url} name={otherParticipant?.full_name} size={10} />
          {otherParticipant?.is_online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400
              border-2 border-white dark:border-gray-800 shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {otherParticipant?.full_name || 'Unknown User'}
          </h2>
          <p className="text-xs leading-tight mt-0.5">
            {isTyping ? (
              <span className="text-indigo-500 font-medium animate-pulse">typing…</span>
            ) : otherParticipant?.is_online ? (
              <span className="text-emerald-500 font-medium">Active now</span>
            ) : otherParticipant?.last_active ? (
              <span className="text-gray-400 dark:text-gray-500">
                Last seen {format(new Date(otherParticipant.last_active), 'MMM d, h:mm a')}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">Offline</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <IconBtn onClick={() => setShowSearch((v) => !v)} label="Search messages">
            <Icons.Search />
          </IconBtn>
          <IconBtn onClick={() => setShowDrawer(true)} label="More options">
            <Icons.More />
          </IconBtn>
        </div>
      </header>

      {/* Connection banner */}
      {!connected && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5
          bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/60">
          <Icons.Wifi />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Reconnecting to chat server…
          </p>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search messages…"
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700
                  border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500
                  text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Search
            </button>
            <IconBtn onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} label="Close search">
              <Icons.Close />
            </IconBtn>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-700/50 divide-y divide-gray-200/60 dark:divide-gray-700">
              <p className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
              {searchResults.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => scrollToMessage(msg.id)}
                  className="w-full text-left flex items-start gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
                    {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{msg.content?.substring(0, 80)}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">No messages match "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: keyboardVisible ? 'env(safe-area-inset-bottom, 20px)' : undefined,
        }}
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-300 dark:text-indigo-600">
              <Icons.Chat />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              No messages yet.<br />Say hello to {otherParticipant?.full_name?.split(' ')[0] || 'them'}!
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-1">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={getMessageKey(msg, idx)}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                senderName={otherParticipant?.full_name}
                senderAvatar={otherParticipant?.avatar_url}
                onReply={handleReply}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800">
        <MessageInput
          conversationId={conversationId}
          replyingTo={replyingTo}
          onCancelReply={cancelReply}
        />
      </div>

      {/* Info Drawer - View Profile option REMOVED */}
      {showDrawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800
            shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Details</h3>
              <IconBtn onClick={() => setShowDrawer(false)} label="Close">
                <Icons.Close />
              </IconBtn>
            </div>
            <div className="px-4 py-6 text-center border-b border-gray-200 dark:border-gray-700 bg-gradient-to-b from-indigo-50/40 to-transparent dark:from-indigo-900/10">
              <div className="relative inline-block mb-3">
                <Avatar src={otherParticipant?.avatar_url} name={otherParticipant?.full_name} size={20} ring />
                {otherParticipant?.is_online && (
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400
                    border-2 border-white dark:border-gray-800" />
                )}
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                {otherParticipant?.full_name || 'Unknown User'}
              </h4>
              {otherParticipant?.class_name && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{otherParticipant.class_name}</p>
              )}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <OnlineDot online={otherParticipant?.is_online} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {otherParticipant?.is_online ? 'Active now' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {/* View Profile option REMOVED - causes 404 */}
              <DrawerAction onClick={handleTogglePin} emoji={conversation?.is_pinned ? '📍' : '📌'} label={conversation?.is_pinned ? 'Unpin Conversation' : 'Pin Conversation'} />
              <DrawerAction onClick={handleToggleMute} emoji={conversation?.is_muted ? '🔔' : '🔕'} label={conversation?.is_muted ? 'Unmute Notifications' : 'Mute Notifications'} />
              <DrawerAction onClick={() => setConfirmArchive(true)} emoji="📁" label="Archive Conversation" />
              <div className="h-px bg-gray-100 dark:bg-gray-700/60 my-2 mx-2" />
              {isBlocked ? (
                <DrawerAction onClick={handleUnblockUser} emoji="✅" label="Unblock User" />
              ) : (
                <DrawerAction onClick={() => setConfirmBlock(true)} emoji="🚫" label="Block User" danger />
              )}
              <DrawerAction onClick={() => { setShowDrawer(false); setShowReport(true); }} emoji="⚠️" label="Report User" />
              <DrawerAction onClick={() => setConfirmDelete(true)} emoji="🗑️" label="Delete Chat" danger />
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog isOpen={confirmBlock} title="Block User" message={`Block ${otherParticipant?.full_name || 'this user'}? They won't be able to message you.`} confirmText="Block" onConfirm={handleBlockUser} onCancel={() => setConfirmBlock(false)} isLoading={isBlocking} />
      <ConfirmDialog isOpen={confirmDelete} title="Delete Conversation" message="This will permanently delete the conversation for you. This action cannot be undone." confirmText="Delete" onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} isLoading={isDeleting} />
      <ConfirmDialog isOpen={confirmArchive} title="Archive Conversation" message="This conversation will be moved to your archive." confirmText="Archive" confirmVariant="warning" onConfirm={handleArchive} onCancel={() => setConfirmArchive(false)} isLoading={isArchiving} />
      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} reportedUserId={otherParticipant?.id} reportedUserName={otherParticipant?.full_name || 'User'} conversationId={conversationId} />
    </div>
  );
};

export default ChatDetail;