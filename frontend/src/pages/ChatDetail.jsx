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
import MessageBubble from '@/components/chat/MessageBubble';
import MessageComposer from '@/components/chat/MessageComposer';
import ForwardModal from '@/components/chat/ForwardModal';
import DeleteConfirmation from '@/components/chat/DeleteConfirmation';
import toast from 'react-hot-toast';

// ─── CSS ──────────────────────────────────────────────────────────────────
const CSS = `
  /* ── Reset & root ── */
  .cd-root {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* ── Theme tokens ── */
  @media (prefers-color-scheme: dark) {
    .cd-root {
      --bg:          #0d0f16;
      --bg2:         #131720;
      --surface:     #1a1e2e;
      --surface2:    #1f2540;
      --border:      #252c42;
      --text:        #e8eaf0;
      --text2:       #8b92a8;
      --text3:       #5a6180;
      --accent:      #6c63ff;
      --accent-soft: rgba(108,99,255,0.15);
      --online:      #22c55e;
      --online-ring: rgba(34,197,94,0.25);
      --offline:     #64748b;
      --danger:      #ef4444;
      --warn-bg:     rgba(245,158,11,0.12);
      --warn-text:   #fbbf24;
      --offline-bg:  rgba(239,68,68,0.1);
      --offline-text:#f87171;
      --skeleton:    #1a1e2e;
      --skeleton2:   #252c42;
      --glass-bg:    rgba(19,23,32,0.85);
      --glass-border:rgba(255,255,255,0.06);
      --sep-line:    rgba(255,255,255,0.07);
      --sep-text:    #4a5268;
      --shadow:      rgba(0,0,0,0.5);
      --fab-bg:      #6c63ff;
      --fab-shadow:  rgba(108,99,255,0.4);
      --composer-bg: rgba(19,23,32,0.95);
    }
  }
  @media (prefers-color-scheme: light) {
    .cd-root {
      --bg:          #f0f2f8;
      --bg2:         #e8eaf2;
      --surface:     #ffffff;
      --surface2:    #f8f9fc;
      --border:      #e2e5ef;
      --text:        #0f1523;
      --text2:       #5a6180;
      --text3:       #9ba3bf;
      --accent:      #6c63ff;
      --accent-soft: rgba(108,99,255,0.1);
      --online:      #16a34a;
      --online-ring: rgba(22,163,74,0.2);
      --offline:     #94a3b8;
      --danger:      #dc2626;
      --warn-bg:     #fffbeb;
      --warn-text:   #d97706;
      --offline-bg:  #fef2f2;
      --offline-text:#dc2626;
      --skeleton:    #eceef5;
      --skeleton2:   #d8dbe8;
      --glass-bg:    rgba(255,255,255,0.88);
      --glass-border:rgba(0,0,0,0.07);
      --sep-line:    rgba(0,0,0,0.07);
      --sep-text:    #9ba3bf;
      --shadow:      rgba(0,0,0,0.08);
      --fab-bg:      #6c63ff;
      --fab-shadow:  rgba(108,99,255,0.35);
      --composer-bg: rgba(255,255,255,0.95);
    }
  }

  /* ── Background ── */
  .cd-bg {
    position: absolute;
    inset: 0;
    background: var(--bg);
    z-index: 0;
  }
  /* subtle dot grid */
  .cd-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, var(--sep-line) 1px, transparent 1px);
    background-size: 24px 24px;
    opacity: 0.6;
    pointer-events: none;
  }

  /* ── Glass Header ── */
  .cd-header {
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px) saturate(1.6);
    -webkit-backdrop-filter: blur(20px) saturate(1.6);
    border-bottom: 1px solid var(--glass-border);
    box-shadow: 0 1px 24px var(--shadow);
    min-height: 64px;
  }

  /* Back button */
  .cd-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text2);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s, transform 0.1s;
  }
  .cd-back-btn:hover {
    background: var(--accent-soft);
    color: var(--accent);
    transform: translateX(-2px);
  }
  .cd-back-btn:active { transform: scale(0.92); }

  /* Avatar with presence ring */
  .cd-av-wrap {
    position: relative;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
  }
  .cd-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #a855f7 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 12px rgba(108,99,255,0.3);
    user-select: none;
  }
  .cd-presence-dot {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 2.5px solid var(--surface);
    position: absolute;
    bottom: 0;
    right: 0;
    transition: background 0.3s;
  }
  .cd-presence-dot.online  { background: var(--online); box-shadow: 0 0 0 3px var(--online-ring); }
  .cd-presence-dot.offline { background: var(--offline); }

  /* Header info */
  .cd-header-info {
    flex: 1;
    min-width: 0;
  }
  .cd-header-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-header-status {
    font-size: 12px;
    color: var(--text3);
    margin-top: 1px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .cd-header-status.online { color: var(--online); }
  .cd-header-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--online);
    animation: cd-pulse 2s infinite;
    display: none;
  }
  .cd-header-status.online .cd-header-status-pulse { display: block; }
  @keyframes cd-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.75); }
  }

  /* Overflow menu */
  .cd-overflow-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .cd-overflow-btn:hover { background: var(--accent-soft); color: var(--accent); }

  /* Overflow dropdown */
  .cd-overflow-menu {
    position: absolute;
    top: 58px;
    right: 12px;
    z-index: 100;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 8px 32px var(--shadow);
    padding: 6px;
    min-width: 180px;
    animation: cd-pop 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes cd-pop {
    from { opacity: 0; transform: scale(0.9) translateY(-8px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }
  .cd-overflow-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 9px;
    cursor: pointer;
    font-size: 13.5px;
    color: var(--text);
    transition: background 0.1s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
  }
  .cd-overflow-item:hover { background: var(--accent-soft); }
  .cd-overflow-item.danger { color: var(--danger); }
  .cd-overflow-item.danger:hover { background: rgba(239,68,68,0.1); }
  .cd-overflow-item svg { flex-shrink: 0; opacity: 0.8; }

  /* ── Banners ── */
  .cd-banner {
    position: relative;
    z-index: 15;
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
  }
  .cd-banner.offline {
    background: var(--offline-bg);
    color: var(--offline-text);
    border-bottom: 1px solid rgba(239,68,68,0.15);
  }
  .cd-banner.warn {
    background: var(--warn-bg);
    color: var(--warn-text);
    border-bottom: 1px solid rgba(245,158,11,0.15);
  }

  /* ── Messages area ── */
  .cd-messages {
    position: relative;
    z-index: 5;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .cd-load-earlier {
    display: flex;
    justify-content: center;
    padding: 10px 0 4px;
    position: relative;
    z-index: 2;
  }
  .cd-load-earlier-btn {
    padding: 6px 16px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid rgba(108,99,255,0.2);
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .cd-load-earlier-btn:hover  { background: rgba(108,99,255,0.2); transform: translateY(-1px); }
  .cd-load-earlier-btn:active { transform: scale(0.96); }

  /* ── Date Separator ── */
  .cd-date-sep {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    pointer-events: none;
    user-select: none;
  }
  .cd-date-sep-line {
    flex: 1;
    height: 1px;
    background: var(--sep-line);
  }
  .cd-date-sep-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    color: var(--sep-text);
    text-transform: uppercase;
    padding: 3px 10px;
    background: var(--bg2);
    border-radius: 20px;
    border: 1px solid var(--sep-line);
    white-space: nowrap;
  }

  /* ── Empty state ── */
  .cd-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 10px;
    padding: 40px 24px;
    text-align: center;
  }
  .cd-empty-icon {
    font-size: 48px;
    line-height: 1;
    margin-bottom: 4px;
    animation: cd-wave 2.5s ease infinite;
  }
  @keyframes cd-wave {
    0%, 100% { transform: rotate(0deg); }
    15%       { transform: rotate(16deg); }
    30%       { transform: rotate(-10deg); }
    45%       { transform: rotate(12deg); }
    60%       { transform: rotate(-6deg); }
    75%       { transform: rotate(8deg); }
  }
  .cd-empty-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .cd-empty-sub {
    font-size: 13.5px;
    color: var(--text3);
    line-height: 1.5;
    max-width: 240px;
  }

  /* ── Floating Scroll-to-Bottom FAB ── */
  .cd-fab {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 30;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--fab-bg);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px var(--fab-shadow);
    transition: opacity 0.2s, transform 0.2s;
  }
  .cd-fab:hover  { transform: translateY(-2px) scale(1.05); }
  .cd-fab:active { transform: scale(0.92); }
  .cd-fab.hidden { opacity: 0; pointer-events: none; transform: translateY(8px) scale(0.9); }

  /* ── Typing indicator ── */
  .cd-typing {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 20px 2px;
    position: relative;
    z-index: 10;
  }
  .cd-typing-bubble {
    display: flex;
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 7px 12px;
    box-shadow: 0 2px 8px var(--shadow);
  }
  .cd-typing-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text3);
    animation: cd-dots 1.2s infinite;
  }
  .cd-typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .cd-typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes cd-dots {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40%           { transform: scale(1);   opacity: 1;   }
  }
  .cd-typing-label { font-size: 12px; color: var(--text3); }

  /* ── Reply bar ── */
  .cd-reply-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: var(--surface2);
    border-top: 1px solid var(--border);
    position: relative;
    z-index: 12;
  }
  .cd-reply-indicator {
    width: 3px;
    height: 36px;
    border-radius: 2px;
    background: var(--accent);
    flex-shrink: 0;
  }
  .cd-reply-content { flex: 1; min-width: 0; }
  .cd-reply-who {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 1px;
  }
  .cd-reply-text {
    font-size: 12.5px;
    color: var(--text3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-reply-cancel {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: var(--border);
    color: var(--text3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .cd-reply-cancel:hover { background: rgba(239,68,68,0.15); color: var(--danger); }

  /* ── Floating Composer ── */
  .cd-composer-wrap {
    position: relative;
    z-index: 20;
    padding: 8px 12px 12px;
    background: var(--composer-bg);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-top: 1px solid var(--glass-border);
  }

  /* ── Skeleton ── */
  .cd-skel-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 16px;
  }
  .cd-skel-row.right { flex-direction: row-reverse; }
  .cd-skel-av {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--skeleton);
    flex-shrink: 0;
  }
  .cd-skel-msg {
    height: 40px;
    border-radius: 18px;
    background: var(--skeleton);
    overflow: hidden;
    position: relative;
  }
  .cd-skel-msg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, var(--skeleton2) 50%, transparent 100%);
    animation: cd-shimmer 1.5s infinite;
  }
  @keyframes cd-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* ── State boxes ── */
  .cd-state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 10px;
    color: var(--text3);
    font-size: 14px;
  }
  .cd-state-icon { font-size: 40px; opacity: 0.4; }
  .cd-error-text { color: var(--danger); }
  .cd-retry-btn {
    padding: 8px 20px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    margin-top: 4px;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cd-retry-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
  .cd-retry-btn:active { transform: scale(0.96); }

  /* ── Rate limit overlay ── */
  .cd-rate-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    backdrop-filter: blur(4px);
  }
  .cd-rate-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 28px 24px;
    max-width: 320px;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 60px var(--shadow);
  }
  .cd-rate-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .cd-rate-body  { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 20px; }
  .cd-rate-dismiss {
    padding: 10px 24px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.15s;
  }
  .cd-rate-dismiss:hover { opacity: 0.88; }
`;

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
        <div className="cd-typing-dot" />
        <div className="cd-typing-dot" />
        <div className="cd-typing-dot" />
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
    <div className="cd-overflow-menu" ref={ref}>
      {items.map((item, i) => (
        <button key={i} className={`cd-overflow-item${item.danger ? ' danger' : ''}`}
          onClick={() => { item.onClick(); onClose(); }}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};

// ─── Main ChatDetail Component ────────────────────────────────────────────
const ChatDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const currentUserId = useUserStore(s => s.user?.id);

  const {
    setActiveConversation, messagesByConversation, setMessages, upsertMessage,
    cursors, setCursor, isOnline, offlineQueue, addToOfflineQueue, syncOfflineQueue,
    rateLimit, typingUsers, presence, conversations,
  } = useChatStore();

  const messages = messagesByConversation[conversationId] || [];
  const scrollRef = useRef(null);
  const rowHeights = useRef({});
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

  const { type, data, open, close } = useMessageActions();
  const { sendMessage: wsSend, sendTyping, isConnected } = useWebSocket(conversationId);
  const storeActionsRef = useRef({});
  storeActionsRef.current = { upsertMessage, setCursor, setMessages };

  // Dynamic import react-window
  useEffect(() => {
    import('react-window').then(mod => {
      const List = mod.VariableSizeList || mod.default?.VariableSizeList;
      if (List) setListComponent(() => List);
    }).catch(() => { });
  }, []);

  // Conversation metadata
  const conversation = useMemo(
    () => conversations?.find(c => String(c.id) === String(conversationId)),
    [conversations, conversationId]
  );

  const otherUserId = useMemo(() => {
    if (!conversation?.participants) return null;
    return conversation.participants.find(p => String(p.id) !== String(currentUserId))?.id ?? null;
  }, [conversation, currentUserId]);

  const otherUserInfo = useMemo(() => {
    if (!conversation?.participants) return { name: 'Chat', initials: 'C' };
    const other = conversation.participants.find(p => String(p.id) !== String(currentUserId));
    if (!other) return { name: 'Chat', initials: 'C' };
    const name = other.full_name || other.username || 'Unknown';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return { name, initials };
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

  // Token guard
  const waitForToken = useCallback(() => new Promise(resolve => {
    const t = localStorage.getItem('access_token');
    if (t) { resolve(t); return; }
    let n = 0;
    const id = setInterval(() => {
      const tok = localStorage.getItem('access_token');
      if (tok || ++n > 30) { clearInterval(id); resolve(tok); }
    }, 100);
  }), []);

  useEffect(() => {
    setActiveConversation(conversationId);
  }, [conversationId, setActiveConversation]);

  // Load initial messages
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      await waitForToken();
      setInitialLoading(true); setError(null);
      try {
        const res = await chatApi.getMessages(conversationId);
        if (!cancelled) {
          setMessages(conversationId, res.data.items, false);
          if (res.data.next_cursor) setCursor(conversationId, res.data.next_cursor);
        }
      } catch {
        if (!cancelled) setError('Could not load messages.');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, [conversationId, setMessages, setCursor, waitForToken]);

  useEffect(() => {
    if (rateLimit && rateLimit.remaining === 0) setShowRateLimit(true);
  }, [rateLimit]);

  // Row heights for VariableSizeList
  const getItemSize = useCallback(index => rowHeights.current[index] || 80, []);
  const setRowHeight = useCallback((index, height) => {
    if (rowHeights.current[index] !== height) {
      rowHeights.current[index] = height;
      listRef?.resetAfterIndex(index);
    }
  }, [listRef]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef && messages.length > 0 && isNearBottomRef.current) {
      listRef.scrollToItem(messages.length - 1, 'end');
    }
    // For fallback scroll container
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, listRef]);

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (scrollUpdateWasRequested) return;
    const totalHeight = Object.values(rowHeights.current).reduce((s, h) => typeof h === 'number' ? s + h : s, 0);
    const visibleH = window.innerHeight - 190;
    const near = scrollOffset + visibleH >= totalHeight - 120;
    isNearBottomRef.current = near;
    setShowFab(!near);
  }, []);

  const handleFallbackScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const near = scrollHeight - scrollTop - clientHeight < 120;
    isNearBottomRef.current = near;
    setShowFab(!near);
  }, []);

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

  const handleSend = useCallback(async (text, attachments = [], duration = null) => {
    if (!currentUserId || (!text.trim() && attachments.length === 0)) return;
    if (rateLimit && rateLimit.remaining === 0) { setShowRateLimit(true); return; }

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
      reply_to_id: replyingTo?.id ?? null,
    };

    upsertMessage(conversationId, tempMessage);
    setReplyingTo(null);

    const payload = {
      content: text, client_msg_id: clientMsgId,
      reply_to_id: replyingTo?.id ?? undefined,
    };

    if (attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        file_url: a.file_url, file_name: a.file_name, file_size: a.file_size,
        file_mime_type: a.file_mime_type, msg_type: a.type || 'FILE',
        ...(a.type === 'VOICE' && duration != null ? { duration } : {}),
      }));
      payload.file_url = attachments[0].file_url;
      payload.msg_type = attachments[0].type || 'IMAGE';
      if (attachments[0].type === 'VOICE' && duration != null) payload.duration = duration;
    }

    const sendViaRest = async () => {
      try {
        const res = await chatApi.sendMessage(conversationId, payload);
        if (res?.data) storeActionsRef.current.upsertMessage(conversationId, res.data);
      } catch (err) {
        if (!err.response || err.response?.status >= 500)
          addToOfflineQueue({ ...tempMessage, payload, conversation_id: conversationId });
      }
    };

    if (isOnline) {
      const sentViaWs = wsSend?.(payload);
      if (!sentViaWs) await sendViaRest();
    } else {
      addToOfflineQueue({ ...tempMessage, payload, conversation_id: conversationId });
    }
  }, [conversationId, currentUserId, wsSend, isOnline, rateLimit, upsertMessage, addToOfflineQueue, replyingTo]);

  // Action handlers
  const handleDelete = useCallback(async (message, mode) => {
    try {
      await chatApi.deleteMessage(message.id, mode);
      useChatStore.getState().deleteMessageLocally(conversationId, message.id, mode);
      toast.success('Message deleted'); close();
    } catch { toast.error('Delete failed'); }
  }, [conversationId, close]);

  const handleForward = useCallback(async (targetConvIds) => {
    try {
      await chatApi.forwardMessage(data.id, targetConvIds);
      toast.success('Message forwarded'); close();
    } catch { toast.error('Forward failed'); }
  }, [data, close]);

  const handleReport = useCallback(async (reason, description) => {
    try {
      await chatApi.submitReport({ message_id: data.id, reported_user_id: data.sender_id, reason, description });
      toast.success('Report submitted'); close();
    } catch { toast.error('Report failed'); }
  }, [data, close]);

  const handleReply = useCallback(message => { setReplyingTo(message); close(); }, [close]);

  const handleRetry = useCallback(async message => {
    const payload = message.payload || { content: message.content, client_msg_id: message.client_msg_id };
    try {
      const res = await chatApi.sendMessage(conversationId, payload);
      if (res?.data) storeActionsRef.current.upsertMessage(conversationId, res.data);
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

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) syncOfflineQueue();
  }, [isOnline, offlineQueue.length, syncOfflineQueue]);

  const listHeight = typeof window !== 'undefined' ? window.innerHeight - 190 : 600;

  // Build messages with date separators
  const messagesWithSeps = useMemo(() => {
    const result = [];
    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      if (!isSameDay(prev?.created_at, msg.created_at)) {
        result.push({ type: 'separator', label: getDateLabel(msg.created_at), key: `sep-${i}` });
      }
      result.push({ type: 'message', msg, index: i });
    });
    return result;
  }, [messages]);

  const Row = useCallback(({ index, style }) => {
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
          onAction={handleMessageAction}
          onHeightChange={h => setRowHeight(index, h)}
        />
      </div>
    );
  }, [messagesWithSeps, conversationId, currentUserId, handleMessageAction, setRowHeight]);

  const overflowItems = [
    {
      label: 'View profile',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>,
      onClick: () => { },
    },
    {
      label: 'Search in chat',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>,
      onClick: () => { },
    },
    {
      label: 'Mute notifications',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>,
      onClick: () => { },
    },
    {
      label: 'Block user',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" /></svg>,
      onClick: () => { },
      danger: true,
    },
  ];

  // ── Loading / error states ──
  if (initialLoading) {
    return (
      <div className="cd-root">
        <style>{CSS}</style>
        <div className="cd-bg" />
        <div className="cd-header">
          <button className="cd-back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <div className="cd-av-wrap">
            <div className="cd-avatar" style={{ background: 'var(--skeleton)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--skeleton)', marginBottom: 6 }} />
            <div style={{ width: 70, height: 11, borderRadius: 5, background: 'var(--skeleton)' }} />
          </div>
        </div>
        <div className="cd-messages"><div className="cd-state-box"><SkeletonMessages /></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cd-root">
        <style>{CSS}</style>
        <div className="cd-bg" />
        <div className="cd-messages">
          <div className="cd-state-box">
            <span className="cd-state-icon">⚠️</span>
            <span className="cd-error-text">{error}</span>
            <button className="cd-retry-btn" onClick={() => {
              setError(null); setInitialLoading(true);
              chatApi.getMessages(conversationId)
                .then(res => {
                  setMessages(conversationId, res.data.items, false);
                  if (res.data.next_cursor) setCursor(conversationId, res.data.next_cursor);
                })
                .catch(() => setError('Could not load messages.'))
                .finally(() => setInitialLoading(false));
            }}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-root">
      <style>{CSS}</style>
      <div className="cd-bg" />

      {/* Modals */}
      {showRateLimit && <RateLimitModal rateLimit={rateLimit} onDismiss={() => setShowRateLimit(false)} />}
      {type === 'delete' && (
        <DeleteConfirmation message={data} isOwn={data?.sender_id === currentUserId}
          onDelete={mode => handleDelete(data, mode)} onClose={close} />
      )}
      {type === 'forward' && <ForwardModal message={data} onClose={close} onForward={handleForward} />}
      {type === 'report' && <ReportModal message={data} onClose={close} onSubmit={handleReport} />}

      {/* Premium Glass Header */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
        {showOverflow && <OverflowMenu items={overflowItems} onClose={() => setShowOverflow(false)} />}
      </div>

      {/* Banners */}
      {!isOnline && (
        <div className="cd-banner offline">
          📵 No internet — messages queue and send when you're back
        </div>
      )}
      {!isConnected && isOnline && (
        <div className="cd-banner warn">⟳ Reconnecting to live updates…</div>
      )}

      {/* Messages */}
      <div className="cd-messages">
        {cursors[conversationId] && (
          <div className="cd-load-earlier">
            <button className="cd-load-earlier-btn" onClick={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder ? 'Loading…' : '↑ Earlier messages'}
            </button>
          </div>
        )}

        {messagesWithSeps.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">👋</div>
            <div className="cd-empty-title">Start the conversation</div>
            <div className="cd-empty-sub">
              Share ideas, ask questions, and connect instantly.
            </div>
          </div>
        ) : ListComponent ? (
          <ListComponent
            ref={ref => setListRef(ref)}
            height={listHeight}
            itemCount={messagesWithSeps.length}
            itemSize={getItemSize}
            width="100%"
            estimatedItemSize={80}
            onScroll={handleScroll}
            itemKey={index => messagesWithSeps[index]?.key || messagesWithSeps[index]?.msg?.id || index}
          >
            {Row}
          </ListComponent>
        ) : (
          <div style={{ height: listHeight, overflowY: 'auto' }} ref={scrollRef} onScroll={handleFallbackScroll}>
            {messagesWithSeps.map((item, i) => {
              if (item.type === 'separator') {
                return <DateSeparator key={item.key} label={item.label} />;
              }
              return (
                <MessageBubble
                  key={item.msg.id || item.msg.client_msg_id}
                  message={item.msg}
                  conversationId={conversationId}
                  currentUserId={currentUserId}
                  onAction={handleMessageAction}
                  onHeightChange={h => setRowHeight(i, h)}
                />
              );
            })}
          </div>
        )}

        {/* Scroll-to-bottom FAB */}
        <button
          className={`cd-fab${showFab ? '' : ' hidden'}`}
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
          </svg>
        </button>
      </div>

      {/* Typing */}
      <TypingIndicator typingUsers={typingUsers} currentUserId={currentUserId} />

      {/* Reply bar */}
      {replyingTo && (
        <div className="cd-reply-bar">
          <div className="cd-reply-indicator" />
          <div className="cd-reply-content">
            <div className="cd-reply-who">
              {replyingTo.sender_id === currentUserId ? 'You' : otherUserInfo.name}
            </div>
            <div className="cd-reply-text">{replyingTo.content}</div>
          </div>
          <button className="cd-reply-cancel" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating Composer */}
      <div className="cd-composer-wrap">
        <MessageComposer
          onSend={handleSend}
          onTyping={sendTyping}
          conversationId={conversationId}
          replyingTo={replyingTo}
          disabled={rateLimit?.remaining === 0}
          rateLimit={rateLimit}
        />
      </div>
    </div>
  );
};

export default ChatDetail;