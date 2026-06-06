import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chatApi';
import { accountsApi } from '../api/accountsApi';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import {
  FiMessageSquare, FiSearch, FiEdit3, FiX,
  FiClock, FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ─── Modern Design System ─── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

  :root {
    /* Light Mode */
    --cp-bg-light: #ffffff;
    --cp-surface-light: #f8f9fa;
    --cp-surface2-light: #eef0f5;
    --cp-border-light: rgba(0,0,0,0.08);
    --cp-text-light: #1a1d23;
    --cp-muted-light: #6b7280;
    
    /* Dark Mode */
    --cp-bg-dark: #0f1419;
    --cp-surface-dark: #1a2332;
    --cp-surface2-dark: #243447;
    --cp-border-dark: rgba(255,255,255,0.08);
    --cp-text-dark: #e5e7eb;
    --cp-muted-dark: #9ca3af;
    
    /* Status & Accent */
    --cp-accent: #3b82f6;
    --cp-accent-alt: #6366f1;
    --cp-accent-glow: rgba(59, 130, 246, 0.15);
    --cp-online: #10b981;
    --cp-away: #f59e0b;
    
    /* Defaults to dark */
    --cp-bg: var(--cp-bg-dark);
    --cp-surface: var(--cp-surface-dark);
    --cp-surface2: var(--cp-surface2-dark);
    --cp-border: var(--cp-border-dark);
    --cp-text: var(--cp-text-dark);
    --cp-muted: var(--cp-muted-dark);
  }

  html.light-mode {
    --cp-bg: var(--cp-bg-light);
    --cp-surface: var(--cp-surface-light);
    --cp-surface2: var(--cp-surface2-light);
    --cp-border: var(--cp-border-light);
    --cp-text: var(--cp-text-light);
    --cp-muted: var(--cp-muted-light);
  }

  * {
    box-sizing: border-box;
  }

  .cp-root {
    min-height: 100vh;
    background: var(--cp-bg);
    font-family: 'Geist', system-ui, sans-serif;
    color: var(--cp-text);
    position: relative;
    overflow-x: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .cp-root::before {
    content: '';
    position: fixed;
    top: -200px;
    left: -200px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--cp-accent-glow) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    transition: opacity 0.3s ease;
  }

  .cp-container {
    position: relative;
    z-index: 1;
    max-width: 700px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }

  /* ─── Header ─── */
  .cp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 36px;
    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cp-header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cp-eyebrow {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--cp-accent);
    font-family: 'Geist Mono', monospace;
    font-weight: 600;
  }

  .cp-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--cp-text);
    line-height: 1;
    letter-spacing: -0.6px;
  }

  .cp-new-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, var(--cp-accent), var(--cp-accent-alt));
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px var(--cp-accent-glow);
    transition: all 0.2s ease;
  }

  .cp-new-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.35);
  }

  .cp-new-btn:active {
    transform: translateY(0) scale(0.98);
  }

  /* ─── Search Panel ─── */
  .cp-search-panel {
    background: var(--cp-surface);
    border: 1px solid var(--cp-border);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 24px;
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  }

  .cp-search-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .cp-search-input-wrap {
    position: relative;
    flex: 1;
  }

  .cp-search-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--cp-muted);
    pointer-events: none;
  }

  .cp-search-input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    background: var(--cp-surface2);
    border: 1px solid var(--cp-border);
    border-radius: 10px;
    color: var(--cp-text);
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .cp-search-input::placeholder {
    color: var(--cp-muted);
  }

  .cp-search-input:focus {
    border-color: var(--cp-accent);
    box-shadow: 0 0 0 3px var(--cp-accent-glow);
  }

  .cp-close-btn {
    padding: 9px;
    background: var(--cp-surface2);
    border: 1px solid var(--cp-border);
    border-radius: 10px;
    color: var(--cp-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .cp-close-btn:hover {
    color: var(--cp-text);
    background: var(--cp-accent);
    border-color: var(--cp-accent);
  }

  .cp-results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
  }

  .cp-results::-webkit-scrollbar {
    width: 4px;
  }

  .cp-results::-webkit-scrollbar-thumb {
    background: var(--cp-border);
    border-radius: 2px;
  }

  .cp-result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cp-result-item:hover {
    background: var(--cp-accent-glow);
  }

  .cp-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--cp-accent), var(--cp-accent-alt));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    flex-shrink: 0;
  }

  .cp-avatar-lg {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }

  .cp-online-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    background: var(--cp-online);
    border-radius: 50%;
    border: 2px solid var(--cp-bg);
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
  }

  .cp-result-info {
    flex: 1;
    min-width: 0;
  }

  .cp-result-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--cp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cp-result-sub {
    font-size: 12px;
    color: var(--cp-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cp-no-results {
    text-align: center;
    color: var(--cp-muted);
    font-size: 13px;
    padding: 20px 0;
  }

  /* ─── Section Label ─── */
  .cp-section-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--cp-muted);
    font-family: 'Geist Mono', monospace;
    margin-bottom: 12px;
    padding-left: 4px;
    font-weight: 600;
  }

  /* ─── Skeleton Loader ─── */
  .cp-skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cp-skeleton {
    background: var(--cp-surface);
    border: 1px solid var(--cp-border);
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    animation: fadeIn 0.3s ease both;
  }

  .cp-skeleton:nth-child(1) { animation-delay: 0.05s; }
  .cp-skeleton:nth-child(2) { animation-delay: 0.1s; }
  .cp-skeleton:nth-child(3) { animation-delay: 0.15s; }
  .cp-skeleton:nth-child(4) { animation-delay: 0.2s; }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cp-sk-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--cp-surface2);
    animation: shimmer 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .cp-sk-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cp-sk-line {
    height: 12px;
    border-radius: 6px;
    background: var(--cp-surface2);
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .cp-sk-line.short {
    width: 40%;
  }

  .cp-sk-line.long {
    width: 70%;
  }

  @keyframes shimmer {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.7;
    }
  }

  /* ─── Empty State ─── */
  .cp-empty {
    text-align: center;
    padding: 60px 20px;
    background: var(--cp-surface);
    border: 1px solid var(--cp-border);
    border-radius: 20px;
    animation: fadeIn 0.3s ease;
  }

  .cp-empty-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 20px;
    background: var(--cp-accent-glow);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    border: 1px solid var(--cp-border);
  }

  .cp-empty-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--cp-text);
    margin-bottom: 8px;
  }

  .cp-empty-sub {
    font-size: 14px;
    color: var(--cp-muted);
    margin-bottom: 24px;
  }

  .cp-empty-btn {
    padding: 10px 24px;
    background: linear-gradient(135deg, var(--cp-accent), var(--cp-accent-alt));
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px var(--cp-accent-glow);
    transition: all 0.2s ease;
  }

  .cp-empty-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  /* ─── Conversation Cards ─── */
  .cp-conv-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cp-conv-card {
    background: var(--cp-surface);
    border: 1px solid var(--cp-border);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    position: relative;
    overflow: hidden;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cp-conv-card:nth-child(2) { animation-delay: 0.05s; }
  .cp-conv-card:nth-child(3) { animation-delay: 0.1s; }
  .cp-conv-card:nth-child(4) { animation-delay: 0.15s; }
  .cp-conv-card:nth-child(5) { animation-delay: 0.2s; }

  .cp-conv-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      var(--cp-accent-glow) 100%
    );
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  .cp-conv-card:hover {
    border-color: var(--cp-accent);
    background: var(--cp-surface2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .cp-conv-card:hover::before {
    opacity: 0.5;
  }

  .cp-conv-card:active {
    transform: translateY(0) scale(0.99);
  }

  .cp-avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .cp-conv-body {
    flex: 1;
    min-width: 0;
  }

  .cp-conv-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .cp-conv-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--cp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
  }

  .cp-conv-time {
    font-size: 11px;
    color: var(--cp-muted);
    font-family: 'Geist Mono', monospace;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .cp-conv-preview {
    font-size: 13px;
    color: var(--cp-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cp-unread-badge {
    min-width: 20px;
    height: 20px;
    background: linear-gradient(135deg, var(--cp-accent), var(--cp-accent-alt));
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    padding: 0 6px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px var(--cp-accent-glow);
  }

  .cp-chevron {
    color: var(--cp-muted);
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .cp-conv-card:hover .cp-chevron {
    color: var(--cp-accent);
    transform: translateX(2px);
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .cp-container {
      padding: 24px 16px 80px;
    }

    .cp-title {
      font-size: 24px;
    }

    .cp-header {
      margin-bottom: 24px;
    }

    .cp-new-btn {
      padding: 8px 16px;
      font-size: 13px;
    }

    .cp-conv-name {
      max-width: 50%;
      font-size: 14px;
    }

    .cp-conv-preview {
      font-size: 12px;
    }

    .cp-conv-card {
      padding: 14px;
      gap: 12px;
    }

    .cp-avatar {
      width: 40px;
      height: 40px;
      font-size: 14px;
    }

    .cp-avatar-lg {
      width: 44px;
      height: 44px;
      font-size: 16px;
    }
  }
`;

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
      console.error('Fetch conversations error:', err);
      toast.error('Failed to load conversations');
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
      const filtered = (res.data || []).filter(u => u.id !== user.id);
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
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
      console.error('Start chat error:', err);
      toast.error('Failed to start conversation');
    }
  };

  const getOtherParticipant = (conv) => {
    if (!user) return { name: 'Unknown', id: null };
    const otherId = conv.participants.find(id => id !== user.id);
    return {
      name: otherId ? `User ${otherId.slice(0, 8)}` : 'Unknown',
      id: otherId,
    };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return msgDate.toLocaleDateString([], { weekday: 'short' });
    }
    return msgDate.toLocaleDateString();
  };

  return (
    <>
      <style>{STYLE}</style>
      <div className="cp-root">
        <div className="cp-container">
          {/* Header */}
          <header className="cp-header">
            <div className="cp-header-left">
              <span className="cp-eyebrow">Academe / Inbox</span>
              <h1 className="cp-title">Messages</h1>
            </div>
            <button
              className="cp-new-btn"
              onClick={() => setShowSearch(!showSearch)}
              title="Start a new chat"
            >
              <FiEdit3 size={16} />
              <span>New Chat</span>
            </button>
          </header>

          {/* Search Panel */}
          {showSearch && (
            <div className="cp-search-panel">
              <div className="cp-search-row">
                <div className="cp-search-input-wrap">
                  <FiSearch className="cp-search-icon" size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search students by name…"
                    className="cp-search-input"
                    autoFocus
                  />
                </div>
                <button
                  className="cp-close-btn"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  title="Close search"
                >
                  <FiX size={18} />
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="cp-results">
                  {searchResults.map((student) => (
                    <div
                      key={student.id}
                      className="cp-result-item"
                      onClick={() => startChat(student.id)}
                    >
                      <div className="cp-avatar">
                        {student.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="cp-result-info">
                        <p className="cp-result-name">{student.full_name}</p>
                        <p className="cp-result-sub">{student.class_name || 'Student'}</p>
                      </div>
                      <FiChevronRight size={15} style={{ color: 'var(--cp-muted)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="cp-no-results">No students found</p>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="cp-skeleton-list">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="cp-skeleton">
                  <div className="cp-sk-circle" />
                  <div className="cp-sk-lines">
                    <div className="cp-sk-line short" />
                    <div className="cp-sk-line long" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty-icon">
                <FiMessageSquare />
              </div>
              <h2 className="cp-empty-title">No conversations yet</h2>
              <p className="cp-empty-sub">Find a student and start chatting.</p>
              <button
                className="cp-empty-btn"
                onClick={() => setShowSearch(true)}
              >
                Start a chat
              </button>
            </div>
          ) : (
            <div className="cp-conv-list">
              <p className="cp-section-label">Recent — {conversations.length}</p>
              {conversations.map((conv, i) => {
                const other = getOtherParticipant(conv);
                return (
                  <div
                    key={conv.id}
                    className="cp-conv-card"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cp-avatar-wrap">
                      <div className="cp-avatar cp-avatar-lg">
                        {other.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="cp-online-dot" />
                    </div>

                    <div className="cp-conv-body">
                      <div className="cp-conv-top">
                        <span className="cp-conv-name">{other.name}</span>
                        <span className="cp-conv-time">
                          <FiClock size={10} />
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="cp-conv-preview">
                        {conv.last_message_preview || 'No messages yet'}
                      </p>
                    </div>

                    {conv.unread_count > 0 && (
                      <div className="cp-unread-badge">
                        {conv.unread_count}
                      </div>
                    )}

                    <FiChevronRight className="cp-chevron" size={16} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}