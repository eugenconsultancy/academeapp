// Navbar.jsx — Academe · Optimised · React Query · CSS external · Dark/Light
// "Create" dropdown replaced with direct public‑path buttons:
//   • Request Announcement
//   • My Tickets (Support)
//   • Contact Us
//   • Blog (existing nav link already covers this)

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiMenu, FiX, FiZap, FiChevronDown,
  FiUser, FiSettings, FiLogOut, FiHelpCircle,
  FiHome, FiBell, FiBook, FiBookOpen,
  FiSun, FiMoon, FiMonitor, FiSearch, FiType,
  FiMessageSquare, FiCheck, FiCheckCircle, FiTrash2,
  FiShield, FiBarChart2, FiPlusCircle, FiBriefcase,
  FiPackage, FiHeadphones, FiMail, FiFileText,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFont, FONT_REGISTRY } from '../../contexts/FontContext';
import chatApi from '../../api/chatApi';
import apiClient from '../../api/client';
import './Navbar.css';

// ─── Static config ────────────────────────────────────────────────────────
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

// Public quick‑action items – no role restrictions
const publicQuickItems = [
  { label: 'Request Announcement', icon: FiBell, path: '/announcements/requests/new' },
  { label: 'My Tickets', icon: FiHeadphones, path: '/my-tickets' },
  { label: 'Contact Us', icon: FiMail, path: '/contact' },
];

// ─── Fetch helpers (used by React Query) ─────────────────────────────────
const fetchNotifications = async () => {
  const res = await apiClient.get('/notifications/', { params: { page_size: 20 } });
  return res.data.results ?? res.data ?? [];
};

const fetchChatBadge = async () => {
  const res = await chatApi.getConversations();
  const convs = res.data?.conversations ?? res.data ?? [];
  return convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
};

// ─── Utility ─────────────────────────────────────────────────────────────
const formatTime = ts => {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
};

// ─── Avatar component (image with initials fallback) ─────────────────────
function UserAvatar({ user, initials, size = 28, className = 'nav-avatar' }) {
  const [imgError, setImgError] = useState(false);
  const src = user?.profile_pic;

  return (
    <div className={className} style={{ width: size, height: size }}>
      {src && !imgError ? (
        <img
          src={src}
          alt={user?.full_name ?? 'User'}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="nav-avatar-initials">{initials}</span>
      )}
      <span className="nav-online-dot" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function Navbar({ onToggleSidebar }) {
  const { theme, setTheme } = useTheme();
  const { currentFont, changeFont, fontKeys } = useFont();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  // UI state
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [allReadLocally, setAllReadLocally] = useState(false);

  // Refs for click‑outside
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────
  const initials = useMemo(() =>
    user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?',
    [user?.full_name]);

  const firstName = useMemo(() =>
    user?.full_name?.split(' ')[0] ?? 'User',
    [user?.full_name]);

  const isAdmin = user?.role === 'admin';
  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }, []);

  // ── React Query: notifications ────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading: notifLoading,
    isError: notifError,
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 15_000,
    onSuccess: data => {
      if (!data.some(n => !n.read)) setAllReadLocally(false);
    },
  });

  // ── React Query: chat badge ───────────────────────────────────────────
  const { data: chatBadge = 0 } = useQuery({
    queryKey: ['chatBadge'],
    queryFn: fetchChatBadge,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const unreadCount = useMemo(() => {
    if (allReadLocally) return 0;
    return notifications.filter(n => !n.read).length;
  }, [notifications, allReadLocally]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const closeAll = useCallback(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
    setQuickOpen(false);
  }, []);

  const isActive = useCallback(path =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname]);

  // ── Scroll detection ──────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Click‑outside ─────────────────────────────────────────────────────
  useEffect(() => {
    const refs = [searchRef, notifRef, profileRef, quickRef];
    const setters = [setSearchOpen, setNotifOpen, setProfileOpen, setQuickOpen];

    const handler = e => {
      refs.forEach((ref, i) => {
        if (ref.current && !ref.current.contains(e.target)) setters[i](false);
      });
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') { closeAll(); setMobileOpen(false); }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        closeAll();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeAll]);

  // ── Mobile scroll lock ────────────────────────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      const y = window.scrollY;
      document.body.style.cssText = `position:fixed;top:-${y}px;width:100%;overflow-y:scroll;`;
    } else {
      const y = document.body.style.top;
      document.body.style.cssText = '';
      if (y) window.scrollTo(0, parseInt(y) * -1);
    }
    return () => { document.body.style.cssText = ''; };
  }, [mobileOpen]);

  // ── Action handlers ───────────────────────────────────────────────────
  const handleChatClick = useCallback(() => {
    closeAll();
    setMobileOpen(false);
    navigate('/chats');
    qc.setQueryData(['chatBadge'], 0);
  }, [closeAll, navigate, qc]);

  const markAllRead = useCallback(async () => {
    setAllReadLocally(true);
    qc.setQueryData(['notifications'], old =>
      (old ?? []).map(n => ({ ...n, read: true }))
    );
    try { await apiClient.post('/notifications/mark-all-read/'); } catch { /* silent */ }
  }, [qc]);

  const markOneRead = useCallback(async (id) => {
    qc.setQueryData(['notifications'], old =>
      (old ?? []).map(n => n.id === id ? { ...n, read: true } : n)
    );
    try { await apiClient.post(`/notifications/${id}/read/`); } catch { /* silent */ }
  }, [qc]);

  const deleteNotif = useCallback(async (e, id) => {
    e.stopPropagation();
    qc.setQueryData(['notifications'], old => (old ?? []).filter(n => n.id !== id));
    try { await apiClient.delete(`/notifications/${id}/`); } catch { /* silent */ }
  }, [qc]);

  const handleFontChange = useCallback(key => {
    changeFont(key);
    closeAll();
  }, [changeFont, closeAll]);

  const handleNav = useCallback((path) => {
    navigate(path);
    closeAll();
    setMobileOpen(false);
  }, [navigate, closeAll]);

  // ── Filtered search results ───────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return NAV_LINKS;
    const q = searchQuery.toLowerCase();
    return NAV_LINKS.filter(l => l.label.toLowerCase().includes(q));
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <nav
      className={`nav-root${scrolled ? ' scrolled' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Sidebar toggle */}
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
            key={path}
            to={path}
            className={`nav-link${isActive(path) ? ` act-${accent}` : ''}`}
            role="menuitem"
            aria-current={isActive(path) ? 'page' : undefined}
          >
            <Icon size={13} />{label}
          </Link>
        ))}
      </div>

      <div className="nav-spacer" />

      <span className="nav-greeting">
        Good {greeting}, {firstName} 👋
      </span>

      <div className="nav-actions">

        {/* ── Search ── */}
        <div className="nav-drop-wrap" ref={searchRef}>
          <button
            className="nav-icon-btn nav-btn-search"
            onClick={() => { closeAll(); setSearchOpen(o => !o); }}
            aria-label="Search"
            title="Search (press /)"
          >
            <FiSearch size={14} />
            <span className="nav-btn-label">Search</span>
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
              {!searchQuery && <p className="nav-search-hint">Quick jump</p>}
              {searchResults.map(l => (
                <div
                  key={l.path}
                  className="nav-search-item"
                  onClick={() => { handleNav(l.path); setSearchQuery(''); }}
                >
                  <l.icon size={13} style={{ color: 'var(--nav-primary)' }} />
                  {l.label}
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="nav-search-hint">No results for "{searchQuery}"</p>
              )}
            </div>
          )}
        </div>

        {/* ── Quick create (public paths only) ── */}
        <div className="nav-drop-wrap" ref={quickRef}>
          <button
            className="nav-icon-btn nav-btn-create"
            onClick={() => { closeAll(); setQuickOpen(o => !o); }}
            aria-label="Quick actions"
            title="Quick actions"
          >
            <FiPlusCircle size={14} />
            <span className="nav-btn-label">Quick</span>
          </button>

          {quickOpen && (
            <div className="nav-drop nav-create-drop">
              <p className="nav-create-header">Quick actions</p>
              {publicQuickItems.map(item => (
                <button
                  key={item.path}
                  className="nav-dd-item"
                  onClick={() => handleNav(item.path)}
                >
                  <span className="nav-dd-icon"><item.icon size={13} /></span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat ── */}
        <button
          className="nav-icon-btn nav-btn-chat"
          onClick={handleChatClick}
          aria-label={`Chat${chatBadge > 0 ? ` (${chatBadge} unread)` : ''}`}
          title="Messages"
        >
          <FiMessageSquare size={14} />
          <span className="nav-btn-label">Chat</span>
          {chatBadge > 0 && (
            <span className="nav-badge nb-green">
              {chatBadge > 99 ? '99+' : chatBadge}
            </span>
          )}
        </button>

        {/* ── Notifications ── */}
        <div className="nav-drop-wrap" ref={notifRef}>
          <button
            className="nav-icon-btn nav-btn-notif"
            onClick={() => {
              closeAll();
              setNotifOpen(o => !o);
              if (!notifOpen) refetchNotifs();
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            title="Notifications"
          >
            <FiBell size={14} />
            <span className="nav-btn-label">Alerts</span>
            {unreadCount > 0 && (
              <span className="nav-badge nb-amber">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="nav-drop nav-notif-drop">
              <div className="nav-notif-head">
                <span className="nav-notif-head-title">
                  Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {unreadCount > 0 && (
                    <button className="nav-notif-action" onClick={markAllRead}>
                      <FiCheckCircle size={11} /> All read
                    </button>
                  )}
                  <button
                    className="nav-notif-action"
                    onClick={() => refetchNotifs()}
                    title="Refresh"
                    aria-label="Refresh notifications"
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="nav-notif-list">
                {notifLoading && (
                  <div className="nav-notif-empty">
                    <div className="nav-spin" />
                    Loading…
                  </div>
                )}
                {!notifLoading && notifError && (
                  <div className="nav-notif-empty">Could not load notifications</div>
                )}
                {!notifLoading && !notifError && notifications.length === 0 && (
                  <div className="nav-notif-empty">
                    <FiBell size={22} style={{ opacity: 0.3 }} />
                    You're all caught up!
                  </div>
                )}
                {!notifLoading && notifications.map(n => (
                  <div
                    key={n.id}
                    className={`nav-notif-item${(!n.read && !allReadLocally) ? ' unread' : ''}`}
                    onClick={() => {
                      markOneRead(n.id);
                      setNotifOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <span className={`nav-notif-dot${(n.read || allReadLocally) ? ' read' : ''}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nav-notif-text">{n.text || n.message || n.body}</div>
                      <div className="nav-notif-time">{formatTime(n.created_at || n.timestamp)}</div>
                    </div>
                    <button
                      className="nav-notif-del"
                      onClick={e => deleteNotif(e, n.id)}
                      aria-label="Delete notification"
                    >
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

        {/* ── Profile dropdown ── */}
        <div className="nav-drop-wrap" ref={profileRef}>
          <button
            className="nav-profile-btn"
            onClick={() => { closeAll(); setProfileOpen(o => !o); }}
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <UserAvatar user={user} initials={initials} size={28} className="nav-avatar" />
            <span className="nav-profile-name">{firstName}</span>
            <FiChevronDown size={11} className={`nav-chevron${profileOpen ? ' open' : ''}`} />
          </button>

          {profileOpen && (
            <div className="nav-drop nav-profile-drop">
              {/* Profile head */}
              <div className="nav-profile-head">
                <div className="nav-profile-head-av">
                  {user?.profile_pic
                    ? <img src={user.profile_pic} alt={user.full_name} onError={e => e.target.style.display = 'none'} />
                    : initials
                  }
                </div>
                <div>
                  <p className="nav-profile-head-name">{user?.full_name}</p>
                  <p className="nav-profile-head-role">{user?.class_name ?? 'Student'}</p>
                </div>
              </div>

              <div className="nav-drop-body">
                {/* Account */}
                <p className="nav-dd-section">Account</p>
                <button className="nav-dd-item" onClick={() => handleNav('/profile')}>
                  <span className="nav-dd-icon"><FiUser size={13} /></span> Profile
                </button>
                <button className="nav-dd-item" onClick={handleChatClick}>
                  <span className="nav-dd-icon"><FiMessageSquare size={13} /></span>
                  Messages
                  {chatBadge > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '.62rem', fontWeight: 800,
                      color: '#059669', background: 'rgba(16,185,129,.1)',
                      padding: '2px 6px', borderRadius: 999
                    }}>{chatBadge}</span>
                  )}
                </button>
                <button className="nav-dd-item" onClick={() => handleNav('/sessions')}>
                  <span className="nav-dd-icon"><FiShield size={13} /></span> Active Sessions
                </button>
                <button className="nav-dd-item" onClick={() => handleNav('/contact')}>
                  <span className="nav-dd-icon"><FiHelpCircle size={13} /></span> Help & Support
                </button>

                {/* Theme */}
                <div className="nav-dd-div" />
                <p className="nav-dd-section">Theme</p>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`nav-dd-item${theme === t.id ? ' dd-active' : ''}`}
                    onClick={() => { setTheme(t.id); closeAll(); }}
                  >
                    <span className="nav-dd-icon"><t.icon size={13} /></span>
                    {t.label}
                    {theme === t.id && <FiCheck size={11} style={{ marginLeft: 'auto', opacity: 0.7 }} />}
                  </button>
                ))}

                {/* Font */}
                <div className="nav-dd-div" />
                <p className="nav-dd-section">Font</p>
                {fontKeys.map(key => {
                  const fd = FONT_REGISTRY[key];
                  const active = currentFont === key;
                  return (
                    <button
                      key={key}
                      className={`nav-dd-item${active ? ' dd-active' : ''}`}
                      onClick={() => handleFontChange(key)}
                      style={{ fontFamily: fd.family }}
                    >
                      <span className="nav-dd-icon"><FiType size={13} /></span>
                      <span style={{ flex: 1 }}>{fd.label}</span>
                      <span style={{ fontSize: '.6rem', color: 'var(--nav-text-3)' }}>{fd.preview}</span>
                      {active && <FiCheck size={11} style={{ marginLeft: 4, opacity: 0.7, flexShrink: 0 }} />}
                    </button>
                  );
                })}

                {/* Leadership */}
                {isLeader && (
                  <>
                    <div className="nav-dd-div" />
                    <p className="nav-dd-section">Leadership</p>
                    <button className="nav-dd-item" onClick={() => handleNav('/governance')}>
                      <span className="nav-dd-icon"><FiBarChart2 size={13} /></span> Governance
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button className="nav-dd-item" onClick={() => handleNav('/admin')}>
                    <span className="nav-dd-icon"><FiSettings size={13} /></span> Admin Panel
                  </button>
                )}

                {/* Sign out */}
                <div className="nav-dd-div" />
                <button className="nav-dd-item danger" onClick={() => { logout(); closeAll(); }}>
                  <span className="nav-dd-icon"><FiLogOut size={13} /></span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu size={17} />
        </button>
      </div>

      {/* ════════════════════════════════════
          MOBILE DRAWER
          ════════════════════════════════════ */}
      {mobileOpen && (
        <>
          <div className="nav-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="nav-drawer-header">
              <span className="nav-drawer-title">Academe</span>
              <button className="nav-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <FiX size={15} />
              </button>
            </div>

            <div className="nav-drawer-user">
              <div className="nav-drawer-avatar">
                {user?.profile_pic
                  ? <img src={user.profile_pic} alt={user.full_name} onError={e => e.target.style.display = 'none'} />
                  : initials
                }
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

              <p className="nav-drawer-section" style={{ marginTop: 10 }}>Quick Actions</p>
              {publicQuickItems.map(item => (
                <button key={item.path} className="nav-drawer-link" onClick={() => handleNav(item.path)}>
                  <span className="nav-drawer-icon"><item.icon size={14} /></span>{item.label}
                </button>
              ))}

              <p className="nav-drawer-section" style={{ marginTop: 10 }}>Messaging</p>
              <button className={`nav-drawer-link${location.pathname.startsWith('/chats') ? ' active' : ''}`}
                onClick={handleChatClick}>
                <span className="nav-drawer-icon"><FiMessageSquare size={14} /></span> Chat
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
                  {theme === t.id && <FiCheck size={12} style={{ marginLeft: 'auto', opacity: 0.7 }} />}
                </button>
              ))}

              <p className="nav-drawer-section" style={{ marginTop: 10 }}>Font</p>
              {fontKeys.map(key => {
                const fd = FONT_REGISTRY[key];
                const active = currentFont === key;
                return (
                  <button key={key} className={`nav-drawer-link${active ? ' active' : ''}`}
                    onClick={() => { changeFont(key); setMobileOpen(false); }}
                    style={{ fontFamily: fd.family }}>
                    <span className="nav-drawer-icon"><FiType size={14} /></span>
                    <span style={{ flex: 1 }}>{fd.label}</span>
                    {active && <FiCheck size={12} style={{ opacity: 0.7 }} />}
                  </button>
                );
              })}

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
  );
}