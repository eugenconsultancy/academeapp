// Navbar.jsx — Campus OS aligned
// Cleaner, no animated glow blobs, unified amber/indigo color system
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiZap, FiChevronDown,
  FiUser, FiSettings, FiLogOut, FiHelpCircle,
  FiHome, FiBell, FiBriefcase, FiPackage, FiBook,
  FiBookOpen, FiMapPin, FiNavigation, FiShield, FiBarChart2,
  FiSun, FiMoon, FiMonitor, FiSearch, FiType
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { path: '/', label: 'Home', icon: FiHome, color: '#6366f1' },
  { path: '/announcements', label: 'Announcements', icon: FiBell, color: '#f59e0b' },
  { path: '/blog', label: 'Blog', icon: FiBookOpen, color: '#6366f1' },
  { path: '/opportunities', label: 'Opportunities', icon: FiBriefcase, color: '#10b981' },
  { path: '/found-items', label: 'Found Items', icon: FiPackage, color: '#6366f1' },
  { path: '/classes', label: 'Classes', icon: FiBook, color: '#6366f1' },
  { path: '/nearby-classes', label: 'Nearby', icon: FiNavigation, color: '#f59e0b' },
  { path: '/campus-map', label: 'Map', icon: FiMapPin, color: '#6366f1' },
];

const themes = [
  { id: 'light', label: 'Light', icon: FiSun },
  { id: 'dark', label: 'Dark', icon: FiMoon },
  { id: 'system', label: 'System', icon: FiMonitor },
];

const fonts = [
  { id: 'outfit', label: 'Modern', fontFamily: 'Outfit, sans-serif' },
  { id: 'inter', label: 'Professional', fontFamily: 'Inter, sans-serif' },
  { id: 'merriweather', label: 'Academic', fontFamily: 'Merriweather, serif' },
  { id: 'jetbrains', label: 'Coding', fontFamily: 'JetBrains Mono, monospace' },
  { id: 'poppins', label: 'Elegant', fontFamily: 'Poppins, sans-serif' },
];

const suggestions = [
  'Announcements', 'Blog Posts', 'Found Items', 'Classes',
  'Campus Map', 'Opportunities', 'Governance', 'Profile Settings',
];

export default function Navbar({ onToggleSidebar }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('font') || 'outfit');
  const [themeOpen, setThemeOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New announcement posted', time: '5m ago', read: false },
    { id: 2, text: 'Class schedule updated', time: '1h ago', read: false },
    { id: 3, text: 'Found item near library', time: '3h ago', read: true },
  ]);
  const [notifOpen, setNotifOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';
  const isAdmin = user?.role === 'admin';
  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  /* ── Theme sync ── */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  /* ── Font sync ── */
  useEffect(() => {
    const font = fonts.find(f => f.id === currentFont);
    if (font) document.documentElement.style.setProperty('--nav-font', font.fontFamily);
    localStorage.setItem('font', currentFont);
  }, [currentFont]);

  /* ── Scroll detection ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Click outside search ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setThemeOpen(false);
        setFontOpen(false);
        setNotifOpen(false);
        setSearchOpen(false);
      }
      if (e.key === '/' && !e.target.closest('input, textarea')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const filteredSuggestions = searchQuery
    ? suggestions.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const closeAll = () => {
    setProfileOpen(false);
    setThemeOpen(false);
    setFontOpen(false);
    setNotifOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@400;500;600;700&display=swap');

        :root { --nav-font: 'Outfit', sans-serif; }

        /* ══════════════════════════════════
           NAV ROOT
        ══════════════════════════════════ */
        .nav-root {
          font-family: var(--nav-font);
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          height: 60px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 14px;
          transition: background .25s, box-shadow .25s;
        }
        .nav-root.scrolled {
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 1px 0 rgba(0,0,0,.06), 0 2px 16px rgba(0,0,0,.05);
        }
        .nav-root.flat {
          background: rgba(255,255,255,.75);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-root.scrolled {
          background: rgba(9,10,20,.94);
          box-shadow: 0 1px 0 rgba(255,255,255,.04), 0 2px 16px rgba(0,0,0,.3);
        }
        .dark .nav-root.flat {
          background: rgba(9,10,20,.78);
          border-bottom-color: rgba(255,255,255,.05);
        }

        /* ══════════════════════════════════
           BRANDING
        ══════════════════════════════════ */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nav-logo-mark {
          width: 36px; height: 36px;
          background: #0F172A;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,.18);
          position: relative;
          overflow: hidden;
          transition: transform .2s;
        }
        .nav-logo-mark::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(245,158,11,.3), transparent);
          border-radius: inherit;
        }
        .nav-logo-mark:hover { transform: scale(1.04); }
        .nav-logo-text {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: -.03em;
          color: #111827;
          transition: color .2s;
        }
        .dark .nav-logo-text { color: #f9fafb; }
        @media (max-width: 640px) {
          .nav-logo-text { display: none; }
          .nav-logo-mark { width: 34px; height: 34px; border-radius: 9px; }
        }

        /* ══════════════════════════════════
           DESKTOP NAV LINKS
        ══════════════════════════════════ */
        .nav-links {
          display: none;
          align-items: center;
          gap: 2px;
          margin-left: 16px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .nav-links::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .nav-links { display: flex; } }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 9px;
          font-size: .8rem;
          font-weight: 600;
          letter-spacing: -.01em;
          text-decoration: none;
          color: #6b7280;
          transition: color .18s, background .18s;
          white-space: nowrap;
          position: relative;
        }
        .nav-link:hover { color: #374151; background: rgba(0,0,0,.04); }
        .dark .nav-link { color: #9ca3af; }
        .dark .nav-link:hover { color: #e5e7eb; background: rgba(255,255,255,.06); }

        .nav-link.active {
          font-weight: 700;
          background: rgba(99,102,241,.1);
          color: #6366f1;
        }
        .nav-link.active[data-accent="amber"] { background: rgba(245,158,11,.1); color: #d97706; }
        .nav-link.active[data-accent="green"]  { background: rgba(16,185,129,.1);  color: #059669; }
        .dark .nav-link.active { background: rgba(99,102,241,.15); color: #a5b4fc; }
        .dark .nav-link.active[data-accent="amber"] { background: rgba(245,158,11,.12); color: #fbbf24; }
        .dark .nav-link.active[data-accent="green"]  { background: rgba(16,185,129,.12);  color: #34d399; }

        /* Active underbar */
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 2.5px;
          border-radius: 99px;
          background: currentColor;
          opacity: .6;
        }

        /* Greeting */
        .nav-greeting {
          font-size: .75rem;
          font-weight: 500;
          color: #9ca3af;
          white-space: nowrap;
        }
        @media (max-width: 1024px) { .nav-greeting { display: none; } }

        .nav-spacer { flex: 1; }

        /* ══════════════════════════════════
           ICON BUTTONS (search, notif, theme, font)
        ══════════════════════════════════ */
        .nav-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,.07);
          background: rgba(255,255,255,.6);
          cursor: pointer;
          color: #6b7280;
          transition: background .15s, border-color .15s, color .15s;
          position: relative;
          font-family: var(--nav-font);
          font-size: .78rem;
          font-weight: 600;
          gap: 5px;
          padding: 0 10px;
          white-space: nowrap;
        }
        .nav-icon-btn:hover {
          background: rgba(255,255,255,.95);
          border-color: rgba(99,102,241,.25);
          color: #6366f1;
        }
        .nav-icon-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
        .dark .nav-icon-btn {
          background: rgba(15,23,42,.7);
          border-color: rgba(255,255,255,.08);
          color: #9ca3af;
        }
        .dark .nav-icon-btn:hover {
          background: rgba(30,41,59,.9);
          border-color: rgba(99,102,241,.3);
          color: #a5b4fc;
        }

        /* Compact icon-only variant */
        .nav-icon-btn.icon-only { padding: 0; width: 36px; }

        /* ── Search dropdown ── */
        .nav-search-container { position: relative; }
        .nav-search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 300px;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,.07);
          border-radius: 16px;
          box-shadow: 0 8px 28px rgba(0,0,0,.1);
          padding: 12px;
          animation: navDropIn .18s cubic-bezier(.16,1,.3,1);
          z-index: 60;
        }
        .dark .nav-search-dropdown {
          background: rgba(9,10,20,.98);
          border-color: rgba(255,255,255,.07);
        }
        .nav-search-input {
          width: 100%;
          padding: 9px 13px;
          border: 1px solid rgba(0,0,0,.09);
          border-radius: 10px;
          font-family: var(--nav-font);
          font-size: .85rem;
          background: rgba(0,0,0,.02);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
          color: #111827;
        }
        .nav-search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }
        .dark .nav-search-input {
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.1);
          color: #f3f4f6;
        }
        .nav-search-suggestion {
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: .83rem;
          color: #374151;
          transition: background .12s;
          margin-top: 2px;
        }
        .nav-search-suggestion:hover { background: rgba(99,102,241,.07); color: #6366f1; }
        .dark .nav-search-suggestion { color: #d1d5db; }

        /* ── Notification badge ── */
        .nav-notif-badge {
          position: absolute;
          top: 5px; right: 5px;
          min-width: 16px; height: 16px;
          padding: 0 3px;
          border-radius: 99px;
          background: #f59e0b;
          color: white;
          font-size: .58rem;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white;
          letter-spacing: 0;
        }
        .dark .nav-notif-badge { border-color: #0a0f1e; }

        /* ── Notification dropdown ── */
        .nav-notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 300px;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,.07);
          border-radius: 16px;
          box-shadow: 0 8px 28px rgba(0,0,0,.1);
          overflow: hidden;
          animation: navDropIn .18s cubic-bezier(.16,1,.3,1);
          z-index: 60;
        }
        .dark .nav-notif-dropdown {
          background: rgba(9,10,20,.98);
          border-color: rgba(255,255,255,.07);
        }
        .nav-notif-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 16px;
          border-bottom: 1px solid rgba(0,0,0,.05);
          font-size: .82rem;
          font-weight: 700;
          color: #111827;
        }
        .dark .nav-notif-head { border-bottom-color: rgba(255,255,255,.05); color: #f9fafb; }
        .nav-notif-mark {
          font-size: .72rem;
          font-weight: 700;
          color: #6366f1;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--nav-font);
          transition: color .15s;
        }
        .nav-notif-mark:hover { color: #4f46e5; }
        .nav-notif-item {
          padding: 11px 16px;
          border-bottom: 1px solid rgba(0,0,0,.04);
          cursor: pointer;
          transition: background .12s;
        }
        .nav-notif-item:hover { background: rgba(0,0,0,.02); }
        .dark .nav-notif-item:hover { background: rgba(255,255,255,.03); }
        .nav-notif-item.unread { background: rgba(99,102,241,.04); }
        .nav-notif-item-text { font-size: .82rem; color: #374151; font-weight: 500; }
        .dark .nav-notif-item-text { color: #d1d5db; }
        .nav-notif-item-time { font-size: .68rem; color: #9ca3af; margin-top: 3px; }
        .nav-notif-footer {
          padding: 9px 16px;
          text-align: center;
          border-top: 1px solid rgba(0,0,0,.04);
        }
        .dark .nav-notif-footer { border-top-color: rgba(255,255,255,.04); }
        .nav-notif-view-all {
          font-size: .78rem;
          font-weight: 700;
          color: #6366f1;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--nav-font);
          transition: color .15s;
        }
        .nav-notif-view-all:hover { color: #4f46e5; }

        /* ── Generic dropdown ── */
        .nav-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 240px;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,.07);
          border-radius: 16px;
          box-shadow: 0 8px 28px rgba(0,0,0,.1);
          overflow: hidden;
          animation: navDropIn .18s cubic-bezier(.16,1,.3,1);
          z-index: 60;
        }
        .dark .nav-dropdown {
          background: rgba(9,10,20,.98);
          border-color: rgba(255,255,255,.07);
          box-shadow: 0 8px 28px rgba(0,0,0,.4);
        }
        @keyframes navDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-dropdown-body { padding: 6px; }
        .nav-option-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 9px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: var(--nav-font);
          font-size: .82rem;
          font-weight: 500;
          color: #374151;
          transition: background .12s, color .12s;
          text-align: left;
        }
        .nav-option-btn:hover { background: rgba(0,0,0,.04); }
        .nav-option-btn.active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-option-btn { color: #d1d5db; }
        .dark .nav-option-btn:hover { background: rgba(255,255,255,.06); }
        .dark .nav-option-btn.active { background: rgba(99,102,241,.15); color: #a5b4fc; }

        /* ── Actions container ── */
        .nav-actions { display: flex; align-items: center; gap: 6px; }

        /* ══════════════════════════════════
           PROFILE BUTTON
        ══════════════════════════════════ */
        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 11px 5px 5px;
          border-radius: 99px;
          border: 1px solid rgba(0,0,0,.07);
          background: rgba(255,255,255,.9);
          cursor: pointer;
          transition: all .18s;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
          font-family: var(--nav-font);
        }
        .nav-profile-btn:hover {
          border-color: rgba(99,102,241,.25);
          background: white;
          box-shadow: 0 3px 10px rgba(99,102,241,.1);
        }
        .nav-profile-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
        .dark .nav-profile-btn {
          background: rgba(15,23,42,.85);
          border-color: rgba(255,255,255,.08);
          box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .dark .nav-profile-btn:hover {
          background: rgba(30,41,59,.95);
          border-color: rgba(99,102,241,.3);
        }
        .nav-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0F172A, #6366f1);
          color: #fff;
          font-size: .7rem;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          letter-spacing: .02em;
        }
        .nav-avatar-wrapper { position: relative; }
        .nav-status-dot {
          position: absolute;
          bottom: 0; right: 0;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid white;
        }
        .dark .nav-status-dot { border-color: #0a0f1e; }
        .nav-profile-name {
          font-size: .82rem;
          font-weight: 600;
          color: #1f2937;
          letter-spacing: -.01em;
          max-width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .nav-profile-name { color: #f3f4f6; }
        .nav-chevron { color: #9ca3af; transition: transform .18s; }
        .nav-chevron.open { transform: rotate(180deg); }

        /* ── Profile dropdown extras ── */
        .nav-profile-head {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-profile-head { border-bottom-color: rgba(255,255,255,.05); }
        .nav-profile-head-name { font-size: .88rem; font-weight: 700; color: #111827; }
        .dark .nav-profile-head-name { color: #f9fafb; }
        .nav-profile-head-role { font-size: .7rem; color: #9ca3af; margin-top: 3px; }
        .nav-dd-item {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 9px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: .82rem;
          font-weight: 500;
          font-family: var(--nav-font);
          color: #374151;
          text-align: left;
          transition: background .12s, color .12s;
        }
        .nav-dd-item:hover { background: rgba(0,0,0,.04); color: #111827; }
        .nav-dd-item:focus-visible { outline: 2px solid #6366f1; outline-offset: -2px; }
        .dark .nav-dd-item { color: #d1d5db; }
        .dark .nav-dd-item:hover { background: rgba(255,255,255,.06); color: #f9fafb; }
        .nav-dd-item.danger { color: #dc2626; }
        .nav-dd-item.danger:hover { background: rgba(239,68,68,.06); }
        .nav-dd-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dark .nav-dd-icon { background: rgba(255,255,255,.06); }
        .nav-dd-divider { height: 1px; background: rgba(0,0,0,.05); margin: 5px 10px; }
        .dark .nav-dd-divider { background: rgba(255,255,255,.05); }

        /* ══════════════════════════════════
           SIDEBAR TOGGLE + MOBILE BTN
        ══════════════════════════════════ */
        .nav-sidebar-toggle, .nav-mobile-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          transition: background .15s, color .15s;
        }
        .nav-sidebar-toggle:hover, .nav-mobile-btn:hover {
          background: rgba(0,0,0,.05);
          color: #374151;
        }
        .nav-sidebar-toggle:focus-visible,
        .nav-mobile-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
        .dark .nav-sidebar-toggle, .dark .nav-mobile-btn { color: #9ca3af; }
        .dark .nav-sidebar-toggle:hover, .dark .nav-mobile-btn:hover {
          background: rgba(255,255,255,.07);
          color: #e5e7eb;
        }
        @media (min-width: 768px) {
          .nav-sidebar-toggle { display: none; }
          .nav-mobile-btn    { display: none; }
        }

        /* ══════════════════════════════════
           MOBILE DRAWER
        ══════════════════════════════════ */
        .nav-drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.4);
          backdrop-filter: blur(4px);
          z-index: 60;
          animation: navFadeIn .2s ease;
        }
        @keyframes navFadeIn { from{opacity:0} to{opacity:1} }
        .nav-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 288px;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(24px);
          z-index: 61;
          display: flex;
          flex-direction: column;
          animation: navSlideLeft .22s cubic-bezier(.16,1,.3,1);
          border-left: 1px solid rgba(0,0,0,.06);
        }
        .dark .nav-drawer {
          background: rgba(9,10,20,.98);
          border-left-color: rgba(255,255,255,.06);
        }
        @keyframes navSlideLeft { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .nav-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-drawer-header { border-bottom-color: rgba(255,255,255,.05); }
        .nav-drawer-title { font-size: .95rem; font-weight: 800; color: #111827; }
        .dark .nav-drawer-title { color: #f9fafb; }
        .nav-drawer-close {
          width: 32px; height: 32px;
          border-radius: 9px;
          border: none;
          background: rgba(0,0,0,.05);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #6b7280;
          transition: background .15s, color .15s;
        }
        .nav-drawer-close:hover { background: rgba(239,68,68,.08); color: #dc2626; }
        .nav-drawer-body { padding: 10px; flex: 1; overflow-y: auto; }
        .nav-drawer-section {
          font-size: .62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: #9ca3af;
          padding: 10px 10px 5px;
        }
        .nav-drawer-link {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 11px 14px;
          border-radius: 12px;
          text-decoration: none;
          font-size: .86rem;
          font-weight: 600;
          color: #374151;
          transition: background .12s, color .12s;
          margin-bottom: 2px;
          border: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
          font-family: var(--nav-font);
          text-align: left;
        }
        .nav-drawer-link:hover { background: rgba(99,102,241,.07); color: #6366f1; }
        .nav-drawer-link.active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .nav-drawer-link:focus-visible { outline: 2px solid #6366f1; outline-offset: -2px; }
        .dark .nav-drawer-link { color: #d1d5db; }
        .dark .nav-drawer-link:hover { background: rgba(99,102,241,.12); color: #a5b4fc; }
        .dark .nav-drawer-link.active { color: #a5b4fc; }
        .nav-drawer-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dark .nav-drawer-icon { background: rgba(255,255,255,.06); }

        /* ── Shortcut kbd ── */
        .nav-shortcut {
          font-size: .62rem;
          color: #9ca3af;
          padding: 2px 5px;
          border-radius: 4px;
          background: rgba(0,0,0,.05);
          margin-left: 4px;
          font-family: var(--nav-font);
        }
        .dark .nav-shortcut { background: rgba(255,255,255,.07); }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <nav className={`nav-root ${scrolled ? 'scrolled' : 'flat'}`} role="navigation" aria-label="Main navigation">

        {/* Sidebar toggle (desktop) */}
        <button className="nav-sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <FiMenu size={18} />
        </button>

        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="Academe home">
          <div className="nav-logo-mark">
            <FiZap size={16} color="#f59e0b" />
          </div>
          <span className="nav-logo-text">Academe</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links" role="menubar">
          {navLinks.map(({ path, label, icon: Icon, color }) => {
            const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            /* Map colours to accent tags for CSS */
            const accentTag = color === '#f59e0b' ? 'amber' : color === '#10b981' ? 'green' : 'indigo';
            return (
              <Link
                key={path}
                to={path}
                className={`nav-link${isActive ? ' active' : ''}`}
                data-accent={accentTag}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="nav-spacer" />

        {/* Greeting */}
        <span className="nav-greeting">{getGreeting()}, {user?.full_name?.split(' ')[0] ?? 'User'}</span>

        <div className="nav-actions">

          {/* Search */}
          <div className="nav-search-container" ref={searchRef}>
            <button
              className="nav-icon-btn"
              onClick={() => setSearchOpen(o => !o)}
              aria-label="Search (press /)"
            >
              <FiSearch size={15} />
              <span className="nav-shortcut">/</span>
            </button>
            {searchOpen && (
              <div className="nav-search-dropdown">
                <input
                  className="nav-search-input"
                  type="text"
                  placeholder="Search pages…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && filteredSuggestions.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {filteredSuggestions.map(s => (
                      <div
                        key={s}
                        className="nav-search-suggestion"
                        onClick={() => {
                          const link = navLinks.find(l => l.label === s);
                          if (link) { navigate(link.path); setSearchOpen(false); setSearchQuery(''); }
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-icon-btn icon-only"
              onClick={() => { closeAll(); setNotifOpen(o => !o); }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <FiBell size={16} />
              {unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setNotifOpen(false)} />
                <div className="nav-notif-dropdown" style={{ zIndex: 61 }}>
                  <div className="nav-notif-head">
                    Notifications
                    <button className="nav-notif-mark" onClick={markAllRead}>Mark all read</button>
                  </div>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`nav-notif-item${!n.read ? ' unread' : ''}`}
                      onClick={() => {
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                        setNotifOpen(false);
                        navigate('/notifications');
                      }}
                    >
                      <div className="nav-notif-item-text">{n.text}</div>
                      <div className="nav-notif-item-time">{n.time}</div>
                    </div>
                  ))}
                  <div className="nav-notif-footer">
                    <button className="nav-notif-view-all" onClick={() => { setNotifOpen(false); navigate('/notifications'); }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-icon-btn"
              onClick={() => { closeAll(); setThemeOpen(o => !o); }}
              aria-label="Change theme"
            >
              {theme === 'dark' ? <FiMoon size={14} /> : theme === 'light' ? <FiSun size={14} /> : <FiMonitor size={14} />}
              <span className="nav-shortcut" style={{ marginLeft: 2 }}>Theme</span>
            </button>
            {themeOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setThemeOpen(false)} />
                <div className="nav-dropdown" style={{ zIndex: 61 }}>
                  <div className="nav-dropdown-body">
                    {themes.map(t => (
                      <button
                        key={t.id}
                        className={`nav-option-btn${theme === t.id ? ' active' : ''}`}
                        onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                      >
                        <t.icon size={14} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Font toggle */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-icon-btn"
              onClick={() => { closeAll(); setFontOpen(o => !o); }}
              aria-label="Change font"
            >
              <FiType size={14} />
              <span className="nav-shortcut" style={{ marginLeft: 2 }}>Font</span>
            </button>
            {fontOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setFontOpen(false)} />
                <div className="nav-dropdown" style={{ width: 210, zIndex: 61 }}>
                  <div className="nav-dropdown-body">
                    {fonts.map(f => (
                      <button
                        key={f.id}
                        className={`nav-option-btn${currentFont === f.id ? ' active' : ''}`}
                        onClick={() => { setCurrentFont(f.id); setFontOpen(false); }}
                        style={{ fontFamily: f.fontFamily }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-profile-btn"
              onClick={() => { closeAll(); setProfileOpen(o => !o); }}
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              <div className="nav-avatar-wrapper">
                <div className="nav-avatar">{initials}</div>
                <span className="nav-status-dot" aria-label="Online" />
              </div>
              <span className="nav-profile-name">{user?.full_name?.split(' ')[0] ?? 'User'}</span>
              <FiChevronDown size={13} className={`nav-chevron${profileOpen ? ' open' : ''}`} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setProfileOpen(false)} />
                <div className="nav-dropdown" style={{ zIndex: 61 }}>
                  <div className="nav-profile-head">
                    <p className="nav-profile-head-name">{user?.full_name}</p>
                    <p className="nav-profile-head-role">{user?.class_name ?? 'Student'}</p>
                  </div>
                  <div className="nav-dropdown-body">
                    <button className="nav-dd-item" onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiUser size={14} /></span> Profile
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/sessions'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiShield size={14} /></span> Active Sessions
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/contact'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiHelpCircle size={14} /></span> Help & Support
                    </button>
                    {isLeader && (
                      <>
                        <div className="nav-dd-divider" />
                        <button className="nav-dd-item" onClick={() => { navigate('/governance'); setProfileOpen(false); }}>
                          <span className="nav-dd-icon"><FiBarChart2 size={14} /></span> Governance
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button className="nav-dd-item" onClick={() => { navigate('/admin'); setProfileOpen(false); }}>
                        <span className="nav-dd-icon"><FiSettings size={14} /></span> Admin Panel
                      </button>
                    )}
                    <div className="nav-dd-divider" />
                    <button className="nav-dd-item danger" onClick={() => { logout(); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiLogOut size={14} /></span> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <button className="nav-mobile-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <FiMenu size={18} />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="nav-drawer-overlay" onClick={() => setMobileOpen(false)} />
            <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="nav-drawer-header">
                <span className="nav-drawer-title">Navigation</span>
                <button className="nav-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close">
                  <FiX size={16} />
                </button>
              </div>
              <div className="nav-drawer-body">
                <p className="nav-drawer-section">Main Pages</p>
                {navLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className={`nav-drawer-link${location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? ' active' : ''}`}
                  >
                    <span className="nav-drawer-icon"><Icon size={15} /></span>
                    {label}
                  </Link>
                ))}

                {isLeader && (
                  <>
                    <p className="nav-drawer-section" style={{ marginTop: 14 }}>Governance</p>
                    <Link
                      to="/governance"
                      onClick={() => setMobileOpen(false)}
                      className={`nav-drawer-link${location.pathname.startsWith('/governance') ? ' active' : ''}`}
                    >
                      <span className="nav-drawer-icon"><FiBarChart2 size={15} /></span>
                      Governance
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className={`nav-drawer-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}
                      >
                        <span className="nav-drawer-icon"><FiSettings size={15} /></span>
                        Admin Panel
                      </Link>
                    )}
                  </>
                )}

                <p className="nav-drawer-section" style={{ marginTop: 14 }}>Preferences</p>
                {themes.map(t => (
                  <button
                    key={t.id}
                    className={`nav-drawer-link${theme === t.id ? ' active' : ''}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span className="nav-drawer-icon"><t.icon size={15} /></span>
                    {t.label} Theme
                  </button>
                ))}
                {fonts.map(f => (
                  <button
                    key={f.id}
                    className={`nav-drawer-link${currentFont === f.id ? ' active' : ''}`}
                    onClick={() => setCurrentFont(f.id)}
                    style={{ fontFamily: f.fontFamily }}
                  >
                    <span className="nav-drawer-icon"><FiType size={15} /></span>
                    {f.label} Font
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}