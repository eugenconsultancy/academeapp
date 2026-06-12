import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import DOMPurify from 'dompurify';
import { FiRepeat, FiSmile, FiCopy, FiTrash2, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ─── Styles ─── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

  :root {
    /* Light Mode */
    --msg-bg-light: #ffffff;
    --msg-bubble-light: #f0f4f8;
    --msg-text-light: #1a1d23;
    --msg-muted-light: #6b7280;
    --msg-border-light: rgba(0,0,0,0.08);
    
    /* Dark Mode */
    --msg-bg-dark: #0e1a27;
    --msg-bubble-dark: #1a2332;
    --msg-text-dark: #e5e7eb;
    --msg-muted-dark: #9ca3af;
    --msg-border-dark: rgba(255,255,255,0.08);
    
    /* Status colors */
    --msg-online: #07ad76;
    --msg-accent: rgb(191, 123, 194);
    --msg-accent-glow: rgba(59, 130, 246, 0.15);
    
    /* Defaults to dark */
    --msg-bg: var(--msg-bg-dark);
    --msg-bubble: var(--msg-bubble-dark);
    --msg-text: var(--msg-text-dark);
    --msg-muted: var(--msg-muted-dark);
    --msg-border: var(--msg-border-dark);
  }

  html.light-mode {
    --msg-bg: var(--msg-bg-light);
    --msg-bubble: var(--msg-bubble-light);
    --msg-text: var(--msg-text-light);
    --msg-muted: var(--msg-muted-light);
    --msg-border: var(--msg-border-light);
  }

  * {
    box-sizing: border-box;
  }

  .cw-container {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--msg-bg);
    transition: background-color 0.3s ease;
  }

  .cw-container::-webkit-scrollbar {
    width: 6px;
  }

  .cw-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .cw-container::-webkit-scrollbar-thumb {
    background: var(--msg-border);
    border-radius: 3px;
  }

  .cw-container::-webkit-scrollbar-thumb:hover {
    background: var(--msg-muted);
  }

  /* ─── Date Separator ─── */
  .cw-date-separator {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 16px 16px;
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cw-date-line {
    flex: 1;
    height: 1px;
    background: var(--msg-border);
  }

  .cw-date-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--msg-muted);
    font-family: 'Geist Mono', monospace;
    padding: 4px 12px;
    background: rgba(var(--msg-bubble-rgb), 0.4);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ─── Message Group ─── */
  .cw-message-group {
    display: flex;
    gap: 8px;
    padding: 2px 16px;
    margin-bottom: 8px;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cw-group-mine {
    justify-content: flex-end;
  }

  .cw-group-theirs {
    justify-content: flex-start;
  }

  /* ─── Avatar Stack ─── */
  .cw-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    flex-shrink: 0;
  }

  .cw-avatar-placeholder {
    width: 32px;
    flex-shrink: 0;
  }

  /* ─── Messages Bubble ─── */
  .cw-bubble-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 60%;
    flex: 0 1 auto;
  }

  .cw-bubble {
    padding: 10px 14px;
    border-radius: 14px;
    position: relative;
    animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    transition: all 0.15s ease;
  }

  @keyframes popIn {
    from { 
      opacity: 0; 
      transform: scale(0.95) translateY(4px);
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0);
    }
  }

  .cw-bubble-mine {
    background: linear-gradient(135deg, var(--msg-accent), #6366f1);
    color: #ffffff;
    border-radius: 14px 2px 14px 14px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  .cw-bubble-theirs {
    background: var(--msg-bubble);
    border: 1px solid var(--msg-border);
    color: var(--msg-text);
    border-radius: 2px 14px 14px 14px;
  }

  .cw-bubble-text {
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .cw-bubble-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
    font-family: 'Geist Mono', monospace;
    font-size: 11px;
    opacity: 0.75;
    transition: opacity 0.2s ease;
  }

  .cw-bubble-mine:hover .cw-bubble-footer,
  .cw-bubble-theirs:hover .cw-bubble-footer {
    opacity: 1;
  }

  .cw-time {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .cw-status {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .cw-status-icon {
    font-size: 10px;
  }

  /* ─── File/Voice Messages ─── */
  .cw-file-bubble {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
  }

  .cw-file-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .cw-file-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .cw-file-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cw-file-link {
    text-decoration: none;
    color: inherit;
    opacity: 0.85;
    transition: opacity 0.2s ease;
  }

  .cw-file-link:hover {
    opacity: 1;
    text-decoration: underline;
  }

  .cw-audio {
    max-width: 200px;
    height: 32px;
    border-radius: 12px;
  }

  /* ─── Hover Actions Toolbar ─── */
  .cw-message-container {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .cw-message-container.mine {
    justify-content: flex-end;
  }

  .cw-message-container:hover .cw-actions-toolbar {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1) translateY(0);
  }

  .cw-actions-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 6px;
    background: var(--msg-bubble);
    border: 1px solid var(--msg-border);
    border-radius: 10px;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.95) translateY(-4px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    flex-shrink: 0;
    z-index: 20;
  }

  .cw-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--msg-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cw-action-btn:hover {
    background: var(--msg-accent-glow);
    color: var(--msg-accent);
  }

  .cw-action-btn:active {
    transform: scale(0.9);
  }

  /* ─── Empty State ─── */
  .cw-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--msg-muted);
    font-family: 'Geist', sans-serif;
  }

  .cw-empty-icon {
    font-size: 48px;
    opacity: 0.3;
  }

  .cw-empty-text {
    font-size: 14px;
    text-align: center;
  }

  /* ─── Highlight Animation ─── */
  .highlight {
    animation: highlightMessage 1.5s ease forwards;
  }

  @keyframes highlightMessage {
    0% { 
      background-color: var(--msg-accent-glow);
      border-radius: 8px;
    }
    100% { 
      background-color: transparent;
    }
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .cw-bubble-wrapper {
      max-width: 85%;
    }

    .cw-message-group {
      padding: 2px 12px;
      margin-bottom: 6px;
    }

    .cw-date-separator {
      padding: 20px 12px 12px;
    }

    .cw-actions-toolbar {
      gap: 1px;
      padding: 4px 4px;
    }

    .cw-action-btn {
      width: 24px;
      height: 24px;
      font-size: 12px;
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

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

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleDeleteMessage = (msgId) => {
    // Implement delete functionality with your API
    toast.success('Message deleted');
  };

  const renderMessage = (msg) => {
    const isMine = msg.sender_id === user?.id;
    const timeStr = new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const statusIcon = isMine ? (msg._pending ? '🕒' : msg._failed ? '✗' : '✓') : null;

    return (
      <div
        key={msg.id || msg._tempId}
        id={`msg-${msg.id || msg._tempId}`}
        className="cw-message-container"
      >
        <div className="cw-bubble-wrapper">
          {msg.msg_type === 'TEXT' && (
            <div className={`cw-bubble cw-bubble-${isMine ? 'mine' : 'theirs'}`}>
              <p
                className="cw-bubble-text"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
              />
              <div className="cw-bubble-footer">
                <span className="cw-time">{timeStr}</span>
                {statusIcon && <span className="cw-status">{statusIcon}</span>}
              </div>
            </div>
          )}

          {msg.msg_type === 'FILE' && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`cw-bubble cw-bubble-${isMine ? 'mine' : 'theirs'} cw-file-bubble`}
            >
              <div className="cw-file-icon">📎</div>
              <div className="cw-file-info">
                <span className="cw-file-name">Attachment</span>
                <span style={{ fontSize: '10px', opacity: 0.75 }}>{timeStr}</span>
              </div>
            </a>
          )}

          {msg.msg_type === 'VOICE' && (
            <audio controls src={msg.file_url} className="cw-audio" />
          )}
        </div>

        {/* Action Toolbar */}
        <div className="cw-actions-toolbar">
          <button
            className="cw-action-btn"
            onClick={() => toast('Reply feature coming soon')}
            title="Reply"
          >
            <FiRepeat size={14} />
          </button>
          <button
            className="cw-action-btn"
            onClick={() => toast('Reactions coming soon')}
            title="React"
          >
            <FiSmile size={14} />
          </button>
          {msg.msg_type === 'TEXT' && (
            <button
              className="cw-action-btn"
              onClick={() => handleCopyMessage(msg.content)}
              title="Copy"
            >
              <FiCopy size={14} />
            </button>
          )}
          <button
            className="cw-action-btn"
            onClick={() => handleDeleteMessage(msg.id)}
            title="Delete"
          >
            <FiTrash2 size={14} />
          </button>
          <button
            className="cw-action-btn"
            onClick={() => toast('Forward coming soon')}
            title="Forward"
          >
            <FiShare2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <>
        <style>{STYLE}</style>
        <div className="cw-container">
          <div className="cw-empty">
            <div className="cw-empty-icon">💬</div>
            <p className="cw-empty-text">No messages yet — say hello!</p>
          </div>
        </div>
      </>
    );
  }

  const groups = groupMessages(messages);
  let lastDate = null;

  return (
    <>
      <style>{STYLE}</style>
      <div ref={containerRef} className="cw-container">
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
                <div className="cw-date-separator">
                  <div className="cw-date-line" />
                  <div className="cw-date-text">{getDayLabel(msgDate)}</div>
                  <div className="cw-date-line" />
                </div>
              )}
              <div className={`cw-message-group cw-group-${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && <div className="cw-avatar">{senderInitial}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  {group.messages.map((msg, msgIdx) => renderMessage(msg))}
                </div>
                {isMine && <div className="cw-avatar-placeholder" />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}