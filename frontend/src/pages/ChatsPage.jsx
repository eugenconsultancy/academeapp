// frontend/src/pages/ChatsPage.jsx
import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import useChatStore from '@/stores/useChatStore';
import chatApi from '@/api/chatApi';
import ChatListItem from '@/components/chat/ChatListItem';
import { useNavigate } from 'react-router-dom';
import { debounce } from '@/utils/debounce';

const FILTERS = ['all', 'unread', 'read', 'archived', 'blocked'];

// ─── CSS ─────────────────────────────────────────────────────────────────
const CSS = `
  .cp-root {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    overflow: hidden;
    position: relative;
  }

  @media (prefers-color-scheme: dark) {
    .cp-root {
      --bg:          #0d0f16;
      --bg2:         #131720;
      --surface:     #1a1e2e;
      --surface2:    #1f2540;
      --border:      #252c42;
      --text:        #e8eaf0;
      --text2:       #8b92a8;
      --text3:       #5a6180;
      --accent:      #6c63ff;
      --accent-soft: rgba(108,99,255,0.14);
      --accent2:     #a855f7;
      --online:      #22c55e;
      --online-ring: rgba(34,197,94,0.2);
      --offline:     #64748b;
      --danger:      #ef4444;
      --warn-bg:     rgba(245,158,11,0.1);
      --warn-text:   #fbbf24;
      --offline-bg:  rgba(239,68,68,0.1);
      --offline-text:#f87171;
      --skeleton:    #1a1e2e;
      --skeleton2:   #252c42;
      --glass-bg:    rgba(19,23,32,0.9);
      --glass-border:rgba(255,255,255,0.06);
      --shadow:      rgba(0,0,0,0.45);
      --pin-bg:      rgba(108,99,255,0.08);
      --unread-dot:  #6c63ff;
      --unread-bg:   rgba(108,99,255,0.12);
      --chip-bg:     #1f2540;
      --chip-text:   #8b92a8;
      --chip-active: #6c63ff;
      --input-bg:    #1a1e2e;
      --input-border:#252c42;
    }
  }

  @media (prefers-color-scheme: light) {
    .cp-root {
      --bg:          #f0f2f8;
      --bg2:         #e8eaf2;
      --surface:     #ffffff;
      --surface2:    #f8f9fc;
      --border:      #e2e5ef;
      --text:        #0f1523;
      --text2:       #5a6180;
      --text3:       #9ba3bf;
      --accent:      #6c63ff;
      --accent-soft: rgba(108,99,255,0.09);
      --accent2:     #a855f7;
      --online:      #16a34a;
      --online-ring: rgba(22,163,74,0.18);
      --offline:     #94a3b8;
      --danger:      #dc2626;
      --warn-bg:     #fffbeb;
      --warn-text:   #d97706;
      --offline-bg:  #fef2f2;
      --offline-text:#dc2626;
      --skeleton:    #eceef5;
      --skeleton2:   #d8dbe8;
      --glass-bg:    rgba(255,255,255,0.9);
      --glass-border:rgba(0,0,0,0.06);
      --shadow:      rgba(0,0,0,0.07);
      --pin-bg:      rgba(108,99,255,0.05);
      --unread-dot:  #6c63ff;
      --unread-bg:   rgba(108,99,255,0.08);
      --chip-bg:     #eceef5;
      --chip-text:   #5a6180;
      --chip-active: #6c63ff;
      --input-bg:    #f4f5fa;
      --input-border:#dde0ed;
    }
  }

  /* ── Background ── */
  .cp-bg {
    position: absolute;
    inset: 0;
    background: var(--bg);
    z-index: 0;
  }
  .cp-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(108,99,255,0.04) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  /* ── Offline banner ── */
  .cp-offline-banner {
    position: relative;
    z-index: 30;
    background: var(--offline-bg);
    color: var(--offline-text);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    padding: 6px 16px;
    border-bottom: 1px solid rgba(239,68,68,0.15);
  }

  /* ── Glass Header ── */
  .cp-header {
    position: relative;
    z-index: 20;
    background: var(--glass-bg);
    backdrop-filter: blur(20px) saturate(1.6);
    -webkit-backdrop-filter: blur(20px) saturate(1.6);
    border-bottom: 1px solid var(--glass-border);
    box-shadow: 0 2px 20px var(--shadow);
    padding: 16px 16px 0;
  }

  /* Greeting row */
  .cp-greeting {
    font-size: 12px;
    font-weight: 500;
    color: var(--text3);
    margin-bottom: 2px;
    letter-spacing: 0.2px;
  }

  /* Title row */
  .cp-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .cp-title-left { display: flex; flex-direction: column; }
  .cp-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text);
    line-height: 1.1;
  }
  .cp-subtitle {
    font-size: 12px;
    color: var(--text3);
    margin-top: 2px;
  }
  .cp-new-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(108,99,255,0.4);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .cp-new-btn:hover  { opacity: 0.9; transform: scale(1.06); }
  .cp-new-btn:active { transform: scale(0.93); }

  /* Search */
  .cp-search-wrap {
    position: relative;
    margin-bottom: 14px;
  }
  .cp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text3);
    pointer-events: none;
    width: 16px;
    height: 16px;
  }
  .cp-search-input {
    width: 100%;
    padding: 11px 36px 11px 36px;
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 14px;
    color: var(--text);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cp-search-input::placeholder { color: var(--text3); }
  .cp-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(108,99,255,0.14);
  }
  .cp-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text3);
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
  }
  .cp-search-clear:hover { color: var(--text); background: var(--border); }

  /* ── Filter chips ── */
  .cp-chips {
    display: flex;
    gap: 7px;
    padding: 0 0 14px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .cp-chips::-webkit-scrollbar { display: none; }
  .cp-chip {
    padding: 6px 14px;
    border-radius: 22px;
    border: 1.5px solid transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--chip-bg);
    color: var(--chip-text);
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .cp-chip:hover { opacity: 0.85; }
  .cp-chip:active { transform: scale(0.95); }
  .cp-chip.active {
    background: var(--accent);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 3px 12px rgba(108,99,255,0.35);
  }
  .cp-chip-badge {
    background: rgba(255,255,255,0.25);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 10px;
    padding: 1px 6px;
    min-width: 18px;
    text-align: center;
  }
  .cp-chip:not(.active) .cp-chip-badge {
    background: var(--accent-soft);
    color: var(--accent);
  }

  /* ── List area ── */
  .cp-list-area {
    position: relative;
    z-index: 5;
    flex: 1;
    overflow: hidden;
  }

  /* ── Section label ── */
  .cp-section-label {
    padding: 10px 16px 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text3);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cp-section-label-line {
    flex: 1;
    height: 1px;
    background: var(--border);
    opacity: 0.6;
  }

  /* ── Pull-to-refresh spinner ── */
  .cp-ptr {
    display: flex;
    justify-content: center;
    padding: 10px;
    position: relative;
    z-index: 5;
  }
  .cp-ptr-spin {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: cp-spin 0.7s linear infinite;
  }
  @keyframes cp-spin { to { transform: rotate(360deg); } }

  /* ── Load more ── */
  .cp-load-more {
    display: flex;
    justify-content: center;
    padding: 10px;
  }
  .cp-load-more-btn {
    padding: 8px 24px;
    background: var(--surface);
    color: var(--text2);
    border: 1.5px solid var(--border);
    border-radius: 22px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s, border-color 0.15s;
  }
  .cp-load-more-btn:hover   { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
  .cp-load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Empty state ── */
  .cp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 32px;
    text-align: center;
    gap: 10px;
  }
  .cp-empty-icon   { font-size: 52px; margin-bottom: 4px; opacity: 0.85; }
  .cp-empty-title  { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .cp-empty-sub    { font-size: 13.5px; color: var(--text3); line-height: 1.6; max-width: 240px; }
  .cp-empty-cta {
    margin-top: 8px;
    padding: 11px 28px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(108,99,255,0.4);
    transition: opacity 0.15s, transform 0.1s;
  }
  .cp-empty-cta:hover  { opacity: 0.9; transform: translateY(-1px); }
  .cp-empty-cta:active { transform: scale(0.95); }

  /* ── Skeletons ── */
  .cp-skeletons { padding: 8px 0; }
  .cp-skel-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
  }
  .cp-skel {
    background: var(--skeleton);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }
  .cp-skel::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--skeleton2) 50%, transparent);
    animation: cp-shimmer 1.4s infinite;
  }
  @keyframes cp-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .cp-skel-av   { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
  .cp-skel-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .cp-skel-line { height: 12px; border-radius: 4px; }

  /* ── Connection dot ── */
  .cp-conn-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .cp-conn-dot.online  { background: var(--online); box-shadow: 0 0 0 2.5px var(--online-ring); }
  .cp-conn-dot.offline { background: var(--offline); }

  /* ── New Chat Modal ── */
  .cp-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    backdrop-filter: blur(6px);
    animation: cp-fade 0.15s ease;
  }
  @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
  .cp-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 40px var(--shadow);
    animation: cp-slide-up 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
  }
  @keyframes cp-slide-up {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .cp-modal-handle {
    width: 36px; height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 12px auto 0;
  }
  .cp-modal-header {
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  .cp-modal-title  { font-size: 16px; font-weight: 800; color: var(--text); }
  .cp-modal-close  {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--chip-bg);
    color: var(--text3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .cp-modal-close:hover { background: var(--border); color: var(--text); }
  .cp-modal-body { padding: 14px 16px; flex: 1; overflow-y: auto; }
  .cp-modal-search {
    width: 100%;
    padding: 11px 14px;
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 12px;
    color: var(--text);
    font-size: 14px;
    outline: none;
    margin-bottom: 12px;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .cp-modal-search:focus { border-color: var(--accent); }
  .cp-modal-search::placeholder { color: var(--text3); }
  .cp-modal-hint { font-size: 12.5px; color: var(--text3); text-align: center; margin-top: 20px; }
  .cp-user-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 10px;
    border-radius: 14px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .cp-user-item:hover { background: var(--accent-soft); }
  .cp-user-av {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
  }
  .cp-user-name   { font-size: 14px; font-weight: 700; color: var(--text); }
  .cp-user-detail { font-size: 12px; color: var(--text3); margin-top: 1px; }

  /* ── Unread elevated card ── */
  .cp-conv-unread {
    background: var(--unread-bg);
  }
`;

// ─── Greeting helper ──────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="cp-skel-item">
    <div className="cp-skel cp-skel-av" />
    <div className="cp-skel-body">
      <div className="cp-skel cp-skel-line" style={{ width: '52%' }} />
      <div className="cp-skel cp-skel-line" style={{ width: '78%' }} />
    </div>
  </div>
);

const SectionLabel = ({ icon, text }) => (
  <div className="cp-section-label">
    {icon && <span>{icon}</span>}
    <span>{text}</span>
    <div className="cp-section-label-line" />
  </div>
);

// ─── ChatsPage ────────────────────────────────────────────────────────────
const ChatsPage = () => {
  const {
    conversations, setConversations, setActiveConversation,
    presence, isOnline, cursors,
  } = useChatStore();

  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [ListComponent, setListComponent] = useState(null);

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const convCursor = cursors?.['conversations'] ?? null;

  // Dynamic import
  useEffect(() => {
    import('react-window').then(mod => {
      const List = mod.FixedSizeList || mod.default?.FixedSizeList;
      if (List) setListComponent(() => List);
    }).catch(() => { });
  }, []);

  const waitForToken = useCallback(() => new Promise(resolve => {
    const t = localStorage.getItem('access_token');
    if (t) { resolve(t); return; }
    let n = 0;
    const id = setInterval(() => {
      const tok = localStorage.getItem('access_token');
      if (tok || ++n > 30) { clearInterval(id); resolve(tok); }
    }, 100);
  }), []);

  const fetchConversations = useCallback(async (cursor = null, isRefresh = false) => {
    const token = await waitForToken();
    if (!token) { setError('Not authenticated.'); setLoading(false); return; }

    if (isRefresh) setRefreshing(true);
    else if (!cursor) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const res = await chatApi.getConversations(filter, cursor);
      const items = res.data?.results ?? res.data ?? [];
      const nextCursor = res.data?.next_cursor ?? null;

      if (cursor && !isRefresh) {
        setConversations([...conversations, ...items]);
      } else {
        setConversations(items);
      }

      if (useChatStore.getState().setCursor) {
        useChatStore.getState().setCursor('conversations', nextCursor);
      }
    } catch {
      setError('Could not load conversations.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filter, setConversations, waitForToken, conversations]);

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = useChatStore.subscribe(s => s.conversations, () => { });
    return unsub;
  }, []);

  const debouncedSearch = useMemo(() => debounce(q => setSearch(q), 280), []);
  const handleSearchChange = e => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
  };
  const clearSearch = () => { setSearchInput(''); setSearch(''); };

  // Counts
  const unreadCount = useMemo(
    () => conversations.filter(c => (c.unread_count || 0) > 0).length,
    [conversations]
  );

  // Sort, filter, section
  const { pinned, recent } = useMemo(() => {
    let list = [...conversations].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name || c.display_name || '').toLowerCase().includes(q) ||
        (c.last_message?.content || '').toLowerCase().includes(q)
      );
    }

    return {
      pinned: list.filter(c => c.is_pinned),
      recent: list.filter(c => !c.is_pinned),
    };
  }, [conversations, search]);

  const filteredCount = pinned.length + recent.length;

  const handleSelect = useCallback(convId => {
    setActiveConversation(convId);
    navigate(`/chat/${convId}`);
  }, [setActiveConversation, navigate]);

  // New chat: search users
  const searchUsersForNewChat = useMemo(
    () => debounce(async query => {
      if (!query.trim()) { setUserSearchResults([]); return; }
      setSearchingUsers(true);
      try {
        const res = await chatApi.searchUsers(query);
        setUserSearchResults(res.data || []);
      } catch {
        setUserSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (showNewChat) searchUsersForNewChat(userSearchQuery);
  }, [userSearchQuery, showNewChat, searchUsersForNewChat]);

  const handleStartChat = async userId => {
    try {
      const res = await chatApi.createConversation([userId]);
      const convId = res.data?.id ?? res.data?.conversation_id;
      if (convId) {
        setShowNewChat(false);
        setUserSearchQuery('');
        setUserSearchResults([]);
        navigate(`/chat/${convId}`);
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  // Virtual list rendering
  const listHeight = typeof window !== 'undefined' ? window.innerHeight - 188 : 600;

  const flatList = useMemo(() => {
    const items = [];
    if (pinned.length > 0) {
      items.push({ type: 'section', label: '📌 Pinned', key: 'sec-pinned' });
      pinned.forEach(c => items.push({ type: 'conv', conv: c, key: c.id }));
    }
    if (recent.length > 0) {
      if (pinned.length > 0) {
        items.push({ type: 'section', label: '💬 Recent', key: 'sec-recent' });
      }
      recent.forEach(c => items.push({ type: 'conv', conv: c, key: c.id }));
    }
    return items;
  }, [pinned, recent]);

  const ITEM_SIZE = 74;
  const SECTION_SIZE = 36;

  const getItemSizeForList = useCallback(index => {
    return flatList[index]?.type === 'section' ? SECTION_SIZE : ITEM_SIZE;
  }, [flatList]);

  const renderFallbackList = () => (
    <div style={{ height: listHeight, overflowY: 'auto' }}>
      {flatList.map(item => {
        if (item.type === 'section') {
          return <SectionLabel key={item.key} text={item.label} />;
        }
        return (
          <ChatListItem
            key={item.conv.id}
            conv={item.conv}
            presence={presence}
            onClick={() => handleSelect(item.conv.id)}
            className={item.conv.unread_count > 0 ? 'cp-conv-unread' : ''}
          />
        );
      })}
    </div>
  );

  const VRow = useCallback(({ index, style }) => {
    const item = flatList[index];
    if (!item) return null;
    if (item.type === 'section') {
      return <div style={style}><SectionLabel text={item.label} /></div>;
    }
    return (
      <div style={{ ...style, paddingLeft: 0, paddingRight: 0 }}>
        <ChatListItem
          conv={item.conv}
          presence={presence}
          onClick={() => handleSelect(item.conv.id)}
          className={item.conv.unread_count > 0 ? 'cp-conv-unread' : ''}
        />
      </div>
    );
  }, [flatList, presence, handleSelect]);

  const chip = (f) => {
    const label = f.charAt(0).toUpperCase() + f.slice(1);
    const count = f === 'unread' ? unreadCount : null;
    return (
      <button
        key={f}
        onClick={() => setFilter(f)}
        className={`cp-chip${filter === f ? ' active' : ''}`}
      >
        {label}
        {count != null && count > 0 && (
          <span className="cp-chip-badge">{count}</span>
        )}
      </button>
    );
  };

  return (
    <div className="cp-root">
      <style>{CSS}</style>
      <div className="cp-bg" />

      {/* Offline */}
      {!isOnline && (
        <div className="cp-offline-banner">
          ⚡ You're offline — conversations may be outdated
        </div>
      )}

      {/* Header */}
      <div className="cp-header">
        <div className="cp-greeting">{getGreeting()}</div>
        <div className="cp-title-row">
          <div className="cp-title-left">
            <div className="cp-title">Messages</div>
            <div className="cp-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className={`cp-conn-dot ${isOnline ? 'online' : 'offline'}`} />
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                : isOnline ? 'Connected' : 'Offline'}
            </div>
          </div>
          <button
            className="cp-new-btn"
            onClick={() => setShowNewChat(true)}
            aria-label="New chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="cp-search-wrap">
          <svg className="cp-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            className="cp-search-input"
            placeholder="Search conversations…"
            value={searchInput}
            onChange={handleSearchChange}
            autoComplete="off"
            spellCheck={false}
          />
          {searchInput && (
            <button className="cp-search-clear" onClick={clearSearch} aria-label="Clear">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="cp-chips">
          {FILTERS.map(chip)}
        </div>
      </div>

      {/* List area */}
      <div className="cp-list-area">
        {refreshing && (
          <div className="cp-ptr"><div className="cp-ptr-spin" /></div>
        )}

        {loading ? (
          <div className="cp-skeletons">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="cp-empty">
            <div className="cp-empty-icon">⚠️</div>
            <div className="cp-empty-title">Something went wrong</div>
            <div className="cp-empty-sub">{error}</div>
            <button className="cp-empty-cta" onClick={() => fetchConversations()}>Try again</button>
          </div>
        ) : filteredCount === 0 ? (
          search ? (
            <div className="cp-empty">
              <div className="cp-empty-icon">🔍</div>
              <div className="cp-empty-title">No results</div>
              <div className="cp-empty-sub">No conversations match "{search}".<br />Try a different keyword.</div>
            </div>
          ) : filter !== 'all' ? (
            <div className="cp-empty">
              <div className="cp-empty-icon">📭</div>
              <div className="cp-empty-title">Nothing here</div>
              <div className="cp-empty-sub">No {filter} conversations right now.</div>
            </div>
          ) : (
            <div className="cp-empty">
              <div className="cp-empty-icon">💬</div>
              <div className="cp-empty-title">Start a conversation</div>
              <div className="cp-empty-sub">
                Connect with classmates, share ideas, and collaborate.
              </div>
              <button className="cp-empty-cta" onClick={() => setShowNewChat(true)}>
                New Chat
              </button>
            </div>
          )
        ) : (
          <>
            {ListComponent ? (
              <ListComponent
                height={listHeight}
                itemCount={flatList.length}
                itemSize={index => flatList[index]?.type === 'section' ? SECTION_SIZE : ITEM_SIZE}
                width="100%"
                itemKey={index => flatList[index]?.key ?? index}
              >
                {VRow}
              </ListComponent>
            ) : renderFallbackList()}

            {convCursor && (
              <div className="cp-load-more">
                <button
                  className="cp-load-more-btn"
                  disabled={loadingMore}
                  onClick={() => fetchConversations(convCursor)}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Chat Modal — bottom sheet */}
      {showNewChat && (
        <div className="cp-modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-handle" />
            <div className="cp-modal-header">
              <span className="cp-modal-title">New Chat</span>
              <button className="cp-modal-close" onClick={() => setShowNewChat(false)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className="cp-modal-body">
              <input
                type="text"
                className="cp-modal-search"
                placeholder="Search by name or username…"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                autoFocus
              />
              {searchingUsers && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div className="cp-ptr-spin" />
                </div>
              )}
              {!searchingUsers && userSearchResults.length === 0 && userSearchQuery.trim() && (
                <p className="cp-modal-hint">No users found for "{userSearchQuery}"</p>
              )}
              {!searchingUsers && !userSearchQuery.trim() && (
                <p className="cp-modal-hint">Type a name or username to search</p>
              )}
              {userSearchResults.map(u => (
                <div key={u.id} className="cp-user-item" onClick={() => handleStartChat(u.id)}>
                  <div className="cp-user-av">
                    {(u.display_name || u.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="cp-user-name">{u.display_name || u.username}</div>
                    <div className="cp-user-detail">{u.class_name || u.email || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;