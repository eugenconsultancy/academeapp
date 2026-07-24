// frontend/src/pages/ChatsPage.jsx
//
// FIXES:
//  • ConvCard height reduced to ~68px (was ~90px) so 4-5 chats fit in viewport
//  • Header padding tightened
//  • Chips scrollbar hidden properly
//  • Avatar size 44px (was 48px) for compact feel
//  • Online dot matches smaller avatar
//  • Preview font-size & line-height tightened

import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import useChatStore from '@/stores/useChatStore';
import chatApi from '@/api/chatApi';
import { useNavigate } from 'react-router-dom';
import { debounce } from '@/utils/debounce';

const FILTERS = ['all', 'unread', 'read', 'archived', 'blocked'];

// ─── CSS ──────────────────────────────────────────────────────────────────
const CSS = `
  .cp-root {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* ── Light theme ── */
  .cp-root {
    --bg:           #eff1f8;
    --bg2:          #e7eaf5;
    --surface:      #ffffff;
    --surface2:     #f8f9fd;
    --border:       #e0e4f0;
    --text:         #0f1421;
    --text2:        #273353;
    --text3:        #7c72a3;
    --accent:       #6c63ff;
    --accent2:      #9f7aea;
    --accent-soft:  rgba(108,99,255,0.09);
    --accent-glow:  rgba(108,99,255,0.28);
    --online:       #16a34a;
    --online-ring:  rgba(22,163,74,0.18);
    --offline:      #94a3b8;
    --danger:       #e0284a;
    --warn-bg:      #fffbeb;
    --warn-text:    #d97706;
    --offline-bg:   #fef2f2;
    --offline-text: #dc2626;
    --skeleton:     #eceef7;
    --skeleton2:    #d8dce9;
    --glass-bg:     rgba(255,255,255,0.94);
    --glass-border: rgba(0,0,0,0.07);
    --shadow:       rgba(0,0,0,0.10);
    --shadow-sm:    rgba(0,0,0,0.05);
    --unread-dot:   #6c63ff;
    --unread-bg:    rgba(108,99,255,0.07);
    --chip-bg:      #eceef7;
    --chip-text:    #2d3a5c;
    --input-bg:     #f4f5fb;
    --input-border: #dde0ed;
    --card-bg:      #ffffff;
    --card-hover:   #f5f6fc;
    --card-border:  #e8eaf2;
  }

  /* ── Dark theme ── */
  .dark .cp-root {
    --bg:           #0a0c14;
    --bg2:          #10131f;
    --surface:      #161b2e;
    --surface2:     #1c2238;
    --border:       #252d45;
    --text:         #eaecf4;
    --text2:        #8892b0;
    --text3:        #4e5a7a;
    --accent:       #7c6fff;
    --accent2:      #a78bfa;
    --accent-soft:  rgba(124,111,255,0.14);
    --accent-glow:  rgba(124,111,255,0.35);
    --online:       #22c55e;
    --online-ring:  rgba(34,197,94,0.2);
    --offline:      #4b5578;
    --danger:       #f04a6b;
    --warn-bg:      rgba(251,191,36,0.1);
    --warn-text:    #fbbf24;
    --offline-bg:   rgba(240,74,107,0.1);
    --offline-text: #f87171;
    --skeleton:     #1c2238;
    --skeleton2:    #262f4a;
    --glass-bg:     rgba(14,17,28,0.94);
    --glass-border: rgba(255,255,255,0.06);
    --shadow:       rgba(0,0,0,0.55);
    --shadow-sm:    rgba(0,0,0,0.3);
    --unread-dot:   #7c6fff;
    --unread-bg:    rgba(124,111,255,0.12);
    --chip-bg:      #1c2238;
    --chip-text:    #8892b0;
    --input-bg:     #161b2e;
    --input-border: #252d45;
    --card-bg:      #161b2e;
    --card-hover:   #1c2238;
    --card-border:  #252d45;
  }

  .cp-bg {
    position: absolute; inset: 0;
    background: var(--bg);
    z-index: 0;
  }
  .cp-bg::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 55% 35% at 15% 20%, rgba(124,111,255,0.07) 0%, transparent 70%),
      radial-gradient(ellipse 45% 30% at 85% 75%, rgba(167,139,250,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .cp-bg::after {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(124,111,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,111,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }

  .cp-offline-banner {
    position: relative; z-index: 30;
    background: var(--offline-bg); color: var(--offline-text);
    font-size: 12px; font-weight: 600;
    text-align: center; padding: 6px 16px;
    border-bottom: 1px solid rgba(240,74,107,0.15);
  }

  /* ── Header: tighter padding ── */
  .cp-header {
    position: relative; z-index: 20;
    background: var(--glass-bg);
    backdrop-filter: blur(24px) saturate(1.7);
    -webkit-backdrop-filter: blur(24px) saturate(1.7);
    border-bottom: 1.5px solid var(--glass-border);
    box-shadow: 0 3px 20px var(--shadow), 0 1px 0 var(--glass-border);
    padding: 10px 16px 0;
  }

  .cp-greeting {
    font-size: 11px; font-weight: 600;
    color: var(--text3); margin-bottom: 1px;
    letter-spacing: 0.2px;
  }

  .cp-title-row {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .cp-title-left { display: flex; flex-direction: column; }
  .cp-title {
    font-size: 22px; font-weight: 900;
    letter-spacing: -0.6px;
    color: var(--text); line-height: 1.1;
    background: linear-gradient(135deg, var(--text) 50%, var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .cp-subtitle {
    font-size: 11.5px; color: var(--text3);
    margin-top: 2px; display: flex; align-items: center; gap: 5px;
  }

  .cp-new-btn {
    width: 38px; height: 38px;
    border-radius: 12px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 14px var(--accent-glow);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .cp-new-btn:hover  { transform: scale(1.07) translateY(-1px); box-shadow: 0 7px 20px var(--accent-glow); }
  .cp-new-btn:active { transform: scale(0.92); }

  .cp-search-wrap { position: relative; margin-bottom: 8px; }
  .cp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: var(--text3); pointer-events: none;
    width: 15px; height: 15px;
  }
  .cp-search-input {
    width: 100%; padding: 9px 34px;
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 14px; color: var(--text);
    font-size: 13.5px; outline: none; box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cp-search-input::placeholder { color: var(--text3); }
  .cp-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .cp-search-clear {
    position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--text3);
    padding: 3px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.15s;
  }
  .cp-search-clear:hover { color: var(--text); }

  .cp-chips {
    display: flex; gap: 6px;
    padding: 0 0 9px;
    overflow-x: auto; scrollbar-width: none;
  }
  .cp-chips::-webkit-scrollbar { display: none; }
  .cp-chip {
    padding: 5px 14px; border-radius: 22px;
    border: 1.5px solid transparent;
    cursor: pointer; font-size: 12.5px; font-weight: 600;
    white-space: nowrap;
    background: var(--chip-bg); color: var(--chip-text);
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
    display: flex; align-items: center; gap: 5px;
    flex-shrink: 0;
  }
  .cp-chip:active { transform: scale(0.94); }
  .cp-chip.active {
    background: var(--accent); color: #fff;
    box-shadow: 0 2px 10px var(--accent-glow);
  }
  .cp-chip-badge {
    font-size: 10.5px; font-weight: 800;
    border-radius: 10px; padding: 1px 5px;
    min-width: 16px; text-align: center;
  }
  .cp-chip.active .cp-chip-badge { background: rgba(255,255,255,0.25); color: #fff; }
  .cp-chip:not(.active) .cp-chip-badge { background: var(--accent-soft); color: var(--accent); }

  .cp-list-area { position: relative; z-index: 5; flex: 1; overflow: hidden; }

  .cp-section-label {
    padding: 8px 16px 3px;
    font-size: 10.5px; font-weight: 800;
    letter-spacing: 0.9px; text-transform: uppercase;
    color: var(--text3);
    display: flex; align-items: center; gap: 8px;
  }
  .cp-section-label-line { flex: 1; height: 1px; background: var(--border); }

  /* ── ConvCard: compact 68px height ── */
  .cp-conv-card {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 14px;
    margin: 1px 8px;
    border-radius: 14px; cursor: pointer;
    background: var(--card-bg);
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    min-height: 66px;
    box-sizing: border-box;
  }
  .cp-conv-card:hover {
    background: var(--card-hover);
    border-color: var(--card-border);
    box-shadow: 0 2px 10px var(--shadow-sm);
    transform: translateY(-1px);
  }
  .cp-conv-card:active { transform: scale(0.98); }
  .cp-conv-card.unread { background: var(--unread-bg); border-color: rgba(124,111,255,0.14); }

  /* ── Avatar 44px ── */
  .cp-conv-av-wrap { position: relative; flex-shrink: 0; width: 44px; height: 44px; }
  .cp-conv-av {
    width: 44px; height: 44px; border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; font-size: 16px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px var(--accent-glow);
    flex-shrink: 0;
  }
  .cp-conv-presence {
    width: 11px; height: 11px; border-radius: 50%;
    border: 2px solid var(--surface);
    position: absolute; bottom: -1px; right: -1px;
  }
  .cp-conv-presence.online  { background: var(--online); box-shadow: 0 0 0 2px var(--online-ring); }
  .cp-conv-presence.offline { background: var(--offline); }

  .cp-conv-body { flex: 1; min-width: 0; }
  .cp-conv-row1 {
    display: flex; justify-content: space-between;
    align-items: baseline; gap: 8px; margin-bottom: 2px;
  }
  .cp-conv-name {
    font-size: 14px; font-weight: 700; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-conv-time { font-size: 11px; color: var(--text3); font-weight: 500; flex-shrink: 0; }

  .cp-conv-row2 { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .cp-conv-preview {
    font-size: 12.5px; color: var(--text2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    flex: 1;
    line-height: 1.35;
  }
  .cp-conv-preview.unread { color: var(--text); font-weight: 600; }

  .cp-unread-badge {
    min-width: 19px; height: 19px;
    border-radius: 10px; padding: 0 5px;
    background: var(--accent); color: #fff;
    font-size: 10.5px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .cp-ptr { display: flex; justify-content: center; padding: 8px; position: relative; z-index: 5; }
  .cp-ptr-spin {
    width: 18px; height: 18px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: cp-spin 0.7s linear infinite;
  }
  @keyframes cp-spin { to { transform: rotate(360deg); } }

  .cp-load-more { display: flex; justify-content: center; padding: 10px; }
  .cp-load-more-btn {
    padding: 8px 22px;
    background: var(--surface); color: var(--text2);
    border: 1.5px solid var(--border); border-radius: 22px;
    cursor: pointer; font-size: 13px; font-weight: 600;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .cp-load-more-btn:hover   { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
  .cp-load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .cp-skeletons { padding: 6px 0; }
  .cp-skel-item { display: flex; align-items: center; gap: 11px; padding: 10px 16px; }
  .cp-skel {
    background: var(--skeleton); border-radius: 6px;
    overflow: hidden; position: relative;
  }
  .cp-skel::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, var(--skeleton2) 50%, transparent);
    animation: cp-shimmer 1.4s infinite;
  }
  @keyframes cp-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  .cp-skel-av   { width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; }
  .cp-skel-body { flex: 1; display: flex; flex-direction: column; gap: 7px; }
  .cp-skel-line { height: 11px; border-radius: 4px; }

  .cp-empty {
    display: flex; align-items: center; justify-content: center;
    height: 100%; padding: 32px 24px;
  }
  .cp-empty-card {
    max-width: 340px; width: 100%;
    text-align: center;
    display: flex; flex-direction: column; gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 30px 20px;
    box-shadow: 0 6px 24px var(--shadow-sm);
  }
  .cp-empty-icon   { font-size: 48px; margin-bottom: 2px; }
  .cp-empty-title  { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .cp-empty-sub    { font-size: 13.5px; color: var(--text3); line-height: 1.6; }
  .cp-empty-pills  { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 2px; }
  .cp-empty-pill {
    padding: 5px 13px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 20px;
    font-size: 11.5px; font-weight: 600; color: var(--text2);
  }
  .cp-empty-cta {
    margin-top: 6px; padding: 11px 26px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; border: none; border-radius: 14px;
    cursor: pointer; font-size: 14px; font-weight: 700;
    box-shadow: 0 4px 16px var(--accent-glow);
    transition: opacity 0.15s, transform 0.1s;
  }
  .cp-empty-cta:hover  { opacity: 0.9; transform: translateY(-1px); }
  .cp-empty-cta:active { transform: scale(0.95); }

  .cp-conn-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .cp-conn-dot.online  { background: var(--online); box-shadow: 0 0 0 2.5px var(--online-ring); }
  .cp-conn-dot.offline { background: var(--offline); }

  /* ── New Chat Modal ── */
  .cp-modal-overlay {
    position: fixed; inset: 0; width: 100%;
    height: calc(var(--visual-vh, 1vh) * 100);
    z-index: 100;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    animation: cp-fade 0.15s ease;
  }
  @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
  .cp-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    width: calc(100% - 32px);
    max-width: 460px;
    display: flex; flex-direction: column;
    box-shadow: 0 10px 48px var(--shadow);
    animation: cp-slide-up 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
    overflow: hidden;
  }
  @keyframes cp-slide-up {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .cp-modal-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: var(--border); margin: 10px auto 0; flex-shrink: 0;
  }
  .cp-modal-header {
    padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .cp-modal-title { font-size: 15.5px; font-weight: 800; color: var(--text); }
  .cp-modal-close {
    width: 30px; height: 30px; border-radius: 50%; border: none;
    background: var(--chip-bg); color: var(--text3); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .cp-modal-close:hover { background: var(--border); color: var(--text); }
  .cp-modal-body {
    padding: 12px 14px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    display: flex; flex-direction: column; gap: 6px;
  }
  .cp-modal-search-sticky {
    position: sticky; top: 0; z-index: 2;
    background: var(--surface); padding-bottom: 8px;
  }
  .cp-modal-search {
    width: 100%; padding: 10px 13px;
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 13px; color: var(--text);
    font-size: 13.5px; outline: none; box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cp-modal-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .cp-modal-search::placeholder { color: var(--text3); }
  .cp-modal-hint { font-size: 12px; color: var(--text3); text-align: center; margin-top: 16px; }
  .cp-user-item {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 8px; border-radius: 12px;
    cursor: pointer; transition: background 0.1s;
  }
  .cp-user-item:hover { background: var(--accent-soft); }
  .cp-user-av {
    width: 42px; height: 42px; border-radius: 13px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 16px; flex-shrink: 0;
    box-shadow: 0 2px 8px var(--accent-glow);
  }
  .cp-user-name   { font-size: 13.5px; font-weight: 700; color: var(--text); }
  .cp-user-detail { font-size: 11.5px; color: var(--text3); margin-top: 1px; }
`;

// ─── Greeting & helpers ──────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
};

const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ─── Sub-components ──────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="cp-skel-item">
    <div className="cp-skel cp-skel-av" />
    <div className="cp-skel-body">
      <div className="cp-skel cp-skel-line" style={{ width: '46%' }} />
      <div className="cp-skel cp-skel-line" style={{ width: '68%' }} />
    </div>
  </div>
);

const SectionLabel = ({ text }) => (
  <div className="cp-section-label">
    <span>{text}</span>
    <div className="cp-section-label-line" />
  </div>
);

const ConvCard = React.memo(({ conv, presence, onClick }) => {
  const name = conv.other_participant?.full_name || conv.group_name || 'Unknown';
  const ini = initials(name);
  const unread = conv.unread_count || 0;
  const otherId = conv.other_participant?.id;
  const isOnline = otherId ? !!(presence?.[otherId]?.online) : false;
  const preview = conv.last_message_content || 'Start the conversation';
  const when = timeAgo(conv.last_message_at);

  return (
    <div className={`cp-conv-card${unread > 0 ? ' unread' : ''}`} onClick={onClick}>
      <div className="cp-conv-av-wrap">
        <div className="cp-conv-av">{ini}</div>
        <span className={`cp-conv-presence ${isOnline ? 'online' : 'offline'}`} />
      </div>
      <div className="cp-conv-body">
        <div className="cp-conv-row1">
          <span className="cp-conv-name">{name}</span>
          <span className="cp-conv-time">{when}</span>
        </div>
        <div className="cp-conv-row2">
          <span className={`cp-conv-preview${unread > 0 ? ' unread' : ''}`}>{preview}</span>
          {unread > 0 && <span className="cp-unread-badge">{unread > 99 ? '99+' : unread}</span>}
        </div>
      </div>
    </div>
  );
});

// Compact item sizes — 68px card, 34px section label
const ITEM_SIZE = 68;
const SECTION_SIZE = 34;

const VRow = React.memo(({ index, style, data }) => {
  const { flatList, presence, onSelect } = data;
  const item = flatList[index];
  if (!item) return null;
  if (item.type === 'section') {
    return <div style={style}><SectionLabel text={item.label} /></div>;
  }
  return (
    <div style={style}>
      <ConvCard conv={item.conv} presence={presence} onClick={() => onSelect(item.conv.id)} />
    </div>
  );
});

// ─── ChatsPage ────────────────────────────────────────────────────────────
const ChatsPage = () => {
  const { conversations, setConversations, setActiveConversation, presence, isOnline, cursors } = useChatStore();

  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [ListComponent, setListComponent] = useState(null);

  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const [rootHeight, setRootHeight] = useState(() => window.innerHeight - 64);
  const [headerH, setHeaderH] = useState(170);

  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = headerRef.current;
    if (!rootEl || !headerEl) return;
    const updateRoot = () => setRootHeight(rootEl.getBoundingClientRect().height);
    const updateHeader = () => setHeaderH(Math.round(headerEl.getBoundingClientRect().height));
    updateRoot(); updateHeader();
    const roRoot = new ResizeObserver(updateRoot); roRoot.observe(rootEl);
    const roHeader = new ResizeObserver(updateHeader); roHeader.observe(headerEl);
    return () => { roRoot.disconnect(); roHeader.disconnect(); };
  }, []);

  const listHeight = rootHeight > 0 ? Math.max(0, rootHeight - headerH) : 500;

  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const getModalBuffer = useCallback(() => window.innerWidth < 768 ? 100 : 60, []);
  const [modalMaxHeight, setModalMaxHeight] = useState(() => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    return vh - (window.innerWidth < 768 ? 100 : 60);
  });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setModalMaxHeight(vv.height - getModalBuffer());
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, [getModalBuffer]);

  useEffect(() => {
    document.body.style.overflow = showNewChat ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showNewChat]);

  const convCursor = cursors?.['conversations'] ?? null;

  useEffect(() => {
    import('react-window').then(mod => {
      const List = mod.VariableSizeList ?? mod.default?.VariableSizeList;
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
      const next = res.data?.next_cursor ?? null;
      if (cursor && !isRefresh) setConversations(prev => [...prev, ...items]);
      else setConversations(items);
      if (useChatStore.getState().setCursor) useChatStore.getState().setCursor('conversations', next);
    } catch { setError('Could not load conversations.'); }
    finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
  }, [filter, setConversations, waitForToken]);

  useEffect(() => { fetchConversations(); }, [filter]);

  const debouncedSearch = useMemo(() => debounce(q => setSearch(q), 280), []);
  useEffect(() => () => { if (typeof debouncedSearch.cancel === 'function') debouncedSearch.cancel(); }, [debouncedSearch]);

  const handleSearchChange = e => { setSearchInput(e.target.value); debouncedSearch(e.target.value); };
  const clearSearch = () => { setSearchInput(''); setSearch(''); };

  const unreadCount = useMemo(() => conversations.filter(c => (c.unread_count || 0) > 0).length, [conversations]);

  const { pinned, recent } = useMemo(() => {
    let list = [...conversations].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.other_participant?.full_name || c.group_name || '').toLowerCase().includes(q) ||
        (c.last_message_content || '').toLowerCase().includes(q)
      );
    }
    return { pinned: list.filter(c => c.is_pinned), recent: list.filter(c => !c.is_pinned) };
  }, [conversations, search]);

  const filteredCount = pinned.length + recent.length;

  const handleSelect = useCallback(convId => {
    setActiveConversation(convId);
    navigate(`/chat/${convId}`);
  }, [setActiveConversation, navigate]);

  const flatList = useMemo(() => {
    const items = [];
    if (pinned.length > 0) {
      items.push({ type: 'section', label: '📌  Pinned', key: 'sec-pinned' });
      pinned.forEach(c => items.push({ type: 'conv', conv: c, key: c.id }));
    }
    if (recent.length > 0) {
      if (pinned.length > 0) items.push({ type: 'section', label: '💬  Recent', key: 'sec-recent' });
      recent.forEach(c => items.push({ type: 'conv', conv: c, key: c.id }));
    }
    return items;
  }, [pinned, recent]);

  const getItemSize = useCallback(
    index => (flatList[index]?.type === 'section' ? SECTION_SIZE : ITEM_SIZE),
    [flatList]
  );

  const itemData = useMemo(
    () => ({ flatList, presence, onSelect: handleSelect }),
    [flatList, presence, handleSelect]
  );

  const renderFallbackList = () => (
    <div style={{ height: listHeight, overflowY: 'auto' }}>
      {flatList.map(item => {
        if (item.type === 'section') return <SectionLabel key={item.key} text={item.label} />;
        return <ConvCard key={item.conv.id} conv={item.conv} presence={presence} onClick={() => handleSelect(item.conv.id)} />;
      })}
    </div>
  );

  const searchUsersDebounced = useMemo(() => debounce(async query => {
    if (!query.trim()) { setUserSearchResults([]); return; }
    setSearchingUsers(true);
    try {
      const res = await chatApi.searchUsers(query);
      setUserSearchResults(res.data || []);
    } catch { setUserSearchResults([]); }
    finally { setSearchingUsers(false); }
  }, 300), []);

  useEffect(() => { if (showNewChat) searchUsersDebounced(userSearchQuery); }, [userSearchQuery, showNewChat, searchUsersDebounced]);

  const handleStartChat = async userId => {
    try {
      const res = await chatApi.createConversation([userId]);
      const convId = res.data?.id ?? res.data?.conversation_id;
      if (convId) {
        setShowNewChat(false); setUserSearchQuery(''); setUserSearchResults([]);
        navigate(`/chat/${convId}`);
      }
    } catch (err) { console.error('Failed to create conversation', err); }
  };

  const chip = f => {
    const label = f.charAt(0).toUpperCase() + f.slice(1);
    const count = f === 'unread' ? unreadCount : null;
    return (
      <button key={f} onClick={() => setFilter(f)} className={`cp-chip${filter === f ? ' active' : ''}`}>
        {label}
        {count != null && count > 0 && <span className="cp-chip-badge">{count}</span>}
      </button>
    );
  };

  const renderEmpty = (icon, title, subtitle, pills = null, showCta = false) => (
    <div className="cp-empty">
      <div className="cp-empty-card">
        <div className="cp-empty-icon">{icon}</div>
        <div className="cp-empty-title">{title}</div>
        <div className="cp-empty-sub">{subtitle}</div>
        {pills && (
          <div className="cp-empty-pills">{pills.map((p, i) => <span key={i} className="cp-empty-pill">{p}</span>)}</div>
        )}
        {showCta && (
          <button className="cp-empty-cta" onClick={() => setShowNewChat(true)}>Start a Chat</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="cp-root" ref={rootRef}>
      <style>{CSS}</style>
      <div className="cp-bg" />

      {!isOnline && (
        <div className="cp-offline-banner">⚡ You're offline — conversations may be outdated</div>
      )}

      <div className="cp-header" ref={headerRef}>
        <div className="cp-greeting">{getGreeting()}</div>
        <div className="cp-title-row">
          <div className="cp-title-left">
            <div className="cp-title">Messages</div>
            <div className="cp-subtitle">
              <span className={`cp-conn-dot ${isOnline ? 'online' : 'offline'}`} />
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                : isOnline ? 'Connected' : 'Offline'}
            </div>
          </div>
          <button className="cp-new-btn" onClick={() => setShowNewChat(true)} aria-label="New chat">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>

        <div className="cp-search-wrap">
          <svg className="cp-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text" className="cp-search-input"
            placeholder="Search conversations…"
            value={searchInput} onChange={handleSearchChange}
            autoComplete="off" spellCheck={false}
          />
          {searchInput && (
            <button className="cp-search-clear" onClick={clearSearch} aria-label="Clear">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="cp-chips">{FILTERS.map(chip)}</div>
      </div>

      <div className="cp-list-area">
        {refreshing && <div className="cp-ptr"><div className="cp-ptr-spin" /></div>}

        {loading ? (
          <div className="cp-skeletons">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          renderEmpty('⚠️', 'Something went wrong', error, null, true)
        ) : filteredCount === 0 ? (
          search ? (
            renderEmpty('🔍', 'No results', `Nothing matched "${search}". Try a different keyword.`)
          ) : filter !== 'all' ? (
            renderEmpty('📭', 'Nothing here', `No ${filter} conversations right now.`)
          ) : (
            renderEmpty(
              '💬', 'Start a conversation',
              'Connect with classmates, share notes, and collaborate on assignments.',
              ['Share notes 📝', 'Study together 📚', 'Ask questions ❓'], true
            )
          )
        ) : (
          <>
            {ListComponent ? (
              <ListComponent
                height={listHeight}
                itemCount={flatList.length}
                itemSize={getItemSize}
                width="100%"
                itemKey={index => flatList[index]?.key ?? index}
                itemData={itemData}
              >
                {VRow}
              </ListComponent>
            ) : renderFallbackList()}

            {convCursor && (
              <div className="cp-load-more">
                <button className="cp-load-more-btn" disabled={loadingMore} onClick={() => fetchConversations(convCursor)}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showNewChat && (
        <div className="cp-modal-overlay" onClick={() => setShowNewChat(false)}>
          <div
            className="cp-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: `${modalMaxHeight}px` }}
          >
            <div className="cp-modal-handle" />
            <div className="cp-modal-header">
              <span className="cp-modal-title">New Chat</span>
              <button className="cp-modal-close" onClick={() => setShowNewChat(false)} aria-label="Close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className="cp-modal-body">
              <div className="cp-modal-search-sticky">
                <input
                  type="text" className="cp-modal-search"
                  placeholder="Search by name or username…"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                {searchingUsers && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                    <div className="cp-ptr-spin" />
                  </div>
                )}
                {!searchingUsers && !userSearchResults.length && userSearchQuery.trim() && (
                  <p className="cp-modal-hint">No users found for "{userSearchQuery}"</p>
                )}
                {!searchingUsers && !userSearchQuery.trim() && (
                  <p className="cp-modal-hint">Type a name or username to search</p>
                )}
                {userSearchResults.map(u => (
                  <div key={u.id} className="cp-user-item" onClick={() => handleStartChat(u.id)}>
                    <div className="cp-user-av">{(u.display_name || u.username || '?').charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="cp-user-name">{u.display_name || u.username}</div>
                      <div className="cp-user-detail">{u.class_name || u.email || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;