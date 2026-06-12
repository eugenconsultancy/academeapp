import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import DOMPurify from 'dompurify';
import { FiRepeat, FiSmile, FiCopy, FiTrash2, FiShare2, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ─── Comprehensive Styles ─── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    /* Light Mode Colors */
    --chat-bg-light: #ffffff;
    --chat-surface-light: #f8f9fa;
    --chat-bubble-light: #e9ecef;
    --chat-text-light: #212529;
    --chat-muted-light: #6c757d;
    --chat-border-light: #dee2e6;
    --chat-accent-light: #6366f1;
    
    /* Dark Mode Colors */
    --chat-bg-dark: #0f172a;
    --chat-surface-dark: #1e293b;
    --chat-bubble-dark: #334155;
    --chat-text-dark: #f1f5f9;
    --chat-muted-dark: #94a3b8;
    --chat-border-dark: #475569;
    --chat-accent-dark: #818cf8;
    
    /* Active Colors */
    --chat-primary: #6366f1;
    --chat-primary-light: #818cf8;
    --chat-success: #10b981;
    --chat-warning: #f59e0b;
    --chat-error: #ef4444;
    
    /* Set defaults to dark */
    --chat-bg: var(--chat-bg-dark);
    --chat-surface: var(--chat-surface-dark);
    --chat-bubble: var(--chat-bubble-dark);
    --chat-text: var(--chat-text-dark);
    --chat-muted: var(--chat-muted-dark);
    --chat-border: var(--chat-border-dark);
  }

  html.light-mode {
    --chat-bg: var(--chat-bg-light);
    --chat-surface: var(--chat-surface-light);
    --chat-bubble: var(--chat-bubble-light);
    --chat-text: var(--chat-text-light);
    --chat-muted: var(--chat-muted-light);
    --chat-border: var(--chat-border-light);
  }

  * {
    box-sizing: border-box;
  }

  /* ─── Container ─── */
  .chat-container {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--chat-bg);
    transition: background-color 0.3s ease;
    scroll-behavior: smooth;
  }

  /* Scrollbar */
  .chat-container::-webkit-scrollbar {
    width: 8px;
  }

  .chat-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-container::-webkit-scrollbar-thumb {
    background: var(--chat-border);
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .chat-container::-webkit-scrollbar-thumb:hover {
    background: var(--chat-muted);
  }

  /* ─── Date Separator ─── */
  .chat-date-separator {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 32px 16px 20px;
    opacity: 0;
    animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-date-line {
    flex: 1;
    height: 1px;
    background: var(--chat-border);
  }

  .chat-date-badge {
    font-size: 12px;
    font-weight: 600;
    color: var(--chat-muted);
    font-family: 'JetBrains Mono', monospace;
    padding: 6px 14px;
    background: var(--chat-surface);
    border: 1px solid var(--chat-border);
    border-radius: 12px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ─── Message Group ─── */
  .chat-message-group {
    display: flex;
    gap: 12px;
    padding: 2px 16px;
    margin-bottom: 2px;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-group-mine {
    justify-content: flex-end;
  }

  .chat-group-theirs {
    justify-content: flex-start;
  }

  /* ─── Avatar ─── */
  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    flex-shrink: 0;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  }

  .chat-avatar-placeholder {
    width: 32px;
    flex-shrink: 0;
  }

  /* ─── Bubble Container ─── */
  .chat-bubble-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 65%;
    flex: 0 1 auto;
  }

  @media (max-width: 768px) {
    .chat-bubble-wrapper {
      max-width: 80%;
    }
  }

  /* ─── Message Bubble ─── */
  .chat-bubble {
    padding: 12px 16px;
    border-radius: 16px;
    position: relative;
    animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    transition: all 0.2s ease;
    word-break: break-word;
    word-wrap: break-word;
    font-family: 'Inter', sans-serif;
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .chat-bubble-mine {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    color: #ffffff;
    border-radius: 16px 2px 16px 16px;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
  }

  .chat-bubble-mine:hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    transform: translateY(-2px);
  }

  .chat-bubble-theirs {
    background: var(--chat-surface);
    color: var(--chat-text);
    border: 1px solid var(--chat-border);
    border-radius: 2px 16px 16px 16px;
  }

  .chat-bubble-theirs:hover {
    background: var(--chat-bubble);
    border-color: var(--chat-muted);
  }

  .chat-bubble-text {
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .chat-bubble-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .chat-bubble-mine:hover .chat-bubble-footer,
  .chat-bubble-theirs:hover .chat-bubble-footer {
    opacity: 1;
  }

  .chat-time {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .chat-status {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .chat-status-icon {
    font-size: 10px;
    display: flex;
    align-items: center;
  }

  /* ─── File/Voice Messages ─── */
  .chat-file-bubble {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    cursor: pointer;
  }

  .chat-file-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .chat-file-bubble:hover .chat-file-icon {
    transform: scale(1.1);
  }

  .chat-file-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .chat-file-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Inter', sans-serif;
  }

  .chat-file-link {
    text-decoration: none;
    color: inherit;
    opacity: 0.85;
    transition: opacity 0.2s ease;
  }

  .chat-file-link:hover {
    opacity: 1;
    text-decoration: underline;
  }

  .chat-audio {
    max-width: 200px;
    height: 36px;
    border-radius: 12px;
    accent-color: #6366f1;
  }

  /* ─── Actions Toolbar ─── */
  .chat-message-container {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 2px;
  }

  .chat-message-container.mine {
    justify-content: flex-end;
  }

  .chat-message-container:hover .chat-actions-toolbar {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1) translateY(0);
  }

  .chat-actions-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px;
    background: var(--chat-surface);
    border: 1px solid var(--chat-border);
    border-radius: 12px;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.95) translateY(-8px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
    z-index: 20;
    backdrop-filter: blur(10px);
  }

  .chat-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--chat-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }

  .chat-action-btn:hover {
    background: var(--chat-primary);
    color: #ffffff;
    transform: scale(1.05);
  }

  .chat-action-btn:active {
    transform: scale(0.95);
  }

  /* ─── Empty State ─── */
  .chat-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--chat-muted);
    font-family: 'Inter', sans-serif;
    padding: 24px;
  }

  .chat-empty-icon {
    font-size: 64px;
    opacity: 0.5;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  .chat-empty-text {
    font-size: 16px;
    text-align: center;
    font-weight: 500;
  }

  .chat-empty-subtext {
    font-size: 14px;
    color: var(--chat-muted);
    text-align: center;
  }

  /* ─── Highlight Animation ─── */
  .chat-highlight {
    animation: highlightFlash 1.5s ease-out forwards;
  }

  @keyframes highlightFlash {
    0% {
      background-color: rgba(99, 102, 241, 0.2);
    }
    100% {
      background-color: transparent;
    }
  }

  /* ─── Pending/Failed States ─── */
  .chat-pending {
    opacity: 0.7;
  }

  .chat-failed {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.05);
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .chat-message-group {
      padding: 2px 12px;
      gap: 8px;
    }

    .chat-bubble-wrapper {
      max-width: 85%;
    }

    .chat-date-separator {
      padding: 24px 12px 16px;
    }

    .chat-actions-toolbar {
      gap: 0;
      padding: 4px;
    }

    .chat-action-btn {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }

    .chat-bubble {
      padding: 10px 12px;
    }

    .chat-bubble-text {
      font-size: 13px;
    }
  }

  /* ─── Print Styles ─── */
  @media print {
    .chat-actions-toolbar {
      display: none;
    }
  }
`;

/* ─── Helper Functions ─── */
const groupMessages = (messages) => {
  if (!messages.length) return [];

  const groups = [];
  let currentGroup = null;

  messages.forEach((msg, idx) => {
    const prevMsg = messages[idx - 1];
    const sameGroup = currentGroup &&
      currentGroup.senderId === msg.sender_id &&
      prevMsg &&
      new Date(msg.created_at) - new Date(prevMsg.created_at) < 60000; // 1 minute threshold

    if (sameGroup) {
      currentGroup.messages.push(msg);
    } else {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        senderId: msg.sender_id,
        messages: [msg],
      };
    }
  });

  if (currentGroup) groups.push(currentGroup);
  return groups;
};

const getDayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterdayOnly.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

// Message Item Component - Memoized
const MessageItem = React.memo(({ msg, isMine, user, onCopy, onDelete }) => {
  const timeStr = new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusIcon = () => {
    if (isMine) {
      if (msg._pending) return <FiClock size={10} className="opacity-60" />;
      if (msg._failed) return <FiAlertCircle size={10} className="text-red-500" />;
      return <FiCheck size={10} className="opacity-60" />;
    }
    return null;
  };

  return (
    <div
      key={msg.id || msg._tempId}
      id={`msg-${msg.id || msg._tempId}`}
      className={`chat-message-container ${isMine ? 'mine' : ''} ${msg._failed ? 'chat-failed' : ''} ${msg._pending ? 'chat-pending' : ''}`}
    >
      <div className="chat-bubble-wrapper">
        {msg.msg_type === 'TEXT' && (
          <div className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
            <p
              className="chat-bubble-text"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
            />
            <div className="chat-bubble-footer">
              <span className="chat-time">{timeStr}</span>
              {getStatusIcon() && <span className="chat-status">{getStatusIcon()}</span>}
            </div>
          </div>
        )}

        {msg.msg_type === 'FILE' && (
          <a
            href={msg.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`chat-bubble chat-file-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}
            title="Download file"
          >
            <div className="chat-file-icon">📎</div>
            <div className="chat-file-info">
              <span className="chat-file-name">Attachment</span>
              <span style={{ fontSize: '10px', opacity: 0.75 }}>{timeStr}</span>
            </div>
          </a>
        )}

        {msg.msg_type === 'VOICE' && (
          <div className={`chat-bubble chat-file-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
            <div className="chat-file-icon">🎤</div>
            <div className="chat-file-info flex-1">
              <audio controls src={msg.file_url} className="chat-audio" />
              <span style={{ fontSize: '10px', opacity: 0.75 }}>{timeStr}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="chat-actions-toolbar">
        <button className="chat-action-btn" onClick={() => toast('Reply feature coming soon')} title="Reply">
          <FiRepeat size={16} />
        </button>
        <button className="chat-action-btn" onClick={() => toast('Reactions coming soon')} title="React">
          <FiSmile size={16} />
        </button>
        {msg.msg_type === 'TEXT' && (
          <button className="chat-action-btn" onClick={() => onCopy(msg.content)} title="Copy">
            <FiCopy size={16} />
          </button>
        )}
        <button className="chat-action-btn" onClick={() => onDelete(msg.id)} title="Delete">
          <FiTrash2 size={16} />
        </button>
        <button className="chat-action-btn" onClick={() => toast('Forward coming soon')} title="Forward">
          <FiShare2 size={16} />
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg._pending === nextProps.msg._pending &&
    prevProps.msg._failed === nextProps.msg._failed
  );
});

MessageItem.displayName = 'MessageItem';

// Main ChatWindow Component
export default function ChatWindow({ conversationId }) {
  const messages = useChatStore(s => s.messages[conversationId] || []);
  const user = useChatStore(s => s.user);
  const containerRef = useRef(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const timer = setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const handleCopyMessage = useCallback((content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  }, []);

  const handleDeleteMessage = useCallback((msgId) => {
    toast.success('Message deleted');
  }, []);

  // Memoize grouped messages
  const groups = useMemo(() => groupMessages(messages), [messages]);

  if (messages.length === 0) {
    return (
      <>
        <style>{STYLE}</style>
        <div className="chat-container">
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-text">No messages yet</p>
            <p className="chat-empty-subtext">Say hello to start the conversation!</p>
          </div>
        </div>
      </>
    );
  }

  let lastDate = null;

  return (
    <>
      <style>{STYLE}</style>
      <div ref={containerRef} className="chat-container">
        {groups.map((group, groupIdx) => {
          const isMine = group.senderId === user?.id;
          const firstMsg = group.messages[0];
          const msgDate = new Date(firstMsg.timestamp || firstMsg.created_at);
          const showDateSeparator = !lastDate || getDayLabel(lastDate) !== getDayLabel(msgDate);
          const senderInitial = group.senderId?.charAt(0).toUpperCase() || '?';

          lastDate = msgDate;

          return (
            <div key={`group-${groupIdx}`}>
              {showDateSeparator && (
                <div className="chat-date-separator">
                  <div className="chat-date-line" />
                  <div className="chat-date-badge">{getDayLabel(msgDate)}</div>
                  <div className="chat-date-line" />
                </div>
              )}
              <div className={`chat-message-group chat-group-${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && <div className="chat-avatar">{senderInitial}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  {group.messages.map((msg) => (
                    <MessageItem
                      key={msg.id || msg._tempId}
                      msg={msg}
                      isMine={isMine}
                      user={user}
                      onCopy={handleCopyMessage}
                      onDelete={handleDeleteMessage}
                    />
                  ))}
                </div>
                {isMine && <div className="chat-avatar-placeholder" />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}