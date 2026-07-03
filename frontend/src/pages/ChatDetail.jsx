// frontend/src/pages/ChatDetail.jsx
import React, {
  useEffect, useRef, useCallback, useState, useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '@/stores/useChatStore';
import useUserStore from '@/stores/useUserStore';
import useWebSocket from '@/hooks/useWebSocket';
import { useMessageActions } from '@/hooks/useMessageActions';
import chatApi from '@/api/chatApi';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from "@/contexts/ThemeContext";
import MessageBubble from '@/components/chat/MessageBubble';
import MessageComposer from '@/components/chat/MessageComposer';
import ForwardModal from '@/components/chat/ForwardModal';
import DeleteConfirmation from '@/components/chat/DeleteConfirmation';
import ChatSearchModal from '@/components/chat/ChatSearchModal';
import toast from 'react-hot-toast';
import "../styles/chat-detail.css";

// ─── Helpers ──────────────────────────────────────────────────────────────
const getDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: diff > 365 ? 'numeric' : undefined });
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
};

// ─── Sub-components ───────────────────────────────────────────────────────
const ReportModal = ({ message, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold mb-4 dark:text-white">Report Message</h3>
        <label className="block text-sm font-medium mb-1">Reason</label>
        <select value={reason} onChange={e => setReason(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3 dark:bg-gray-700 dark:border-gray-600">
          <option value="">Select reason</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="inappropriate">Inappropriate Content</option>
          <option value="other">Other</option>
        </select>
        <label className="block text-sm font-medium mb-1">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="w-full border rounded-lg px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600"
          placeholder="Additional details..." />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">Cancel</button>
          <button onClick={() => { if (!reason.trim()) return toast.error('Please select a reason'); onSubmit(reason, description); }}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Submit Report</button>
        </div>
      </div>
    </div>
  );
};

const RateLimitModal = ({ rateLimit, onDismiss }) => {
  if (!rateLimit || rateLimit.remaining > 0) return null;
  const resetTime = rateLimit.reset_at
    ? new Date(rateLimit.reset_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'soon';
  return (
    <div className="cd-rate-overlay" onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div className="cd-rate-card">
        <div className="cd-rate-title">🚦 Daily limit reached</div>
        <div className="cd-rate-body">
          You've sent {rateLimit.limit} messages today. Your limit resets at {resetTime}.
        </div>
        <button className="cd-rate-dismiss" onClick={onDismiss}>Got it</button>
      </div>
    </div>
  );
};

const TypingIndicator = ({ typingUsers, currentUserId }) => {
  const others = Object.entries(typingUsers || {}).filter(
    ([uid, isTyping]) => isTyping && uid !== String(currentUserId)
  );
  if (!others.length) return null;
  const label = others.length === 1 ? 'typing…' : `${others.length} people typing…`;
  return (
    <div className="cd-typing">
      <div className="cd-typing-bubble">
        <div className="cd-typing-dot" /><div className="cd-typing-dot" /><div className="cd-typing-dot" />
      </div>
      <span className="cd-typing-label">{label}</span>
    </div>
  );
};

const SkeletonMessages = () => (
  <>
    {[120, 200, 90, 160, 240, 80].map((w, i) => (
      <div key={i} className={`cd-skel-row${i % 2 === 0 ? '' : ' right'}`}>
        {i % 2 === 0 && <div className="cd-skel-av" />}
        <div className="cd-skel-msg" style={{ width: w }} />
      </div>
    ))}
  </>
);

const DateSeparator = ({ label }) => (
  <div className="cd-date-sep">
    <div className="cd-date-sep-line" />
    <div className="cd-date-sep-label">{label}</div>
    <div className="cd-date-sep-line" />
  </div>
);

const OverflowMenu = ({ onClose, items }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div className="cd-overflow-menu" ref={ref} role="menu">
      {items.map((item, i) => (
        <button key={i} className={`cd-overflow-item${item.danger ? ' danger' : ''}`}
          role="menuitem"
          onClick={() => { item.onClick(); onClose(); }}>
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  );
};

const MessageRow = React.memo(({ index, style, data }) => {
  const { messagesWithSeps, conversationId, currentUserId, onAction, setRowHeight } = data;
  const item = messagesWithSeps[index];
  if (!item) return null;
  if (item.type === 'separator') {
    return <div style={style}><DateSeparator label={item.label} /></div>;
  }
  return (
    <div style={style}>
      <MessageBubble
        message={item.msg}
        conversationId={conversationId}
        currentUserId={currentUserId}
        onAction={onAction}
        onHeightChange={h => setRowHeight(index, h)}
      />
    </div>
  );
});

// ─── Main ChatDetail Component ────────────────────────────────────────────
const ChatDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const currentUserId = useUserStore(s => s.user?.id);
  const { isDark } = useTheme();

  const {
    setActiveConversation, messagesByConversation, setMessages, upsertMessage,
    cursors, setCursor, isOnline, offlineQueue, addToOfflineQueue, syncOfflineQueue,
    rateLimit, typingUsers, presence, conversations, updateConversation,
    fetchRateLimit, syncRateLimitFromServer, setConversations,
  } = useChatStore();

  const messages = messagesByConversation[conversationId] || [];
  const scrollRef = useRef(null);
  const rowHeights = useRef({});
  const totalHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const [listRef, setListRef] = useState(null);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRateLimit, setShowRateLimit] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [ListComponent, setListComponent] = useState(null);
  const [showFab, setShowFab] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Local blocked state for instant UI updates
  const [blockedState, setBlockedState] = useState(false);

  const { type, data: modalData, open, close } = useMessageActions();
  const { sendMessage: wsSend, sendTyping, isConnected } = useWebSocket(conversationId);
  const storeActionsRef = useRef({});
  storeActionsRef.current = { upsertMessage, setCursor, setMessages, updateConversation, setConversations };

  const messagesContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(0);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const updateHeight = () => setListHeight(el.clientHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    import('react-window').then(mod => {
      const List = mod.VariableSizeList || mod.default?.VariableSizeList;
      if (List) setListComponent(() => List);
    }).catch(() => { });
  }, []);

  // ─── Conversation metadata ────────────────────────────────────────────
  const conversation = useMemo(() => {
    return conversations?.find(c => String(c.id) === String(conversationId));
  }, [conversations, conversationId]);

  // Sync local blockedState with the store value
  useEffect(() => {
    setBlockedState(conversation?.is_blocked || false);
  }, [conversation?.is_blocked]);

  const otherUserId = useMemo(() => {
    if (conversation?.other_participant) return conversation.other_participant.id;
    if (conversation?.participants) {
      const other = conversation.participants.find(p => String(p.id) !== String(currentUserId));
      return other?.id ?? null;
    }
    return null;
  }, [conversation, currentUserId]);

  const otherUserInfo = useMemo(() => {
    const other = conversation?.other_participant;
    if (other) {
      const name = other.full_name || other.username || 'Unknown';
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return { name, initials };
    }
    if (conversation?.group_name) {
      const name = conversation.group_name;
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return { name, initials };
    }
    if (conversation?.participants) {
      const other = conversation.participants.find(p => String(p.id) !== String(currentUserId));
      if (other) {
        const name = other.full_name || other.username || 'Unknown';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return { name, initials };
      }
    }
    return { name: 'Chat', initials: 'C' };
  }, [conversation, currentUserId]);

  const otherIsOnline = otherUserId ? !!(presence?.[otherUserId]?.online) : false;
  const otherLastSeen = otherUserId ? presence?.[otherUserId]?.lastSeen : null;
  const headerStatusText = useMemo(() => {
    if (otherIsOnline) return 'Active now';
    if (otherLastSeen) {
      const diff = Math.floor((Date.now() - new Date(otherLastSeen).getTime()) / 60000);
      if (diff < 1) return 'Active just now';
      if (diff < 60) return `Active ${diff}m ago`;
      const hrs = Math.floor(diff / 60);
      if (hrs < 24) return `Active ${hrs}h ago`;
      return `Active ${Math.floor(hrs / 24)}d ago`;
    }
    return 'Offline';
  }, [otherIsOnline, otherLastSeen]);

  const isBlocked = blockedState;
  const isMuted = conversation?.is_muted || false;

  const waitForToken = useCallback(() => new Promise(resolve => {
    const t = localStorage.getItem('access_token');
    if (t) { resolve(t); return; }
    let n = 0;
    const id = setInterval(() => { const tok = localStorage.getItem('access_token'); if (tok || ++n > 30) { clearInterval(id); resolve(tok); } }, 100);
  }), []);

  useEffect(() => { setActiveConversation(conversationId); }, [conversationId, setActiveConversation]);

  // ─── Load messages ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      await waitForToken(); setInitialLoading(true); setError(null);
      try {
        const res = await chatApi.getMessages(conversationId);
        if (!cancelled) { setMessages(conversationId, res.data.items, false); if (res.data.next_cursor) setCursor(conversationId, res.data.next_cursor); }
      } catch { if (!cancelled) setError('Could not load messages.'); }
      finally { if (!cancelled) setInitialLoading(false); }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, [conversationId, setMessages, setCursor, waitForToken]);

  // ─── Rate limit ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRateLimit();
    const id = setInterval(fetchRateLimit, 60000);
    return () => clearInterval(id);
  }, [fetchRateLimit]);

  useEffect(() => { if (currentUserId) fetchRateLimit(); }, [currentUserId, fetchRateLimit]);
  useEffect(() => { if (isConnected) fetchRateLimit(); }, [isConnected, fetchRateLimit]);

  const rateLimitRef = useRef(rateLimit);
  useEffect(() => { rateLimitRef.current = rateLimit; }, [rateLimit]);

  useEffect(() => {
    if (rateLimit && rateLimit.remaining === 0) setShowRateLimit(true);
  }, [rateLimit]);

  // ─── Scroll handling ──────────────────────────────────────────────────
  const getItemSize = useCallback(index => rowHeights.current[index] || 80, []);
  const setRowHeight = useCallback((index, height) => {
    const old = rowHeights.current[index] || 0;
    if (old !== height) { rowHeights.current[index] = height; totalHeightRef.current += height - old; listRef?.resetAfterIndex(index); }
  }, [listRef]);

  useEffect(() => {
    if (listRef && messages.length > 0 && isNearBottomRef.current) listRef.scrollToItem(messages.length - 1, 'end');
    if (scrollRef.current && isNearBottomRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, listRef]);

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (scrollUpdateWasRequested) return;
    if (scrollOffset < 200 && cursors[conversationId] && !loadingOlder) loadOlderMessages();
    const totalH = totalHeightRef.current;
    const near = scrollOffset + listHeight >= totalH - 120;
    isNearBottomRef.current = near;
    setShowFab(!near);
  }, [cursors, conversationId, loadingOlder, listHeight]);

  const handleFallbackScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop < 200 && cursors[conversationId] && !loadingOlder) loadOlderMessages();
    const near = scrollHeight - scrollTop - clientHeight < 120;
    isNearBottomRef.current = near;
    setShowFab(!near);
  }, [cursors, conversationId, loadingOlder]);

  const scrollToBottom = useCallback(() => {
    if (listRef) listRef.scrollToItem(messages.length - 1, 'end');
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setShowFab(false);
  }, [listRef, messages.length]);

  const loadOlderMessages = useCallback(async () => {
    const cursor = cursors[conversationId];
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await chatApi.getMessages(conversationId, cursor);
      storeActionsRef.current.setMessages(conversationId, res.data.items, true);
      storeActionsRef.current.setCursor(conversationId, res.data.next_cursor || null);
    } catch { /* silent */ } finally { setLoadingOlder(false); }
  }, [conversationId, cursors, loadingOlder]);

  // ─── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (text, attachments = [], duration = null) => {
    if (!currentUserId || (!text.trim() && attachments.length === 0)) return;
    if (isBlocked) { toast.error('Cannot send message to a blocked user.'); return; }
    const prevRate = rateLimitRef.current;
    if (prevRate && prevRate.remaining === 0) { setShowRateLimit(true); return; }

    const clientMsgId = uuidv4();
    const tempMessage = {
      id: `temp-${clientMsgId}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      msg_type: attachments.length > 0 ? (attachments[0].type || 'IMAGE') : 'TEXT',
      status: 'pending',
      is_edited: false,
      created_at: new Date().toISOString(),
      client_msg_id: clientMsgId,
      reply_to_id: replyingTo?.id ?? null
    };
    upsertMessage(conversationId, tempMessage);
    setReplyingTo(null);

    if (prevRate) {
      useChatStore.setState({ rateLimit: { ...prevRate, remaining: prevRate.remaining - 1 } });
    }

    const payload = {
      content: text,
      client_msg_id: clientMsgId,
      reply_to_id: replyingTo?.id ?? undefined
    };
    if (attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        file_url: a.file_url,
        file_name: a.file_name,
        file_size: a.file_size,
        file_mime_type: a.file_mime_type,
        msg_type: a.type || 'FILE',
        ...(a.type === 'VOICE' && duration != null ? { duration } : {})
      }));
      payload.file_url = attachments[0].file_url;
      payload.msg_type = attachments[0].type || 'IMAGE';
      if (attachments[0].type === 'VOICE' && duration != null) payload.duration = duration;
    }

    const sendViaRest = async () => {
      try {
        const res = await chatApi.sendMessage(conversationId, payload);
        if (res?.data) {
          storeActionsRef.current.upsertMessage(conversationId, res.data.message || res.data);
          if (res.data?.rate_limit) {
            const rl = res.data.rate_limit;
            useChatStore.setState({ rateLimit: { used: rl.used, limit: rl.limit, remaining: rl.remaining, reset_at: rl.reset_at } });
          }
        }
      } catch (err) {
        if (prevRate) useChatStore.setState({ rateLimit: prevRate });
        if (!err.response || err.response?.status >= 500) {
          addToOfflineQueue({ ...tempMessage, payload, conversation_id: conversationId });
        } else {
          toast.error('Failed to send message');
        }
      }
    };

    try {
      if (isOnline) {
        const sentViaWs = wsSend?.(payload);
        if (!sentViaWs) await sendViaRest();
      } else {
        addToOfflineQueue({ ...tempMessage, payload, conversation_id: conversationId });
      }
    } catch { await sendViaRest(); }
  }, [currentUserId, conversationId, wsSend, isOnline, rateLimit, upsertMessage, addToOfflineQueue, replyingTo, isBlocked]);

  // ─── Delete, Forward, Report ──────────────────────────────────────────
  const handleDelete = useCallback(async (message, mode) => {
    try {
      await chatApi.deleteMessage(message.id, mode);
      useChatStore.getState().deleteMessageLocally(conversationId, message.id, mode);
      toast.success('Message deleted');
      close();
    } catch { toast.error('Delete failed'); }
  }, [conversationId, close]);

  const handleForward = useCallback(async (targetConvIds) => {
    try {
      await chatApi.forwardMessage(modalData.id, targetConvIds);
      toast.success('Message forwarded');
      close();
    } catch { toast.error('Forward failed'); }
  }, [modalData, close]);

  const handleReport = useCallback(async (reason, description) => {
    try {
      await chatApi.submitReport({
        message_id: modalData.id,
        reported_user_id: modalData.sender_id,
        reason,
        description
      });
      toast.success('Report submitted');
      close();
    } catch { toast.error('Report failed'); }
  }, [modalData, close]);

  const handleReply = useCallback(message => { setReplyingTo(message); close(); }, [close]);

  const handleRetry = useCallback(async message => {
    const payload = message.payload || { content: message.content, client_msg_id: message.client_msg_id };
    try {
      const res = await chatApi.sendMessage(conversationId, payload);
      if (res?.data) {
        storeActionsRef.current.upsertMessage(conversationId, res.data.message || res.data);
        if (res.data?.rate_limit) {
          const rl = res.data.rate_limit;
          useChatStore.setState({ rateLimit: { used: rl.used, limit: rl.limit, remaining: rl.remaining, reset_at: rl.reset_at } });
        }
      }
    } catch { /* keep failed state */ }
  }, [conversationId]);

  const handleMessageAction = useCallback((actionType, message) => {
    switch (actionType) {
      case 'reply': handleReply(message); break;
      case 'retry': handleRetry(message); break;
      case 'delete': open('delete', message); break;
      case 'forward': open('forward', message); break;
      case 'report': open('report', message); break;
      default: break;
    }
  }, [handleReply, handleRetry, open]);

  const handleJumpToMessage = useCallback((msg) => {
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx >= 0 && listRef) listRef.scrollToItem(idx, 'center');
  }, [messages, listRef]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) syncOfflineQueue();
  }, [isOnline, offlineQueue.length, syncOfflineQueue]);

  const messagesWithSeps = useMemo(() => {
    const result = [];
    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      if (!isSameDay(prev?.created_at, msg.created_at))
        result.push({ type: 'separator', label: getDateLabel(msg.created_at), key: `sep-${i}` });
      result.push({ type: 'message', msg, index: i });
    });
    return result;
  }, [messages]);

  const itemData = useMemo(() => ({
    messagesWithSeps, conversationId, currentUserId, onAction: handleMessageAction, setRowHeight
  }), [messagesWithSeps, conversationId, currentUserId, handleMessageAction, setRowHeight]);

  // ─── Toggle Mute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    try {
      const res = await chatApi.toggleMute(conversationId);
      if (res.data?.muted !== undefined) {
        updateConversation(conversationId, { is_muted: res.data.muted });
        toast.success(res.data.muted ? 'Notifications muted' : 'Notifications unmuted');
      }
    } catch { toast.error('Failed to toggle mute'); }
  }, [conversationId, updateConversation]);

  // ─── Refresh conversations ────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    try {
      const res = await chatApi.getConversations('all', null);
      const items = res.data?.results ?? res.data ?? [];
      setConversations(items);
    } catch (err) { console.warn('Failed to refresh conversations:', err); }
  }, [setConversations]);

  // ─── Block / Unblock ──────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    if (!otherUserId) return;
    setBlockedState(true);
    updateConversation(conversationId, { is_blocked: true });
    try {
      await chatApi.blockUser(otherUserId);
      toast.success('User blocked');
      await refreshConversations();
      navigate('/chats');
    } catch {
      setBlockedState(false);
      updateConversation(conversationId, { is_blocked: false });
      toast.error('Failed to block user');
    }
  }, [otherUserId, conversationId, updateConversation, refreshConversations, navigate]);

  const handleUnblock = useCallback(async () => {
    if (!otherUserId) return;
    setBlockedState(false);
    updateConversation(conversationId, { is_blocked: false });
    try {
      await chatApi.unblockUser(otherUserId);
      toast.success('User unblocked');
      await refreshConversations();
    } catch {
      setBlockedState(true);
      updateConversation(conversationId, { is_blocked: true });
      toast.error('Failed to unblock user');
    }
  }, [otherUserId, conversationId, updateConversation, refreshConversations]);

  // ─── Overflow menu ────────────────────────────────────────────────────
  const overflowItems = useMemo(() => {
    const base = [
      {
        label: 'Search in chat',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>,
        onClick: () => setShowSearch(true)
      },
      {
        label: isMuted ? 'Unmute notifications' : 'Mute notifications',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>,
        onClick: toggleMute
      }
    ];

    if (isBlocked) {
      base.push({
        label: 'Unblock user',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" /></svg>,
        onClick: handleUnblock,
      });
    } else {
      base.push({
        label: 'Block user',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" /></svg>,
        onClick: () => setShowBlockConfirm(true),
        danger: true,
      });
    }
    return base;
  }, [isMuted, isBlocked, toggleMute, handleUnblock]);

  // ─── Loading / error ──────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className={`cd-root${isDark ? ' dark' : ''}`}>
        <div className="cd-bg" />
        <div className="cd-header">
          <button className="cd-back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <div className="cd-av-wrap">
            <div className="cd-avatar" style={{ background: 'var(--chat-skeleton)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 120, height: 13, borderRadius: 6, background: 'var(--chat-skeleton)', marginBottom: 6 }} />
            <div style={{ width: 70, height: 10, borderRadius: 5, background: 'var(--chat-skeleton)' }} />
          </div>
        </div>
        <div className="cd-messages">
          <div className="cd-state-box"><SkeletonMessages /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`cd-root${isDark ? ' dark' : ''}`}>
        <div className="cd-bg" />
        <div className="cd-messages">
          <div className="cd-state-box">
            <span className="cd-state-icon">⚠️</span>
            <span className="cd-error-text">{error}</span>
            <button className="cd-retry-btn" onClick={() => {
              setError(null); setInitialLoading(true);
              chatApi.getMessages(conversationId)
                .then(res => { setMessages(conversationId, res.data.items, false); if (res.data.next_cursor) setCursor(conversationId, res.data.next_cursor); })
                .catch(() => setError('Could not load messages.'))
                .finally(() => setInitialLoading(false));
            }}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className={`cd-root${isDark ? ' dark' : ''}`}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="cd-bg" />

      {/* ── Modals ── */}
      {showRateLimit && <RateLimitModal rateLimit={rateLimit} onDismiss={() => setShowRateLimit(false)} />}
      {type === 'delete' && (
        <DeleteConfirmation
          message={modalData}
          isOwn={modalData?.sender_id === currentUserId}
          onDelete={mode => handleDelete(modalData, mode)}
          onClose={close}
        />
      )}
      {type === 'forward' && <ForwardModal message={modalData} onClose={close} onForward={handleForward} />}
      {type === 'report' && <ReportModal message={modalData} onClose={close} onSubmit={handleReport} />}
      {showSearch && (
        <ChatSearchModal
          conversationId={conversationId}
          onClose={() => setShowSearch(false)}
          onJumpToMessage={handleJumpToMessage}
        />
      )}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Block {otherUserInfo.name}?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              You won't receive their messages anymore. You can unblock them anytime from the overflow menu.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={() => { setShowBlockConfirm(false); handleBlock(); }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Block</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        </button>
        <div className="cd-av-wrap">
          <div className="cd-avatar">{otherUserInfo.initials}</div>
          <span className={`cd-presence-dot ${otherIsOnline ? 'online' : 'offline'}`} />
        </div>
        <div className="cd-header-info">
          <div className="cd-header-name">{otherUserInfo.name}</div>
          <div className={`cd-header-status${otherIsOnline ? ' online' : ''}`}>
            <div className="cd-header-status-pulse" />
            {headerStatusText}
          </div>
        </div>
        <button className="cd-overflow-btn" onClick={() => setShowOverflow(v => !v)} aria-label="More options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
        </button>
        {showOverflow && <OverflowMenu items={overflowItems} onClose={() => setShowOverflow(false)} />}
      </div>

      {/* ── Banners ── */}
      {!isOnline && <div className="cd-banner offline">📵 No internet — messages queue and send when you're back</div>}
      {!isConnected && isOnline && <div className="cd-banner warn">⟳ Reconnecting to live updates…</div>}

      {/* ── Messages area ── */}
      <div className="cd-messages" ref={messagesContainerRef}>
        {loadingOlder && (
          <div className="cd-load-earlier">
            <button className="cd-load-earlier-btn" disabled>Loading…</button>
          </div>
        )}

        {messagesWithSeps.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">👋</div>
            <div className="cd-empty-title">Start the conversation</div>
            <div className="cd-empty-sub">Share ideas, ask questions, and connect instantly.</div>
          </div>
        ) : ListComponent && listHeight > 0 ? (
          <ListComponent
            ref={ref => setListRef(ref)}
            height={listHeight}
            itemCount={messagesWithSeps.length}
            itemSize={getItemSize}
            width="100%"
            estimatedItemSize={80}
            onScroll={handleScroll}
            itemKey={index => messagesWithSeps[index]?.key || messagesWithSeps[index]?.msg?.id || index}
            itemData={itemData}
          >
            {MessageRow}
          </ListComponent>
        ) : (
          <div
            style={{ height: listHeight || '100%', overflowY: 'auto' }}
            ref={scrollRef}
            onScroll={handleFallbackScroll}
          >
            {messagesWithSeps.map((item, i) =>
              item.type === 'separator' ? (
                <DateSeparator key={item.key} label={item.label} />
              ) : (
                <MessageBubble
                  key={item.msg.id || item.msg.client_msg_id}
                  message={item.msg}
                  conversationId={conversationId}
                  currentUserId={currentUserId}
                  onAction={handleMessageAction}
                  onHeightChange={h => setRowHeight(i, h)}
                />
              )
            )}
          </div>
        )}

        {/* Scroll-to-bottom FAB — inside messages area only */}
        <button
          className={`cd-fab${showFab ? '' : ' hidden'}`}
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
          </svg>
        </button>
      </div>

      {/* ── Typing ── */}
      <TypingIndicator typingUsers={typingUsers} currentUserId={currentUserId} />

      {/* ── Reply bar ── */}
      {replyingTo && (
        <div className="cd-reply-bar">
          <div className="cd-reply-indicator" />
          <div className="cd-reply-content">
            <div className="cd-reply-who">{replyingTo.sender_id === currentUserId ? 'You' : otherUserInfo.name}</div>
            <div className="cd-reply-text">{replyingTo.content}</div>
          </div>
          <button className="cd-reply-cancel" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Blocked banner — centred between messages and composer ── */}
      {isBlocked && (
        <div className="cd-blocked-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" />
          </svg>
          You've blocked this user · messages are paused ·&nbsp;
          <button
            onClick={handleUnblock}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--chat-danger)', fontWeight: 700,
              fontSize: 'inherit', padding: 0, textDecoration: 'underline',
            }}
          >
            Unblock
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="cd-composer-wrap">
        <MessageComposer
          onSend={handleSend}
          onTyping={sendTyping}
          conversationId={conversationId}
          replyingTo={replyingTo}
          disabled={rateLimit?.remaining === 0}
          rateLimit={rateLimit}
          isBlocked={isBlocked}
        />
      </div>
    </div>
  );
};

export default ChatDetail;