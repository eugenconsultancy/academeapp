import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import { chatApi } from '../api/chatApi';
import { FiArrowLeft, FiSearch, FiMoreVertical, FiX, FiArrowDown } from 'react-icons/fi';

/* ─── Modern Design System ─── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

  :root {
    /* Light Mode */
    --chat-bg-light: #ffffff;
    --chat-surface-light: #f8f9fa;
    --chat-surface2-light: #eef0f5;
    --chat-border-light: rgba(0,0,0,0.08);
    --chat-text-light: #1a1d23;
    --chat-muted-light: #6b7280;
    --chat-accent: #3b82f6;
    --chat-accent-alt: #6366f1;
    --chat-accent-glow: rgba(59, 130, 246, 0.15);
    
    /* Dark Mode */
    --chat-bg-dark: #0f1419;
    --chat-surface-dark: #1a2332;
    --chat-surface2-dark: #243447;
    --chat-border-dark: rgba(255,255,255,0.08);
    --chat-text-dark: #e5e7eb;
    --chat-muted-dark: #9ca3af;
    
    /* Status colors */
    --chat-online: #10b981;
    --chat-away: #f59e0b;
    --chat-offline: #6b7280;
    
    /* Active theme defaults to dark */
    --chat-bg: var(--chat-bg-dark);
    --chat-surface: var(--chat-surface-dark);
    --chat-surface2: var(--chat-surface2-dark);
    --chat-border: var(--chat-border-dark);
    --chat-text: var(--chat-text-dark);
    --chat-muted: var(--chat-muted-dark);
  }

  html.light-mode {
    --chat-bg: var(--chat-bg-light);
    --chat-surface: var(--chat-surface-light);
    --chat-surface2: var(--chat-surface2-light);
    --chat-border: var(--chat-border-light);
    --chat-text: var(--chat-text-light);
    --chat-muted: var(--chat-muted-light);
  }

  * {
    box-sizing: border-box;
  }

  .cd-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--chat-bg);
    color: var(--chat-text);
    font-family: 'Geist', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .cd-container::before {
    content: '';
    position: absolute;
    top: 0;
    right: -40%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--chat-accent-glow) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    transition: opacity 0.3s ease;
  }

  /* ─── Header ─── */
  .cd-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(var(--chat-surface-rgb), 0.7);
    backdrop-filter: blur(24px);
    border-bottom: 1px solid var(--chat-border);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cd-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--chat-surface2);
    border: 1px solid var(--chat-border);
    color: var(--chat-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .cd-back-btn:hover {
    background: var(--chat-accent);
    border-color: var(--chat-accent);
    color: #ffffff;
    transform: translateX(-1px);
  }

  .cd-header-identity {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .cd-avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .cd-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--chat-accent), var(--chat-accent-alt));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
    box-shadow: 0 4px 12px var(--chat-accent-glow);
  }

  .cd-online-ring {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: var(--chat-online);
    border-radius: 50%;
    border: 2px solid var(--chat-bg);
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
  }

  .cd-header-text {
    min-width: 0;
    flex: 1;
  }

  .cd-header-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--chat-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .cd-header-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--chat-muted);
    font-family: 'Geist Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cd-header-meta.online {
    color: var(--chat-online);
  }

  .cd-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .cd-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--chat-surface2);
    border: 1px solid var(--chat-border);
    color: var(--chat-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cd-icon-btn:hover {
    background: var(--chat-accent);
    border-color: var(--chat-accent);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--chat-accent-glow);
  }

  /* ─── Search Modal ─── */
  .cd-search-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 40;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .cd-search-panel {
    position: absolute;
    top: 70px;
    left: 16px;
    right: 16px;
    max-width: 500px;
    background: var(--chat-surface);
    border: 1px solid var(--chat-border);
    border-radius: 16px;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 50;
    max-height: 380px;
    display: flex;
    flex-direction: column;
  }

  .cd-search-input-wrap {
    position: relative;
    padding: 12px;
    border-bottom: 1px solid var(--chat-border);
  }

  .cd-search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--chat-muted);
    pointer-events: none;
  }

  .cd-search-input {
    width: 100%;
    padding: 10px 14px 10px 36px;
    background: var(--chat-surface2);
    border: 1px solid var(--chat-border);
    border-radius: 10px;
    color: var(--chat-text);
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
  }

  .cd-search-input::placeholder {
    color: var(--chat-muted);
  }

  .cd-search-input:focus {
    border-color: var(--chat-accent);
    box-shadow: 0 0 0 3px var(--chat-accent-glow);
  }

  .cd-search-results {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .cd-search-result-item {
    padding: 12px;
    margin-bottom: 4px;
    background: var(--chat-surface2);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cd-search-result-item:hover {
    background: var(--chat-accent-glow);
  }

  .cd-search-result-text {
    font-size: 13px;
    color: var(--chat-text);
    margin-bottom: 4px;
  }

  .cd-search-result-meta {
    font-size: 11px;
    color: var(--chat-muted);
    font-family: 'Geist Mono', monospace;
  }

  .cd-search-empty {
    padding: 32px 16px;
    text-align: center;
    color: var(--chat-muted);
    font-size: 13px;
  }

  .cd-search-results::-webkit-scrollbar {
    width: 4px;
  }

  .cd-search-results::-webkit-scrollbar-thumb {
    background: var(--chat-border);
    border-radius: 2px;
  }

  /* ─── Messages Container ─── */
  .cd-messages {
    position: relative;
    z-index: 1;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .cd-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--chat-muted);
  }

  .cd-loading-dots {
    display: flex;
    gap: 8px;
  }

  .cd-loading-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--chat-accent);
    animation: bounce 1.4s ease-in-out infinite;
  }

  .cd-loading-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .cd-loading-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.4;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .cd-loading-text {
    font-size: 13px;
    font-family: 'Geist Mono', monospace;
    letter-spacing: 0.05em;
  }

  /* ─── Info Drawer ─── */
  .cd-drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 30;
    animation: fadeIn 0.2s ease;
  }

  .cd-drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 320px;
    background: var(--chat-surface);
    border-left: 1px solid var(--chat-border);
    z-index: 40;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.12);
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .cd-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--chat-border);
    flex-shrink: 0;
  }

  .cd-drawer-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--chat-text);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: 'Geist Mono', monospace;
  }

  .cd-drawer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--chat-surface2);
    border: 1px solid var(--chat-border);
    color: var(--chat-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cd-drawer-close:hover {
    background: var(--chat-accent);
    border-color: var(--chat-accent);
    color: #ffffff;
  }

  .cd-drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .cd-drawer-section {
    margin-bottom: 24px;
  }

  .cd-drawer-section-title {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--chat-muted);
    font-family: 'Geist Mono', monospace;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .cd-drawer-user-card {
    background: var(--chat-surface2);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    margin-bottom: 12px;
  }

  .cd-drawer-user-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--chat-accent), var(--chat-accent-alt));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 auto 12px;
  }

  .cd-drawer-user-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--chat-text);
    margin-bottom: 4px;
  }

  .cd-drawer-user-meta {
    font-size: 12px;
    color: var(--chat-muted);
    margin-bottom: 8px;
  }

  .cd-drawer-user-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--chat-online);
    font-weight: 500;
  }

  .cd-drawer-button {
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    background: var(--chat-surface);
    border: 1px solid var(--chat-border);
    border-radius: 10px;
    color: var(--chat-text);
    font-family: 'Geist', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cd-drawer-button:hover {
    background: var(--chat-accent-glow);
    border-color: var(--chat-accent);
    color: var(--chat-accent);
  }

  .cd-drawer-button.danger {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
  }

  .cd-drawer-button.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }

  .cd-drawer-content::-webkit-scrollbar {
    width: 4px;
  }

  .cd-drawer-content::-webkit-scrollbar-thumb {
    background: var(--chat-border);
    border-radius: 2px;
  }

  /* ─── Scroll to Bottom Button ─── */
  .cd-scroll-btn {
    position: absolute;
    bottom: 80px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, var(--chat-accent), var(--chat-accent-alt));
    color: #ffffff;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px var(--chat-accent-glow);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 5;
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

  .cd-scroll-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .cd-header {
      padding: 10px 12px;
    }

    .cd-back-btn {
      width: 32px;
      height: 32px;
    }

    .cd-avatar {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }

    .cd-header-name {
      font-size: 14px;
    }

    .cd-header-meta {
      display: none;
    }

    .cd-search-panel {
      left: 12px;
      right: 12px;
      max-width: none;
    }

    .cd-icon-btn {
      width: 32px;
      height: 32px;
    }

    .cd-drawer {
      width: 100%;
    }
  }
`;

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
  const [showSearch, setShowSearch] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const conversations = useChatStore(s => s.conversations);
  const messages = useChatStore(s => s.messages[conversationId] || []);

  // Find other participant
  useEffect(() => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv && user) {
      setOtherParticipant({
        id: conv.participant_id,
        name: conv.participant_name || 'Unknown',
        class: conv.participant_class || 'Student',
        status: conv.participant_status || 'offline',
        lastActive: conv.participant_last_active || '—',
        avatar: conv.participant_avatar,
      });
    }
  }, [conversationId, conversations, user]);

  // Load conversation
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') {
      setLoading(false);
      return;
    }

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

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages
      .filter(msg =>
        msg.content?.toLowerCase().includes(query.toLowerCase()) &&
        msg.msg_type === 'TEXT'
      )
      .map((msg, idx) => ({
        ...msg,
        preview: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
      }));

    setSearchResults(results.slice(0, 10));
  };

  const scrollToMessage = (messageId) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.classList.add('highlight');
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.cd-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  return (
    <>
      <style>{STYLE}</style>
      <div className="cd-container">
        {/* Header */}
        <header className="cd-header">
          <button className="cd-back-btn" onClick={() => navigate('/chats')} title="Back">
            <FiArrowLeft size={18} />
          </button>
          <div className="cd-header-identity">
            <div className="cd-avatar-wrap">
              <div className="cd-avatar">
                {otherParticipant?.name?.[0]?.toUpperCase() || '?'}
              </div>
              {otherParticipant?.status === 'online' && <div className="cd-online-ring" />}
            </div>
            <div className="cd-header-text">
              <p className="cd-header-name">{otherParticipant?.name || 'Loading…'}</p>
              <p className={`cd-header-meta ${otherParticipant?.status === 'online' ? 'online' : ''}`}>
                {otherParticipant?.status === 'online'
                  ? '🟢 Online'
                  : `Last active ${otherParticipant?.lastActive}`}
              </p>
            </div>
          </div>
          <div className="cd-header-actions">
            <button
              className="cd-icon-btn"
              onClick={() => setShowSearch(!showSearch)}
              title="Search messages"
            >
              <FiSearch size={18} />
            </button>
            <button
              className="cd-icon-btn"
              onClick={() => setShowDrawer(!showDrawer)}
              title="Conversation info"
            >
              <FiMoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Search Modal */}
        {showSearch && (
          <>
            <div
              className="cd-search-modal"
              onClick={() => setShowSearch(false)}
            />
            <div className="cd-search-panel">
              <div className="cd-search-input-wrap">
                <FiSearch className="cd-search-icon" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search messages…"
                  className="cd-search-input"
                  autoFocus
                />
              </div>
              <div className="cd-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div
                      key={result.id}
                      className="cd-search-result-item"
                      onClick={() => scrollToMessage(result.id)}
                    >
                      <p className="cd-search-result-text">{result.preview}</p>
                      <p className="cd-search-result-meta">
                        {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="cd-search-empty">No messages found</div>
                ) : (
                  <div className="cd-search-empty">Type to search messages</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Info Drawer */}
        {showDrawer && (
          <>
            <div
              className="cd-drawer-overlay"
              onClick={() => setShowDrawer(false)}
            />
            <div className="cd-drawer">
              <div className="cd-drawer-header">
                <h2 className="cd-drawer-title">Details</h2>
                <button
                  className="cd-drawer-close"
                  onClick={() => setShowDrawer(false)}
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="cd-drawer-content">
                {/* User Card */}
                <div className="cd-drawer-section">
                  <div className="cd-drawer-user-card">
                    <div className="cd-drawer-user-avatar">
                      {otherParticipant?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="cd-drawer-user-name">{otherParticipant?.name}</p>
                    <p className="cd-drawer-user-meta">{otherParticipant?.class}</p>
                    <p className="cd-drawer-user-status">
                      <span>●</span>
                      {otherParticipant?.status === 'online'
                        ? 'Active now'
                        : `Last active ${otherParticipant?.lastActive}`}
                    </p>
                    <button className="cd-drawer-button">View Profile</button>
                  </div>
                </div>

                {/* Conversation Actions */}
                <div className="cd-drawer-section">
                  <p className="cd-drawer-section-title">Actions</p>
                  <button className="cd-drawer-button">📌 Pin Conversation</button>
                  <button className="cd-drawer-button">🔕 Mute Notifications</button>
                  <button className="cd-drawer-button">📑 Search in Chat</button>
                  <button className="cd-drawer-button danger">🚫 Block User</button>
                  <button className="cd-drawer-button danger">🗑️ Delete Chat</button>
                </div>

                {/* Chat Info */}
                <div className="cd-drawer-section">
                  <p className="cd-drawer-section-title">Chat Info</p>
                  <div style={{ fontSize: '12px', color: 'var(--chat-muted)', lineHeight: '1.8' }}>
                    <div>Messages: {messages.length}</div>
                    <div style={{ marginTop: '8px' }}>Created: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        <div className="cd-messages" onScroll={handleScroll}>
          {loading ? (
            <div className="cd-loading">
              <div className="cd-loading-dots">
                <div className="cd-loading-dot" />
                <div className="cd-loading-dot" />
                <div className="cd-loading-dot" />
              </div>
              <span className="cd-loading-text">loading conversation</span>
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '12px',
                  color: 'var(--chat-muted)'
                }}>
                  <div style={{ fontSize: '32px' }}>💬</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--chat-text)' }}>
                    Start your conversation
                  </div>
                  <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
                    Introduce yourself and begin chatting with {otherParticipant?.name}.
                  </div>
                </div>
              ) : (
                <ChatWindow
                  conversationId={conversationId}
                  onScroll={handleScroll}
                />
              )}
            </>
          )}

          {showScrollBtn && (
            <button
              className="cd-scroll-btn"
              onClick={scrollToBottom}
              title="Jump to latest messages"
            >
              <FiArrowDown size={14} />
              <span>New messages</span>
            </button>
          )}
        </div>

        {/* Input */}
        <MessageInput conversationId={conversationId} />
      </div>
    </>
  );
}