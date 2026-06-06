// Navbar.jsx — Academe · Fully Responsive · Dark/Light · Justified Actions
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiZap, FiChevronDown,
  FiUser, FiSettings, FiLogOut, FiHelpCircle,
  FiHome, FiBell, FiBook, FiBookOpen,
  FiSun, FiMoon, FiMonitor, FiSearch, FiType,
  FiMessageSquare, FiCheck, FiCheckCircle, FiTrash2,
  FiShield, FiBarChart2,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { chatApi } from '../../api/chatApi';
import apiClient from '../../api/client';

const NAV_LINKS = [
  { path: '/', label: 'Home', icon: FiHome, accent: 'indigo' },
  { path: '/classes', label: 'Classes', icon: FiBook, accent: 'violet' },
  { path: '/blog', label: 'Blog', icon: FiBookOpen, accent: 'purple' },
];

const THEMES = [
  { id: 'light', label: 'Light', icon: FiSun },
  { id: 'dark', label: 'Dark', icon: FiMoon },
  { id: 'system', label: 'System', icon: FiMonitor },
];

const FONTS = [
  { id: 'outfit', label: 'Modern', fontFamily: 'Outfit, sans-serif' },
  { id: 'inter', label: 'Professional', fontFamily: 'Inter, sans-serif' },
  { id: 'merriweather', label: 'Academic', fontFamily: 'Merriweather, serif' },
  { id: 'jetbrains', label: 'Coding', fontFamily: 'JetBrains Mono, monospace' },
  { id: 'poppins', label: 'Elegant', fontFamily: 'Poppins, sans-serif' },
];

export default function Navbar({ onToggleSidebar, onOpenChat }) {
  const { theme, setTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatBadge, setChatBadge] = useState(0);
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('font') || 'outfit');

  // Notifications: store with a local "read" override so mark-all-read persists until next fetch
  const [notifications, setNotifications] = useState([]);
  const [allReadLocally, setAllReadLocally] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';
  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const isAdmin = user?.role === 'admin';
  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);

  // When allReadLocally is true, treat all as read for badge purposes
  const unreadCount = useMemo(() => {
    if (allReadLocally) return 0;
    return notifications.filter(n => !n.read).length;
  }, [notifications, allReadLocally]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  })();

  const closeAll = useCallback(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await apiClient.get('/notifications/', { params: { page_size: 20 } });
      const fetched = res.data.results ?? res.data ?? [];
      setNotifications(fetched);
      // Don't reset allReadLocally — only reset if server confirms unread items exist
      // This prevents re-appearing badge after mark-all-read
      const hasServerUnread = fetched.some(n => !n.read);
      if (!hasServerUnread) setAllReadLocally(false);
    } catch {
      setNotifError('Could not load notifications');
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  const fetchChatBadge = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatApi.getConversations();
      const convs = res.data?.conversations ?? res.data ?? [];
      setChatBadge(convs.reduce((acc, c) => acc + (c.unread_count || 0), 0));
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    fetchChatBadge();
    const id = setInterval(() => { fetchNotifications(); fetchChatBadge(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications, fetchChatBadge]);

  useEffect(() => {
    const f = FONTS.find(f => f.id === currentFont);
    if (f) document.documentElement.style.setProperty('--nav-font', f.fontFamily);
    localStorage.setItem('font', currentFont);
  }, [currentFont]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') { closeAll(); setMobileOpen(false); }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault(); closeAll(); setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeAll]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleChatClick = () => {
    closeAll();
    setMobileOpen(false);
    navigate('/chats');
    setChatBadge(0);
  };

  const markAllRead = async () => {
    // Immediately update local state — this persists until server returns truly unread items
    setAllReadLocally(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiClient.post('/notifications/mark-all-read/');
    } catch { /* silent — local state already updated */ }
  };

  const markOneRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await apiClient.post(`/notifications/${id}/read/`);
    } catch { /* silent */ }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await apiClient.delete(`/notifications/${id}/`);
    } catch { /* silent */ }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@400;500;600;700&display=swap');
        :root { --nav-font: 'Outfit', sans-serif; }

        /* ══ ROOT ══ */
        .nav-root {
          font-family: var(--nav-font);
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 60px;
          display: flex; align-items: center;
          padding: 0 12px;
          gap: 6px;
          transition: background .25s, box-shadow .25s;
        }
        .nav-root.scrolled {
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(24px) saturate(180%);
          box-shadow: 0 1px 0 rgba(0,0,0,.07), 0 4px 20px rgba(0,0,0,.05);
        }
        .nav-root.flat {
          background: rgba(248,247,255,.9);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(99,102,241,.08);
        }
        .dark .nav-root.scrolled {
          background: rgba(8,9,20,.96);
          box-shadow: 0 1px 0 rgba(255,255,255,.04), 0 4px 20px rgba(0,0,0,.4);
        }
        .dark .nav-root.flat {
          background: rgba(8,9,20,.88);
          border-bottom-color: rgba(255,255,255,.05);
        }

        /* ══ LOGO ══ */
        .nav-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0; margin-right: 4px;
        }
        .nav-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(145deg,#0c1128,#1e1b4b);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(83,86,243,.4), inset 0 1px 0 rgba(255,255,255,.1);
          transition: transform .2s;
        }
        .nav-logo-mark:hover { transform: scale(1.07); }
        .nav-logo-text {
          font-size: .98rem; font-weight: 800; letter-spacing: -.04em;
          color: #0f172a;
        }
        .dark .nav-logo-text { color: #f1f5f9; }
        @media(max-width:480px) { .nav-logo-text { display: none; } }

        /* ══ DESKTOP NAV LINKS ══ */
        .nav-links {
          display: none; align-items: center; gap: 2px;
        }
        @media(min-width:640px) { .nav-links { display: flex; } }

        .nav-link {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 10px; border-radius: 10px;
          font-size: .76rem; font-weight: 600;
          text-decoration: none; color: #374151; white-space: nowrap;
          transition: color .15s, background .15s;
          position: relative;
        }
        .nav-link:hover { background: rgba(99,102,241,.08); color: #4f46e5; }
        .dark .nav-link { color: #94a3b8; }
        .dark .nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,.07); }
        .nav-link.act-indigo { background: rgba(99,102,241,.12); color: #6366f1; font-weight: 700; }
        .nav-link.act-violet { background: rgba(124,58,237,.12); color: #7c3aed; font-weight: 700; }
        .nav-link.act-purple { background: rgba(139,92,246,.12); color: #8b5cf6; font-weight: 700; }
        .dark .nav-link.act-indigo { background: rgba(99,102,241,.22); color: #a5b4fc; }
        .dark .nav-link.act-violet { background: rgba(124,58,237,.2); color: #c4b5fd; }
        .dark .nav-link.act-purple { background: rgba(139,92,246,.22); color: #c4b5fd; }

        /* ══ SPACER ══ */
        .nav-spacer { flex: 1; min-width: 0; }

        /* ══ GREETING (hidden on small) ══ */
        .nav-greeting {
          font-size: .78rem; font-weight: 700; white-space: nowrap;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          flex-shrink: 0;
        }
        .dark .nav-greeting {
          background: linear-gradient(135deg,#a5b4fc,#c4b5fd);
          -webkit-background-clip: text; background-clip: text;
        }
        @media(max-width:860px) { .nav-greeting { display: none; } }

        /* ══ ACTIONS ROW — justified, never clipped ══ */
        .nav-actions {
          display: flex; align-items: center; gap: 5px; flex-shrink: 0;
        }
        /* On very small screens compress gap */
        @media(max-width:360px) { .nav-actions { gap: 3px; } }

        /* ══ ICON BUTTONS — base ══ */
        .nav-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 5px;
          height: 34px; padding: 0 10px;
          border-radius: 10px; border: 1.5px solid transparent;
          cursor: pointer; background: none; flex-shrink: 0;
          font-family: var(--nav-font);
          font-size: .72rem; font-weight: 700;
          white-space: nowrap;
          transition: transform .15s, box-shadow .15s, filter .15s;
          position: relative;
        }
        /* Icon-only mode on small screens */
        @media(max-width:520px) {
          .nav-icon-btn { padding: 0 8px; }
          .nav-btn-label { display: none; }
        }
        .nav-icon-btn:hover { transform: translateY(-1px); }
        .nav-icon-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }

        /* Chat — emerald */
        .nav-btn-chat {
          background: linear-gradient(135deg,rgba(16,185,129,.14),rgba(16,185,129,.07));
          border-color: rgba(16,185,129,.3); color: #059669;
        }
        .nav-btn-chat:hover { background: rgba(16,185,129,.22); box-shadow: 0 4px 14px rgba(16,185,129,.25); }
        .dark .nav-btn-chat { background: rgba(16,185,129,.18); border-color: rgba(16,185,129,.35); color: #34d399; }

        /* Notifications — amber */
        .nav-btn-notif {
          background: linear-gradient(135deg,rgba(245,158,11,.14),rgba(245,158,11,.07));
          border-color: rgba(245,158,11,.3); color: #d97706;
        }
        .nav-btn-notif:hover { background: rgba(245,158,11,.22); box-shadow: 0 4px 14px rgba(245,158,11,.25); }
        .dark .nav-btn-notif { background: rgba(245,158,11,.18); border-color: rgba(245,158,11,.35); color: #fbbf24; }

        /* Search — indigo */
        .nav-btn-search {
          background: linear-gradient(135deg,rgba(99,102,241,.12),rgba(99,102,241,.06));
          border-color: rgba(99,102,241,.25); color: #6366f1;
        }
        .nav-btn-search:hover { background: rgba(99,102,241,.22); box-shadow: 0 4px 14px rgba(99,102,241,.25); }
        .dark .nav-btn-search { background: rgba(99,102,241,.18); border-color: rgba(99,102,241,.3); color: #a5b4fc; }

        /* ══ BADGE ══ */
        .nav-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 16px; height: 16px; padding: 0 4px;
          border-radius: 99px; color: #fff;
          font-size: .52rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white; pointer-events: none;
        }
        .nb-amber { background: linear-gradient(135deg,#f59e0b,#ef4444); }
        .nb-green  { background: linear-gradient(135deg,#10b981,#059669); }
        .dark .nav-badge { border-color: #080912; }

        /* ══ DROPDOWN SHARED ══ */
        .nav-drop-wrap { position: relative; }
        @keyframes dropIn {
          from { opacity:0; transform:translateY(-8px) scale(.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .nav-drop {
          position: absolute; right: 0; top: calc(100% + 10px);
          background: rgba(255,255,255,.99);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 18px;
          box-shadow: 0 12px 48px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.06);
          overflow: hidden;
          animation: dropIn .18s cubic-bezier(.16,1,.3,1);
          z-index: 200;
        }
        .dark .nav-drop {
          background: rgba(8,9,20,.99);
          border-color: rgba(255,255,255,.08);
          box-shadow: 0 12px 48px rgba(0,0,0,.6);
        }
        @media(max-width:640px) {
          .nav-drop {
            position: fixed; top: 68px;
            left: 8px; right: 8px; width: auto !important;
          }
        }

        /* Search drop */
        .nav-search-drop { width: 260px; padding: 12px; }
        .nav-search-input {
          width: 100%; padding: 9px 13px;
          border: 1.5px solid rgba(99,102,241,.22); border-radius: 10px;
          font-family: var(--nav-font); font-size: .83rem;
          background: rgba(99,102,241,.04); outline: none; color: #111827;
          transition: border-color .15s, box-shadow .15s; box-sizing: border-box;
        }
        .nav-search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
        .dark .nav-search-input { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.2); color: #f1f5f9; }
        .nav-search-hint { font-size: .65rem; color: #94a3b8; padding: 4px 2px 2px; font-weight: 600; }
        .nav-search-item {
          padding: 7px 10px; border-radius: 9px; cursor: pointer;
          font-size: .8rem; color: #374151; transition: background .1s, color .1s; margin-top: 2px;
          display: flex; align-items: center; gap: 8px;
        }
        .nav-search-item:hover { background: rgba(99,102,241,.08); color: #6366f1; }
        .dark .nav-search-item { color: #cbd5e1; }
        .dark .nav-search-item:hover { background: rgba(99,102,241,.15); color: #a5b4fc; }

        /* Notif drop */
        .nav-notif-drop { width: 320px; }
        @media(max-width:640px) { .nav-notif-drop { width: auto; } }
        .nav-notif-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px 10px; border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-notif-head { border-bottom-color: rgba(255,255,255,.06); }
        .nav-notif-head-title { font-size: .87rem; font-weight: 800; color: #0f172a; }
        .dark .nav-notif-head-title { color: #f1f5f9; }
        .nav-notif-action {
          font-size: .67rem; font-weight: 700; color: #6366f1;
          background: none; border: none; cursor: pointer; font-family: var(--nav-font);
          display: flex; align-items: center; gap: 3px; padding: 3px 7px;
          border-radius: 7px; transition: background .15s;
        }
        .nav-notif-action:hover { background: rgba(99,102,241,.09); }
        .nav-notif-list {
          max-height: 280px; overflow-y: auto; overscroll-behavior: contain;
          scrollbar-width: thin; scrollbar-color: rgba(99,102,241,.2) transparent;
        }
        .nav-notif-list::-webkit-scrollbar { width: 3px; }
        .nav-notif-list::-webkit-scrollbar-thumb { background: rgba(99,102,241,.25); border-radius: 99px; }
        .nav-notif-empty {
          padding: 28px 16px; text-align: center; font-size: .8rem; color: #94a3b8;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-spin {
          width: 18px; height: 18px;
          border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
          border-radius: 50%; animation: spin .7s linear infinite; margin: 0 auto 4px;
        }
        .nav-notif-item {
          padding: 10px 14px; border-bottom: 1px solid rgba(0,0,0,.04);
          cursor: pointer; transition: background .1s;
          display: flex; align-items: flex-start; gap: 10px; position: relative;
        }
        .nav-notif-item:last-child { border-bottom: none; }
        .nav-notif-item:hover { background: rgba(0,0,0,.02); }
        .dark .nav-notif-item:hover { background: rgba(255,255,255,.03); }
        .nav-notif-item.unread { background: rgba(99,102,241,.04); }
        .dark .nav-notif-item.unread { background: rgba(99,102,241,.08); }
        .nav-notif-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
          background: #6366f1; box-shadow: 0 0 6px rgba(99,102,241,.5);
        }
        .nav-notif-dot.read { background: rgba(0,0,0,.12); box-shadow: none; }
        .dark .nav-notif-dot.read { background: rgba(255,255,255,.12); }
        .nav-notif-text { font-size: .78rem; color: #334155; font-weight: 500; line-height: 1.4; }
        .dark .nav-notif-text { color: #cbd5e1; }
        .nav-notif-time { font-size: .65rem; color: #94a3b8; margin-top: 3px; }
        .nav-notif-del {
          opacity: 0; background: none; border: none; cursor: pointer; color: #94a3b8;
          padding: 2px 3px; border-radius: 5px; transition: opacity .15s, color .15s;
          flex-shrink: 0;
        }
        .nav-notif-item:hover .nav-notif-del { opacity: 1; }
        .nav-notif-del:hover { color: #ef4444; background: rgba(239,68,68,.08); }
        .nav-notif-footer {
          padding: 8px 16px; text-align: center; border-top: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-notif-footer { border-top-color: rgba(255,255,255,.05); }
        .nav-notif-footer button {
          font-size: .74rem; font-weight: 700; color: #6366f1;
          background: none; border: none; cursor: pointer; font-family: var(--nav-font);
        }
        .nav-notif-footer button:hover { color: #4f46e5; }

        /* ══ PROFILE BUTTON ══ */
        .nav-profile-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 3px 9px 3px 3px; border-radius: 99px;
          border: 1.5px solid rgba(99,102,241,.22);
          background: linear-gradient(135deg,rgba(99,102,241,.09),rgba(139,92,246,.05));
          cursor: pointer; flex-shrink: 0;
          font-family: var(--nav-font);
          transition: all .18s;
        }
        .nav-profile-btn:hover {
          border-color: rgba(99,102,241,.42);
          background: linear-gradient(135deg,rgba(99,102,241,.16),rgba(139,92,246,.1));
          box-shadow: 0 4px 14px rgba(99,102,241,.2); transform: translateY(-1px);
        }
        .dark .nav-profile-btn {
          background: linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.1));
          border-color: rgba(99,102,241,.3);
        }
        .nav-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: linear-gradient(135deg,#0F172A,#6366f1);
          color: #fff; font-size: .6rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
        }
        .nav-online-dot {
          position: absolute; bottom: 0; right: 0;
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981; border: 2px solid white;
        }
        .dark .nav-online-dot { border-color: #080912; }
        .nav-profile-name {
          font-size: .76rem; font-weight: 700; color: #1e293b; letter-spacing: -.01em;
          max-width: 70px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dark .nav-profile-name { color: #e2e8f0; }
        @media(max-width:420px) {
          .nav-profile-name { display: none; }
          .nav-profile-btn { padding: 3px; border-radius: 50%; }
          .nav-profile-btn .nav-chevron { display: none; }
        }
        .nav-chevron { color: #94a3b8; transition: transform .18s; flex-shrink: 0; }
        .nav-chevron.open { transform: rotate(180deg); }

        /* Profile drop */
        .nav-profile-drop { width: 248px; }
        .nav-profile-head {
          padding: 13px 16px; border-bottom: 1px solid rgba(0,0,0,.05);
          background: linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.03));
        }
        .dark .nav-profile-head {
          border-bottom-color: rgba(255,255,255,.05);
          background: rgba(99,102,241,.07);
        }
        .nav-profile-head-name { font-size: .87rem; font-weight: 800; color: #0f172a; }
        .dark .nav-profile-head-name { color: #f1f5f9; }
        .nav-profile-head-role { font-size: .67rem; color: #94a3b8; margin-top: 3px; }

        .nav-drop-body {
          padding: 6px; max-height: 58vh; overflow-y: auto; overscroll-behavior: contain;
          scrollbar-width: thin;
        }
        .nav-drop-body::-webkit-scrollbar { width: 3px; }
        .nav-drop-body::-webkit-scrollbar-thumb { background: rgba(99,102,241,.2); border-radius: 99px; }

        .nav-dd-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 7px 9px; border-radius: 10px;
          border: none; background: transparent; cursor: pointer;
          font-size: .78rem; font-weight: 500; font-family: var(--nav-font);
          color: #334155; text-align: left;
          transition: background .1s, color .1s; box-sizing: border-box;
        }
        .nav-dd-item:hover { background: rgba(0,0,0,.04); color: #0f172a; }
        .dark .nav-dd-item { color: #cbd5e1; }
        .dark .nav-dd-item:hover { background: rgba(255,255,255,.06); color: #f1f5f9; }
        .nav-dd-item.dd-active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-dd-item.dd-active { background: rgba(99,102,241,.2); color: #a5b4fc; }
        .nav-dd-item.danger { color: #dc2626; }
        .nav-dd-item.danger:hover { background: rgba(239,68,68,.07); }
        .nav-dd-icon {
          width: 27px; height: 27px; border-radius: 8px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dark .nav-dd-icon { background: rgba(255,255,255,.07); }
        .nav-dd-div { height: 1px; background: rgba(0,0,0,.05); margin: 4px 9px; }
        .dark .nav-dd-div { background: rgba(255,255,255,.06); }
        .nav-dd-section {
          font-size: .56rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: .12em; color: #94a3b8; padding: 7px 9px 2px;
        }

        /* ══ SIDEBAR TOGGLE (desktop) ══ */
        .nav-sidebar-btn {
          display: none; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid rgba(99,102,241,.15);
          background: rgba(99,102,241,.07); cursor: pointer; color: #6366f1;
          transition: background .15s; flex-shrink: 0;
        }
        @media(min-width:640px) { .nav-sidebar-btn { display: flex; } }
        .nav-sidebar-btn:hover { background: rgba(99,102,241,.15); }
        .dark .nav-sidebar-btn { border-color: rgba(99,102,241,.28); color: #a5b4fc; background: rgba(99,102,241,.12); }

        /* ══ HAMBURGER (mobile) ══ */
        .nav-hamburger {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid rgba(99,102,241,.15);
          background: rgba(99,102,241,.07); cursor: pointer; color: #6366f1;
          transition: background .15s; flex-shrink: 0;
        }
        @media(min-width:640px) { .nav-hamburger { display: none; } }
        .nav-hamburger:hover { background: rgba(99,102,241,.15); }
        .dark .nav-hamburger { border-color: rgba(99,102,241,.28); color: #a5b4fc; background: rgba(99,102,241,.12); }

        /* ══ OVERLAY ══ */
        .nav-overlay {
          position: fixed; inset: 0; z-index: 99;
          background: rgba(0,0,0,.35); backdrop-filter: blur(3px);
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .nav-overlay { animation: fadeIn .15s ease; }

        /* ══ MOBILE DRAWER ══ */
        .nav-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(296px,88vw);
          background: rgba(255,255,255,.99);
          backdrop-filter: blur(24px); z-index: 101;
          display: flex; flex-direction: column;
          border-left: 1px solid rgba(0,0,0,.06);
          box-shadow: -8px 0 48px rgba(0,0,0,.15);
        }
        .dark .nav-drawer { background: rgba(8,9,20,.99); border-left-color: rgba(255,255,255,.06); }
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity:0; }
          to   { transform: translateX(0); opacity:1; }
        }
        .nav-drawer { animation: slideLeft .22s cubic-bezier(.16,1,.3,1); }

        .nav-drawer-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 15px 16px; border-bottom: 1px solid rgba(0,0,0,.05);
          background: linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04));
          flex-shrink: 0;
        }
        .dark .nav-drawer-header { border-bottom-color: rgba(255,255,255,.05); background: rgba(99,102,241,.09); }
        .nav-drawer-title { font-size: .93rem; font-weight: 800; color: #0f172a; letter-spacing: -.02em; }
        .dark .nav-drawer-title { color: #f1f5f9; }
        .nav-drawer-close {
          width: 30px; height: 30px; border-radius: 8px; border: none;
          background: rgba(0,0,0,.05); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #64748b; transition: background .15s;
        }
        .nav-drawer-close:hover { background: rgba(239,68,68,.1); color: #dc2626; }
        .dark .nav-drawer-close { background: rgba(255,255,255,.07); }

        .nav-drawer-user {
          padding: 13px 16px; display: flex; align-items: center; gap: 11px;
          border-bottom: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
        }
        .dark .nav-drawer-user { border-bottom-color: rgba(255,255,255,.05); }
        .nav-drawer-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg,#0F172A,#6366f1);
          color: #fff; font-size: .75rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          box-shadow: 0 4px 12px rgba(99,102,241,.4);
        }
        .nav-drawer-status {
          position: absolute; bottom: 0; right: 0;
          width: 9px; height: 9px; border-radius: 50%;
          background: #10b981; border: 2px solid white;
        }
        .dark .nav-drawer-status { border-color: #080912; }
        .nav-drawer-name { font-size: .86rem; font-weight: 700; color: #0f172a; }
        .dark .nav-drawer-name { color: #f1f5f9; }
        .nav-drawer-role { font-size: .69rem; color: #94a3b8; margin-top: 2px; }

        .nav-drawer-body { padding: 8px 10px; flex: 1; overflow-y: auto; overscroll-behavior: contain; }
        .nav-drawer-section {
          font-size: .57rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: .12em; color: #94a3b8; padding: 9px 9px 4px;
        }
        .nav-drawer-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; text-decoration: none;
          font-size: .81rem; font-weight: 600; color: #334155;
          transition: background .1s, color .1s; margin-bottom: 1px;
          border: none; background: transparent; cursor: pointer;
          width: 100%; font-family: var(--nav-font); text-align: left; box-sizing: border-box;
        }
        .nav-drawer-link:hover { background: rgba(99,102,241,.08); color: #6366f1; }
        .nav-drawer-link.active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-drawer-link { color: #cbd5e1; }
        .dark .nav-drawer-link:hover { background: rgba(99,102,241,.12); color: #a5b4fc; }
        .dark .nav-drawer-link.active { color: #a5b4fc; background: rgba(99,102,241,.16); }
        .nav-drawer-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dark .nav-drawer-icon { background: rgba(255,255,255,.07); }
        .nav-drawer-badge {
          margin-left: auto; min-width: 17px; height: 17px; padding: 0 4px;
          border-radius: 99px; background: linear-gradient(135deg,#10b981,#059669);
          color: white; font-size: .57rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-drawer-footer {
          padding: 10px 16px 20px; border-top: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
        }
        .dark .nav-drawer-footer { border-top-color: rgba(255,255,255,.05); }
        .nav-drawer-signout {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 13px; border-radius: 11px;
          border: none; background: rgba(239,68,68,.07); cursor: pointer;
          font-size: .81rem; font-weight: 700; font-family: var(--nav-font);
          color: #dc2626; text-align: left; transition: background .12s;
        }
        .nav-drawer-signout:hover { background: rgba(239,68,68,.14); }
      `}</style>

      <nav className={`nav-root ${scrolled ? 'scrolled' : 'flat'}`} role="navigation" aria-label="Main navigation">

        {/* Sidebar toggle (desktop) */}
        <button className="nav-sidebar-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <FiMenu size={16} />
        </button>

        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="Academe home">
          <div className="nav-logo-mark"><FiZap size={15} color="#f59e0b" /></div>
          <span className="nav-logo-text">Academe</span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" role="menubar">
          {NAV_LINKS.map(({ path, label, icon: Icon, accent }) => (
            <Link
              key={path} to={path}
              className={`nav-link${isActive(path) ? ` act-${accent}` : ''}`}
              role="menuitem" aria-current={isActive(path) ? 'page' : undefined}
            >
              <Icon size={13} />{label}
            </Link>
          ))}
        </div>

        <div className="nav-spacer" />

        <span className="nav-greeting">Good {greeting}, {firstName} 👋</span>

        <div className="nav-actions">

          {/* Search */}
          <div className="nav-drop-wrap" ref={searchRef}>
            <button
              className="nav-icon-btn nav-btn-search"
              onClick={() => { closeAll(); setSearchOpen(o => !o); }}
              aria-label="Search" title="Search (press /)"
            >
              <FiSearch size={14} />
              <span className="nav-btn-label">Search</span>
            </button>
            {searchOpen && (
              <div className="nav-drop nav-search-drop">
                <input
                  className="nav-search-input" type="text" placeholder="Search pages…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                />
                {searchQuery
                  ? NAV_LINKS.filter(l => l.label.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                    <div key={l.path} className="nav-search-item"
                      onClick={() => { navigate(l.path); closeAll(); setSearchQuery(''); }}>
                      <l.icon size={13} style={{ color: '#6366f1' }} />{l.label}
                    </div>
                  ))
                  : <p className="nav-search-hint">Recent pages</p>
                }
              </div>
            )}
          </div>

          {/* Chat */}
          <button
            className="nav-icon-btn nav-btn-chat"
            onClick={handleChatClick}
            aria-label={`Chat${chatBadge > 0 ? ` (${chatBadge} unread)` : ''}`}
            title="Messages"
          >
            <FiMessageSquare size={14} />
            <span className="nav-btn-label">Chat</span>
            {chatBadge > 0 && (
              <span className="nav-badge nb-green">{chatBadge > 99 ? '99+' : chatBadge}</span>
            )}
          </button>

          {/* Notifications */}
          <div className="nav-drop-wrap" ref={notifRef}>
            <button
              className="nav-icon-btn nav-btn-notif"
              onClick={() => { closeAll(); setNotifOpen(o => !o); if (!notifOpen) fetchNotifications(); }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              title="Notifications"
            >
              <FiBell size={14} />
              <span className="nav-btn-label">Alerts</span>
              {unreadCount > 0 && (
                <span className="nav-badge nb-amber">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {notifOpen && (
              <div className="nav-drop nav-notif-drop">
                <div className="nav-notif-head">
                  <span className="nav-notif-head-title">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {unreadCount > 0 && (
                      <button className="nav-notif-action" onClick={markAllRead}>
                        <FiCheckCircle size={11} /> All read
                      </button>
                    )}
                    <button className="nav-notif-action" onClick={fetchNotifications} title="Refresh">↻</button>
                  </div>
                </div>
                <div className="nav-notif-list">
                  {notifLoading && <div className="nav-notif-empty"><div className="nav-spin" />Loading…</div>}
                  {!notifLoading && notifError && <div className="nav-notif-empty">{notifError}</div>}
                  {!notifLoading && !notifError && notifications.length === 0 && (
                    <div className="nav-notif-empty">
                      <FiBell size={22} style={{ opacity: .3 }} />
                      You're all caught up!
                    </div>
                  )}
                  {!notifLoading && notifications.map(n => (
                    <div
                      key={n.id}
                      className={`nav-notif-item${(!n.read && !allReadLocally) ? ' unread' : ''}`}
                      onClick={() => { markOneRead(n.id); setNotifOpen(false); if (n.link) navigate(n.link); }}
                    >
                      <span className={`nav-notif-dot${(n.read || allReadLocally) ? ' read' : ''}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nav-notif-text">{n.text || n.message || n.body}</div>
                        <div className="nav-notif-time">{formatTime(n.created_at || n.timestamp)}</div>
                      </div>
                      <button className="nav-notif-del" onClick={e => deleteNotif(e, n.id)} aria-label="Delete">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="nav-notif-footer">
                  <button onClick={() => { setNotifOpen(false); navigate('/notifications'); }}>
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="nav-drop-wrap" ref={profileRef}>
            <button
              className="nav-profile-btn"
              onClick={() => { closeAll(); setProfileOpen(o => !o); }}
              aria-haspopup="true" aria-expanded={profileOpen}
            >
              <div className="nav-avatar">
                {initials}
                <span className="nav-online-dot" />
              </div>
              <span className="nav-profile-name">{firstName}</span>
              <FiChevronDown size={11} className={`nav-chevron${profileOpen ? ' open' : ''}`} />
            </button>

            {profileOpen && (
              <div className="nav-drop nav-profile-drop">
                <div className="nav-profile-head">
                  <p className="nav-profile-head-name">{user?.full_name}</p>
                  <p className="nav-profile-head-role">{user?.class_name ?? 'Student'}</p>
                </div>
                <div className="nav-drop-body">
                  <p className="nav-dd-section">Account</p>
                  <button className="nav-dd-item" onClick={() => { navigate('/profile'); closeAll(); }}>
                    <span className="nav-dd-icon"><FiUser size={13} /></span> Profile
                  </button>
                  <button className="nav-dd-item" onClick={() => { handleChatClick(); closeAll(); }}>
                    <span className="nav-dd-icon"><FiMessageSquare size={13} /></span> Messages
                    {chatBadge > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '.62rem', fontWeight: 800, color: '#059669', background: 'rgba(16,185,129,.1)', padding: '2px 6px', borderRadius: 99 }}>
                        {chatBadge}
                      </span>
                    )}
                  </button>
                  <button className="nav-dd-item" onClick={() => { navigate('/sessions'); closeAll(); }}>
                    <span className="nav-dd-icon"><FiShield size={13} /></span> Active Sessions
                  </button>
                  <button className="nav-dd-item" onClick={() => { navigate('/contact'); closeAll(); }}>
                    <span className="nav-dd-icon"><FiHelpCircle size={13} /></span> Help & Support
                  </button>

                  <div className="nav-dd-div" />
                  <p className="nav-dd-section">Theme</p>
                  {THEMES.map(t => (
                    <button key={t.id} className={`nav-dd-item${theme === t.id ? ' dd-active' : ''}`}
                      onClick={() => { setTheme(t.id); closeAll(); }}>
                      <span className="nav-dd-icon"><t.icon size={13} /></span> {t.label}
                      {theme === t.id && <FiCheck size={11} style={{ marginLeft: 'auto', opacity: .7 }} />}
                    </button>
                  ))}

                  <div className="nav-dd-div" />
                  <p className="nav-dd-section">Font</p>
                  {FONTS.map(f => (
                    <button key={f.id} className={`nav-dd-item${currentFont === f.id ? ' dd-active' : ''}`}
                      onClick={() => { setCurrentFont(f.id); closeAll(); }}
                      style={{ fontFamily: f.fontFamily }}>
                      <span className="nav-dd-icon"><FiType size={13} /></span> {f.label}
                      {currentFont === f.id && <FiCheck size={11} style={{ marginLeft: 'auto', opacity: .7 }} />}
                    </button>
                  ))}

                  {isLeader && (
                    <>
                      <div className="nav-dd-div" />
                      <p className="nav-dd-section">Leadership</p>
                      <button className="nav-dd-item" onClick={() => { navigate('/governance'); closeAll(); }}>
                        <span className="nav-dd-icon"><FiBarChart2 size={13} /></span> Governance
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button className="nav-dd-item" onClick={() => { navigate('/admin'); closeAll(); }}>
                      <span className="nav-dd-icon"><FiSettings size={13} /></span> Admin Panel
                    </button>
                  )}

                  <div className="nav-dd-div" />
                  <button className="nav-dd-item danger" onClick={() => { logout(); closeAll(); }}>
                    <span className="nav-dd-icon"><FiLogOut size={13} /></span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <FiMenu size={17} />
          </button>
        </div>

        {/* MOBILE DRAWER */}
        {mobileOpen && (
          <>
            <div className="nav-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
              <div className="nav-drawer-header">
                <span className="nav-drawer-title">Academe</span>
                <button className="nav-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close">
                  <FiX size={15} />
                </button>
              </div>
              <div className="nav-drawer-user">
                <div className="nav-drawer-avatar">
                  {initials}
                  <span className="nav-drawer-status" />
                </div>
                <div>
                  <div className="nav-drawer-name">{user?.full_name ?? 'User'}</div>
                  <div className="nav-drawer-role">{user?.class_name ?? 'Student'}</div>
                </div>
              </div>
              <div className="nav-drawer-body">
                <p className="nav-drawer-section">Navigation</p>
                {NAV_LINKS.map(({ path, label, icon: Icon }) => (
                  <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                    className={`nav-drawer-link${isActive(path) ? ' active' : ''}`}>
                    <span className="nav-drawer-icon"><Icon size={14} /></span>{label}
                  </Link>
                ))}
                <p className="nav-drawer-section" style={{ marginTop: 10 }}>Messaging</p>
                <button className={`nav-drawer-link${location.pathname.startsWith('/chats') ? ' active' : ''}`}
                  onClick={() => { handleChatClick(); }}>
                  <span className="nav-drawer-icon"><FiMessageSquare size={14} /></span>
                  Chat
                  {chatBadge > 0 && <span className="nav-drawer-badge">{chatBadge > 99 ? '99+' : chatBadge}</span>}
                </button>
                {isLeader && (
                  <>
                    <p className="nav-drawer-section" style={{ marginTop: 10 }}>Governance</p>
                    <Link to="/governance" onClick={() => setMobileOpen(false)}
                      className={`nav-drawer-link${location.pathname.startsWith('/governance') ? ' active' : ''}`}>
                      <span className="nav-drawer-icon"><FiBarChart2 size={14} /></span> Governance
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)}
                        className={`nav-drawer-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}>
                        <span className="nav-drawer-icon"><FiSettings size={14} /></span> Admin Panel
                      </Link>
                    )}
                  </>
                )}
                <p className="nav-drawer-section" style={{ marginTop: 10 }}>Theme</p>
                {THEMES.map(t => (
                  <button key={t.id} className={`nav-drawer-link${theme === t.id ? ' active' : ''}`}
                    onClick={() => setTheme(t.id)}>
                    <span className="nav-drawer-icon"><t.icon size={14} /></span> {t.label}
                    {theme === t.id && <FiCheck size={12} style={{ marginLeft: 'auto', opacity: .7 }} />}
                  </button>
                ))}
                <p className="nav-drawer-section" style={{ marginTop: 10 }}>Account</p>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="nav-drawer-link">
                  <span className="nav-drawer-icon"><FiUser size={14} /></span> Profile
                </Link>
                <Link to="/sessions" onClick={() => setMobileOpen(false)} className="nav-drawer-link">
                  <span className="nav-drawer-icon"><FiShield size={14} /></span> Active Sessions
                </Link>
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="nav-drawer-link">
                  <span className="nav-drawer-icon"><FiHelpCircle size={14} /></span> Help & Support
                </Link>
              </div>
              <div className="nav-drawer-footer">
                <button className="nav-drawer-signout" onClick={() => { logout(); setMobileOpen(false); }}>
                  <FiLogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}