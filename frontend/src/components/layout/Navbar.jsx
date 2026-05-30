// Navbar.jsx — Campus OS aligned
// Fixed duplicate theme/font controls; enhanced dynamic greeting
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiZap, FiChevronDown,
  FiUser, FiSettings, FiLogOut, FiHelpCircle,
  FiHome, FiBell, FiBriefcase, FiPackage, FiBook,
  FiBookOpen, FiMapPin, FiNavigation, FiShield, FiBarChart2,
  FiSun, FiMoon, FiMonitor, FiSearch, FiType
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const navLinks = [
  { path: '/', label: 'Home', icon: FiHome, color: '#5356f3', accent: 'indigo' },
  { path: '/announcements', label: 'Announcements', icon: FiBell, color: '#f59e0b', accent: 'amber' },
  { path: '/blog', label: 'Blog', icon: FiBookOpen, color: '#8b5cf6', accent: 'purple' },
  { path: '/opportunities', label: 'Opportunities', icon: FiBriefcase, color: '#10b981', accent: 'green' },
  { path: '/found-items', label: 'Found Items', icon: FiPackage, color: '#d83af8', accent: 'pink' },
  { path: '/classes', label: 'Classes', icon: FiBook, color: '#6366f1', accent: 'indigo' },
  { path: '/nearby-classes', label: 'Nearby', icon: FiNavigation, color: '#f59e0b', accent: 'amber' },
  { path: '/campus-map', label: 'Map', icon: FiMapPin, color: '#06b6d4', accent: 'cyan' },
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
  const { theme, setTheme, isDark } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('font') || 'outfit');
  const [themeOpen, setThemeOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New announcement posted', time: '5m ago', read: false },
    { id: 2, text: 'Class schedule updated', time: '1h ago', read: false },
    { id: 3, text: 'Found item near library', time: '3h ago', read: true },
  ]);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';
  const isAdmin = user?.role === 'admin';
  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

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
    const handler = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') {
        setProfileOpen(false); setThemeOpen(false); setFontOpen(false);
        setNotifOpen(false); setSearchOpen(false); setMobileOpen(false);
      }
      if (e.key === '/' && !e.target.closest('input,textarea')) {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* ── Lock body scroll when drawer open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
    setProfileOpen(false); setThemeOpen(false);
    setFontOpen(false); setNotifOpen(false);
  };

  const ThemeIcon = theme === 'dark' ? FiMoon : theme === 'light' ? FiSun : FiMonitor;
  const currentFontObj = fonts.find(f => f.id === currentFont) || fonts[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@400;500;600;700&display=swap');

        :root { --nav-font: 'Outfit', sans-serif; }

        /* ═══════ NAV ROOT ═══════ */
        .nav-root {
          font-family: var(--nav-font);
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          height: 60px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 6px;
          transition: background .25s, box-shadow .25s;
        }
        .nav-root.scrolled {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 1px 0 rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.06);
        }
        .nav-root.flat {
          background: rgba(245,243,255,0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(99,102,241,.08);
        }
        .dark .nav-root.scrolled {
          background: rgba(9,10,20,.94);
          box-shadow: 0 1px 0 rgba(255,255,255,.04), 0 4px 24px rgba(0,0,0,.3);
        }
        .dark .nav-root.flat {
          background: rgba(9,10,20,.82);
          border-bottom-color: rgba(255,255,255,.05);
        }

        /* ═══════ BRANDING ═══════ */
        .nav-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0;
        }
        .nav-logo-mark {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #0F172A 0%, #1e1b4b 100%);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(83,86,243,.35);
          position: relative; overflow: hidden;
          transition: transform .2s, box-shadow .2s;
        }
        .nav-logo-mark::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(245,158,11,.35), transparent 60%);
          border-radius: inherit;
        }
        .nav-logo-mark:hover { transform: scale(1.06); box-shadow: 0 4px 16px rgba(83,86,243,.45); }
        .nav-logo-text {
          font-size: 1.05rem; font-weight: 800;
          letter-spacing: -.035em; color: #0f172a;
          transition: color .2s;
        }
        .dark .nav-logo-text { color: #f1f5f9; }
        @media (max-width: 640px) {
          .nav-logo-text { display: none; }
          .nav-logo-mark { width: 34px; height: 34px; border-radius: 9px; }
        }

        /* ═══════ DESKTOP NAV LINKS ═══════ */
        .nav-links {
          display: none; align-items: center; gap: 1px;
          margin-left: 4px; overflow-x: auto; scrollbar-width: none;
        }
        .nav-links::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .nav-links { display: flex; } }

        .nav-link {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 10px; border-radius: 9px;
          font-size: .75rem; font-weight: 600;
          letter-spacing: -.01em; text-decoration: none;
          color: #374151;
          transition: color .15s, background .15s;
          white-space: nowrap; position: relative;
        }
        .nav-link:hover { background: rgba(99,102,241,.07); color: #4f46e5; }
        .dark .nav-link { color: #94a3b8; }
        .dark .nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,.06); }

        /* Active states per accent colour */
        .nav-link.active-indigo { background: rgba(99,102,241,.1);  color: #6366f1; font-weight:700; }
        .nav-link.active-amber  { background: rgba(245,158,11,.1);  color: #d97706; font-weight:700; }
        .nav-link.active-green  { background: rgba(16,185,129,.1);  color: #059669; font-weight:700; }
        .nav-link.active-pink   { background: rgba(216,58,248,.1);  color: #c026d3; font-weight:700; }
        .nav-link.active-purple { background: rgba(139,92,246,.1);  color: #7c3aed; font-weight:700; }
        .nav-link.active-cyan   { background: rgba(6,182,212,.1);   color: #0891b2; font-weight:700; }

        .dark .nav-link.active-indigo { background: rgba(99,102,241,.18);  color: #a5b4fc; }
        .dark .nav-link.active-amber  { background: rgba(245,158,11,.15);  color: #fbbf24; }
        .dark .nav-link.active-green  { background: rgba(16,185,129,.15);  color: #34d399; }
        .dark .nav-link.active-pink   { background: rgba(216,58,248,.15);  color: #e879f9; }
        .dark .nav-link.active-purple { background: rgba(139,92,246,.18);  color: #c4b5fd; }
        .dark .nav-link.active-cyan   { background: rgba(6,182,212,.15);   color: #22d3ee; }

        /* Active underbar */
        .nav-link[class*="active-"]::after {
          content: '';
          position: absolute; bottom: 3px; left: 50%;
          transform: translateX(-50%);
          width: 16px; height: 2px;
          border-radius: 99px; background: currentColor; opacity: .7;
        }

        /* ═══════ GREETING (enhanced) ═══════ */
        .nav-greeting {
          font-size: 0.9rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          white-space: nowrap;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .dark .nav-greeting {
          background: linear-gradient(135deg, #a5b4fc, #c4b5fd);
          -webkit-background-clip: text;
          background-clip: text;
        }
        @media (max-width: 1100px) { .nav-greeting { display: none; } }

        .nav-spacer { flex: 1; }

        /* ═══════ ACTIONS ROW ═══════ */
        .nav-actions { display: flex; align-items: center; gap: 4px; }

        /* ── Base icon button ── */
        .nav-icon-btn {
          display: flex; align-items: center; justify-content: center;
          height: 34px; min-width: 34px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: transform .15s, box-shadow .15s, filter .15s;
          position: relative;
          font-family: var(--nav-font);
          font-size: .74rem; font-weight: 700;
          gap: 5px; padding: 0 10px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nav-icon-btn.icon-only { padding: 0; width: 34px; }
        .nav-icon-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .nav-icon-btn:active { transform: translateY(0); }
        .nav-icon-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }

        /* ── Search button: indigo ── */
        .nav-btn-search {
          background: linear-gradient(135deg, rgba(99,102,241,.12), rgba(99,102,241,.06));
          border-color: rgba(99,102,241,.25);
          color: #6366f1;
        }
        .nav-btn-search:hover { background: rgba(99,102,241,.18); box-shadow: 0 3px 12px rgba(99,102,241,.25); }
        .dark .nav-btn-search { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.3); color: #a5b4fc; }

        /* ── Notification button: amber ── */
        .nav-btn-notif {
          background: linear-gradient(135deg, rgba(245,158,11,.12), rgba(245,158,11,.06));
          border-color: rgba(245,158,11,.28);
          color: #d97706;
        }
        .nav-btn-notif:hover { background: rgba(245,158,11,.18); box-shadow: 0 3px 12px rgba(245,158,11,.25); }
        .dark .nav-btn-notif { background: rgba(245,158,11,.15); border-color: rgba(245,158,11,.3); color: #fbbf24; }

        /* ═══════ NOTIFICATION BADGE ═══════ */
        .nav-notif-badge {
          position: absolute; top: 4px; right: 4px;
          min-width: 15px; height: 15px; padding: 0 3px;
          border-radius: 99px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white; font-size: .55rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white; letter-spacing: 0;
        }
        .dark .nav-notif-badge { border-color: #0a0f1e; }

        /* ═══════ DROPDOWNS SHARED ═══════ */
        .nav-dropdown-wrap { position: relative; }
        @keyframes navDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        .nav-drop {
          position: absolute; right: 0; top: calc(100% + 10px);
          background: rgba(255,255,255,.99);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(0,0,0,.07);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
          overflow: hidden;
          animation: navDropIn .18s cubic-bezier(.16,1,.3,1);
          z-index: 60;
        }
        .dark .nav-drop {
          background: rgba(9,10,20,.98);
          border-color: rgba(255,255,255,.08);
          box-shadow: 0 12px 40px rgba(0,0,0,.5);
        }
        @media (max-width: 640px) {
          .nav-drop {
            position: fixed; top: 68px;
            left: 12px; right: 12px; width: auto;
          }
        }

        /* Search dropdown */
        .nav-search-drop { width: 300px; padding: 12px; }
        .nav-search-input {
          width: 100%; padding: 9px 13px;
          border: 1.5px solid rgba(99,102,241,.2);
          border-radius: 10px;
          font-family: var(--nav-font); font-size: .84rem;
          background: rgba(99,102,241,.04);
          outline: none; transition: border-color .15s, box-shadow .15s;
          color: #111827; box-sizing: border-box;
        }
        .nav-search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }
        .dark .nav-search-input {
          background: rgba(99,102,241,.08);
          border-color: rgba(99,102,241,.2); color: #f1f5f9;
        }
        .nav-search-item {
          padding: 8px 11px; border-radius: 8px;
          cursor: pointer; font-size: .82rem; color: #374151;
          transition: background .1s, color .1s; margin-top: 2px;
        }
        .nav-search-item:hover { background: rgba(99,102,241,.08); color: #6366f1; }
        .dark .nav-search-item { color: #cbd5e1; }

        /* Notification dropdown */
        .nav-notif-drop { width: 300px; }
        .nav-notif-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 13px 16px;
          border-bottom: 1px solid rgba(0,0,0,.05);
          font-size: .82rem; font-weight: 700; color: #0f172a;
        }
        .dark .nav-notif-head { border-bottom-color: rgba(255,255,255,.06); color: #f1f5f9; }
        .nav-notif-action {
          font-size: .7rem; font-weight: 700; color: #6366f1;
          background: none; border: none; cursor: pointer;
          font-family: var(--nav-font); transition: color .15s;
        }
        .nav-notif-action:hover { color: #4f46e5; }
        .nav-notif-item {
          padding: 11px 16px; border-bottom: 1px solid rgba(0,0,0,.04);
          cursor: pointer; transition: background .1s;
        }
        .nav-notif-item:last-child { border-bottom: none; }
        .nav-notif-item:hover { background: rgba(0,0,0,.02); }
        .dark .nav-notif-item:hover { background: rgba(255,255,255,.03); }
        .nav-notif-item.unread { background: rgba(99,102,241,.04); }
        .dark .nav-notif-item.unread { background: rgba(99,102,241,.07); }
        .nav-notif-text { font-size: .8rem; color: #334155; font-weight: 500; }
        .dark .nav-notif-text { color: #cbd5e1; }
        .nav-notif-time { font-size: .67rem; color: #94a3b8; margin-top: 3px; }
        .nav-notif-footer {
          padding: 9px 16px; text-align: center;
          border-top: 1px solid rgba(0,0,0,.05);
        }
        .dark .nav-notif-footer { border-top-color: rgba(255,255,255,.05); }
        .nav-notif-footer button {
          font-size: .77rem; font-weight: 700; color: #6366f1;
          background: none; border: none; cursor: pointer;
          font-family: var(--nav-font); transition: color .15s;
        }
        .nav-notif-footer button:hover { color: #4f46e5; }

        /* Generic option dropdown (reused in profile) */
        .nav-option-drop { width: 200px; padding: 6px; }
        .nav-option-btn {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 8px 11px; border-radius: 9px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--nav-font); font-size: .8rem; font-weight: 500;
          color: #374151; transition: background .1s, color .1s; text-align: left;
        }
        .nav-option-btn:hover { background: rgba(0,0,0,.04); }
        .nav-option-btn.selected { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-option-btn { color: #cbd5e1; }
        .dark .nav-option-btn:hover { background: rgba(255,255,255,.06); }
        .dark .nav-option-btn.selected { background: rgba(99,102,241,.18); color: #a5b4fc; }

        /* Font-specific preview */
        .nav-font-preview { font-size: .72rem; opacity: .6; margin-left: auto; }

        /* ═══════ PROFILE BUTTON ═══════ */
        .nav-profile-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 4px 10px 4px 4px;
          border-radius: 99px;
          border: 1.5px solid rgba(99,102,241,.2);
          background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.05));
          cursor: pointer; transition: all .18s;
          box-shadow: 0 1px 4px rgba(99,102,241,.08);
          font-family: var(--nav-font); flex-shrink: 0;
        }
        .nav-profile-btn:hover {
          border-color: rgba(99,102,241,.4);
          background: linear-gradient(135deg, rgba(99,102,241,.14), rgba(139,92,246,.1));
          box-shadow: 0 4px 14px rgba(99,102,241,.18);
          transform: translateY(-1px);
        }
        .nav-profile-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
        .dark .nav-profile-btn {
          background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(139,92,246,.1));
          border-color: rgba(99,102,241,.3);
        }
        .dark .nav-profile-btn:hover {
          background: linear-gradient(135deg, rgba(99,102,241,.26), rgba(139,92,246,.18));
          border-color: rgba(99,102,241,.5);
        }
        .nav-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #0F172A, #6366f1);
          color: #fff; font-size: .64rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; letter-spacing: .02em;
        }
        .nav-avatar-wrap { position: relative; }
        .nav-status-dot {
          position: absolute; bottom: 0; right: 0;
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981; border: 2px solid white;
        }
        .dark .nav-status-dot { border-color: #0a0f1e; }
        .nav-profile-name {
          font-size: .78rem; font-weight: 700; color: #1e293b;
          letter-spacing: -.01em; max-width: 78px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dark .nav-profile-name { color: #e2e8f0; }
        @media (max-width: 480px) {
          .nav-profile-name { display: none; }
          .nav-profile-btn { padding: 4px; border-radius: 50%; }
        }
        .nav-chevron { color: #94a3b8; transition: transform .18s; flex-shrink: 0; }
        .nav-chevron.open { transform: rotate(180deg); }
        @media (max-width: 480px) { .nav-chevron { display: none; } }

        /* ── Profile dropdown ── */
        .nav-profile-drop { width: 260px; }
        .nav-profile-head {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,.05);
          background: linear-gradient(135deg, rgba(99,102,241,.05), rgba(139,92,246,.03));
        }
        .dark .nav-profile-head {
          border-bottom-color: rgba(255,255,255,.05);
          background: rgba(99,102,241,.06);
        }
        .nav-profile-head-name { font-size: .87rem; font-weight: 800; color: #0f172a; }
        .dark .nav-profile-head-name { color: #f1f5f9; }
        .nav-profile-head-role { font-size: .69rem; color: #94a3b8; margin-top: 3px; }
        .nav-drop-body { padding: 6px; }
        .nav-dd-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 8px 10px; border-radius: 9px;
          border: none; background: transparent; cursor: pointer;
          font-size: .8rem; font-weight: 500; font-family: var(--nav-font);
          color: #334155; text-align: left;
          transition: background .1s, color .1s;
        }
        .nav-dd-item:hover { background: rgba(0,0,0,.04); color: #0f172a; }
        .dark .nav-dd-item { color: #cbd5e1; }
        .dark .nav-dd-item:hover { background: rgba(255,255,255,.06); color: #f1f5f9; }
        .nav-dd-item.active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-dd-item.active { background: rgba(99,102,241,.18); color: #a5b4fc; }
        .nav-dd-item.danger { color: #dc2626; }
        .nav-dd-item.danger:hover { background: rgba(239,68,68,.07); }
        .nav-dd-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dark .nav-dd-icon { background: rgba(255,255,255,.07); }
        .nav-divider { height: 1px; background: rgba(0,0,0,.05); margin: 5px 10px; }
        .dark .nav-divider { background: rgba(255,255,255,.06); }

        /* ═══════ SIDEBAR TOGGLE & MOBILE BTN ═══════ */
        .nav-sidebar-toggle {
          display: none; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px;
          border: 1.5px solid rgba(99,102,241,.15);
          background: rgba(99,102,241,.06);
          cursor: pointer; color: #6366f1;
          transition: background .15s, color .15s, transform .15s;
          flex-shrink: 0;
        }
        @media (min-width: 768px) { .nav-sidebar-toggle { display: flex; } }
        .nav-sidebar-toggle:hover {
          background: rgba(99,102,241,.12);
          transform: scale(1.05);
        }
        .dark .nav-sidebar-toggle {
          border-color: rgba(99,102,241,.25); color: #a5b4fc;
          background: rgba(99,102,241,.1);
        }

        .nav-mobile-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px;
          border: 1.5px solid rgba(99,102,241,.15);
          background: rgba(99,102,241,.06);
          cursor: pointer; color: #6366f1;
          transition: background .15s, transform .15s;
          flex-shrink: 0;
        }
        @media (min-width: 768px) { .nav-mobile-btn { display: none; } }
        .nav-mobile-btn:hover { background: rgba(99,102,241,.12); transform: scale(1.05); }
        .dark .nav-mobile-btn {
          border-color: rgba(99,102,241,.25); color: #a5b4fc;
          background: rgba(99,102,241,.1);
        }

        /* ═══════ OVERLAY ═══════ */
        .nav-overlay {
          position: fixed; inset: 0; z-index: 59;
          background: rgba(0,0,0,.3); backdrop-filter: blur(2px);
          animation: navFadeIn .15s ease;
        }
        @keyframes navFadeIn { from{opacity:0} to{opacity:1} }

        /* ═══════ MOBILE DRAWER ═══════ */
        .nav-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(300px, 88vw);
          background: rgba(255,255,255,.99);
          backdrop-filter: blur(24px); z-index: 101;
          display: flex; flex-direction: column;
          animation: navSlideLeft .22s cubic-bezier(.16,1,.3,1);
          border-left: 1px solid rgba(0,0,0,.06);
          box-shadow: -8px 0 48px rgba(0,0,0,.14);
        }
        .dark .nav-drawer {
          background: rgba(9,10,20,.99);
          border-left-color: rgba(255,255,255,.06);
        }
        @keyframes navSlideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .nav-drawer-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 18px; border-bottom: 1px solid rgba(0,0,0,.05);
          background: linear-gradient(135deg, rgba(99,102,241,.06), rgba(139,92,246,.03));
          flex-shrink: 0;
        }
        .dark .nav-drawer-header {
          border-bottom-color: rgba(255,255,255,.05);
          background: rgba(99,102,241,.08);
        }
        .nav-drawer-title {
          font-size: .95rem; font-weight: 800; color: #0f172a; letter-spacing: -.02em;
        }
        .dark .nav-drawer-title { color: #f1f5f9; }
        .nav-drawer-close {
          width: 32px; height: 32px; border-radius: 9px;
          border: none; background: rgba(0,0,0,.05);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #64748b; transition: background .15s, color .15s;
        }
        .nav-drawer-close:hover { background: rgba(239,68,68,.1); color: #dc2626; }
        .dark .nav-drawer-close { background: rgba(255,255,255,.07); }

        .nav-drawer-user {
          padding: 14px 18px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
        }
        .dark .nav-drawer-user { border-bottom-color: rgba(255,255,255,.05); }
        .nav-drawer-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #0F172A, #6366f1);
          color: #fff; font-size: .78rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          box-shadow: 0 4px 12px rgba(99,102,241,.35);
        }
        .nav-drawer-status {
          position: absolute; bottom: 0; right: 0;
          width: 9px; height: 9px; border-radius: 50%;
          background: #10b981; border: 2px solid white;
        }
        .dark .nav-drawer-status { border-color: #0a0f1e; }
        .nav-drawer-name { font-size: .88rem; font-weight: 700; color: #0f172a; letter-spacing: -.01em; }
        .dark .nav-drawer-name { color: #f1f5f9; }
        .nav-drawer-role { font-size: .7rem; color: #94a3b8; margin-top: 2px; }

        .nav-drawer-body { padding: 8px 10px; flex: 1; overflow-y: auto; overscroll-behavior: contain; }
        .nav-drawer-section {
          font-size: .59rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: .1em; color: #94a3b8; padding: 10px 10px 4px;
        }
        .nav-drawer-link {
          display: flex; align-items: center; gap: 11px;
          padding: 9px 11px; border-radius: 10px; text-decoration: none;
          font-size: .82rem; font-weight: 600; color: #334155;
          transition: background .1s, color .1s; margin-bottom: 1px;
          border: none; background: transparent; cursor: pointer;
          width: 100%; font-family: var(--nav-font); text-align: left;
          box-sizing: border-box;
        }
        .nav-drawer-link:hover { background: rgba(99,102,241,.08); color: #6366f1; }
        .nav-drawer-link.active { background: rgba(99,102,241,.1); color: #6366f1; font-weight: 700; }
        .dark .nav-drawer-link { color: #cbd5e1; }
        .dark .nav-drawer-link:hover { background: rgba(99,102,241,.12); color: #a5b4fc; }
        .dark .nav-drawer-link.active { color: #a5b4fc; background: rgba(99,102,241,.14); }
        .nav-drawer-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(0,0,0,.04);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dark .nav-drawer-icon { background: rgba(255,255,255,.06); }

        .nav-drawer-footer {
          padding: 10px 18px 20px;
          border-top: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
        }
        .dark .nav-drawer-footer { border-top-color: rgba(255,255,255,.05); }
        .nav-drawer-signout {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px; border-radius: 11px;
          border: none; background: rgba(239,68,68,.07);
          cursor: pointer; font-size: .82rem; font-weight: 700;
          font-family: var(--nav-font); color: #dc2626;
          text-align: left; transition: background .12s;
        }
        .nav-drawer-signout:hover { background: rgba(239,68,68,.14); }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
        }
      `}</style>

      <nav className={`nav-root ${scrolled ? 'scrolled' : 'flat'}`} role="navigation" aria-label="Main navigation">

        {/* Sidebar toggle — desktop only */}
        <button
          className="nav-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar (Ctrl+B)"
        >
          <FiMenu size={17} />
        </button>

        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="Academe home">
          <div className="nav-logo-mark">
            <FiZap size={16} color="#f59e0b" />
          </div>
          <span className="nav-logo-text">Academe</span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" role="menubar">
          {navLinks.map(({ path, label, icon: Icon, color, accent }) => {
            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`nav-link${isActive ? ` active-${accent}` : ''}`}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={12} color={isActive ? undefined : color} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="nav-spacer" />

        {/* Enhanced greeting */}
        <span className="nav-greeting">
          <span role="img" aria-label="greeting icon">🌟</span>
          {getGreeting()}, {user?.full_name?.split(' ')[0] ?? 'User'}
        </span>

        <div className="nav-actions">

          {/* ── Search ── */}
          <div className="nav-dropdown-wrap" ref={searchRef}>
            <button
              className="nav-icon-btn icon-only nav-btn-search"
              onClick={() => setSearchOpen(o => !o)}
              aria-label="Search (press /)"
              title="Search (press /)"
            >
              <FiSearch size={15} />
            </button>
            {searchOpen && (
              <div className="nav-drop nav-search-drop">
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
                        className="nav-search-item"
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

          {/* ── Notifications ── */}
          <div className="nav-dropdown-wrap">
            <button
              className="nav-icon-btn icon-only nav-btn-notif"
              onClick={() => { closeAll(); setNotifOpen(o => !o); }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <FiBell size={15} />
              {unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <>
                <div className="nav-overlay" onClick={() => setNotifOpen(false)} />
                <div className="nav-drop nav-notif-drop">
                  <div className="nav-notif-head">
                    Notifications
                    <button className="nav-notif-action" onClick={markAllRead}>Mark all read</button>
                  </div>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`nav-notif-item${!n.read ? ' unread' : ''}`}
                      onClick={() => {
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                        setNotifOpen(false); navigate('/notifications');
                      }}
                    >
                      <div className="nav-notif-text">{n.text}</div>
                      <div className="nav-notif-time">{n.time}</div>
                    </div>
                  ))}
                  <div className="nav-notif-footer">
                    <button onClick={() => { setNotifOpen(false); navigate('/notifications'); }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Profile (contains theme & font inside dropdown) ── */}
          <div className="nav-dropdown-wrap">
            <button
              className="nav-profile-btn"
              onClick={() => { closeAll(); setProfileOpen(o => !o); }}
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              <div className="nav-avatar-wrap">
                <div className="nav-avatar">{initials}</div>
                <span className="nav-status-dot" aria-label="Online" />
              </div>
              <span className="nav-profile-name">{user?.full_name?.split(' ')[0] ?? 'User'}</span>
              <FiChevronDown size={12} className={`nav-chevron${profileOpen ? ' open' : ''}`} />
            </button>
            {profileOpen && (
              <>
                <div className="nav-overlay" onClick={() => setProfileOpen(false)} />
                <div className="nav-drop nav-profile-drop">
                  <div className="nav-profile-head">
                    <p className="nav-profile-head-name">{user?.full_name}</p>
                    <p className="nav-profile-head-role">{user?.class_name ?? 'Student'}</p>
                  </div>
                  <div className="nav-drop-body">
                    <button className="nav-dd-item" onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiUser size={13} /></span> Profile
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/sessions'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiShield size={13} /></span> Active Sessions
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/contact'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiHelpCircle size={13} /></span> Help & Support
                    </button>
                    <div className="nav-divider" />
                    {/* Theme options */}
                    {themes.map(t => (
                      <button
                        key={t.id}
                        className={`nav-dd-item${theme === t.id ? ' active' : ''}`}
                        onClick={() => { setTheme(t.id); setProfileOpen(false); }}
                      >
                        <span className="nav-dd-icon"><t.icon size={13} /></span> {t.label} Theme
                      </button>
                    ))}
                    <div className="nav-divider" />
                    {/* Font options */}
                    {fonts.map(f => (
                      <button
                        key={f.id}
                        className={`nav-dd-item${currentFont === f.id ? ' active' : ''}`}
                        onClick={() => { setCurrentFont(f.id); setProfileOpen(false); }}
                        style={{ fontFamily: f.fontFamily }}
                      >
                        <span className="nav-dd-icon"><FiType size={13} /></span> {f.label}
                      </button>
                    ))}
                    {isLeader && (
                      <>
                        <div className="nav-divider" />
                        <button className="nav-dd-item" onClick={() => { navigate('/governance'); setProfileOpen(false); }}>
                          <span className="nav-dd-icon"><FiBarChart2 size={13} /></span> Governance
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button className="nav-dd-item" onClick={() => { navigate('/admin'); setProfileOpen(false); }}>
                        <span className="nav-dd-icon"><FiSettings size={13} /></span> Admin Panel
                      </button>
                    )}
                    <div className="nav-divider" />
                    <button className="nav-dd-item danger" onClick={() => { logout(); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiLogOut size={13} /></span> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <FiMenu size={18} />
          </button>
        </div>

        {/* MOBILE DRAWER */}
        {mobileOpen && (
          <>
            <div className="nav-overlay" style={{ zIndex: 100 }} onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
              <div className="nav-drawer-header">
                <span className="nav-drawer-title">Navigation</span>
                <button className="nav-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                  <FiX size={16} />
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
                <p className="nav-drawer-section">Pages</p>
                {navLinks.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path ||
                    (path !== '/' && location.pathname.startsWith(path));
                  return (
                    <Link
                      key={path} to={path}
                      onClick={() => setMobileOpen(false)}
                      className={`nav-drawer-link${isActive ? ' active' : ''}`}
                    >
                      <span className="nav-drawer-icon"><Icon size={14} /></span>
                      {label}
                    </Link>
                  );
                })}

                {isLeader && (
                  <>
                    <p className="nav-drawer-section" style={{ marginTop: 12 }}>Governance</p>
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

                <p className="nav-drawer-section" style={{ marginTop: 12 }}>Theme</p>
                {themes.map(t => (
                  <button key={t.id}
                    className={`nav-drawer-link${theme === t.id ? ' active' : ''}`}
                    onClick={() => setTheme(t.id)}>
                    <span className="nav-drawer-icon"><t.icon size={14} /></span> {t.label} Theme
                  </button>
                ))}

                <p className="nav-drawer-section" style={{ marginTop: 12 }}>Font</p>
                {fonts.map(f => (
                  <button key={f.id}
                    className={`nav-drawer-link${currentFont === f.id ? ' active' : ''}`}
                    onClick={() => setCurrentFont(f.id)}
                    style={{ fontFamily: f.fontFamily }}>
                    <span className="nav-drawer-icon"><FiType size={14} /></span> {f.label}
                  </button>
                ))}

                <p className="nav-drawer-section" style={{ marginTop: 12 }}>Account</p>
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