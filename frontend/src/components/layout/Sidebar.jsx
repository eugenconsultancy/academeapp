import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiPackage, FiBell, FiBriefcase, FiBook,
  FiUser, FiHelpCircle, FiInfo, FiShield, FiSettings,
  FiChevronLeft, FiChevronRight, FiBookOpen, FiEdit3,
  FiMapPin, FiNavigation
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const mainItems = [
    { path: '/', icon: FiHome, label: 'Home', color: '#6366f1' },
    { path: '/announcements', icon: FiBell, label: 'Announcements', color: '#f59e0b' },
    { path: '/blog', icon: FiBookOpen, label: 'Blog', color: '#ec4899' },
    { path: '/opportunities', icon: FiBriefcase, label: 'Opportunities', color: '#10b981' },
    { path: '/found-items', icon: FiPackage, label: 'Found Items', color: '#3b82f6' },
    { path: '/classes', icon: FiBook, label: 'Classes', color: '#8b5cf6' },
    { path: '/nearby-classes', icon: FiNavigation, label: 'Nearby Classes', color: '#06b6d4' },
    { path: '/campus-map', icon: FiMapPin, label: 'Campus Map', color: '#84cc16' },
  ];

  const accountItems = [
    { path: '/profile', icon: FiUser, label: 'Profile', color: '#6366f1' },
    { path: '/contact', icon: FiHelpCircle, label: 'Contact', color: '#10b981' },
    { path: '/about', icon: FiInfo, label: 'About', color: '#f59e0b' },
    { path: '/privacy', icon: FiShield, label: 'Privacy', color: '#06b6d4' },
  ];

  // Geo items get a special pill badge
  const geoItems = new Set(['/nearby-classes', '/campus-map']);

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const W_EXPANDED = 238;
  const W_COLLAPSED = 66;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --sb-w-expanded:  ${W_EXPANDED}px;
          --sb-w-collapsed: ${W_COLLAPSED}px;
          --geo-cyan:   #06b6d4;
          --geo-lime:   #84cc16;
        }

        /* ── Mobile backdrop ── */
        .sb-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.38);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 38;
          animation: sbFadeIn 0.2s ease both;
        }
        @keyframes sbFadeIn { from{opacity:0} to{opacity:1} }

        /* ── Root sidebar ── */
        .sb-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          position: fixed;
          left: 0; top: 60px; bottom: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          width: var(--sb-current-w, ${W_EXPANDED}px);
          transition: width 0.26s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-right: 1px solid rgba(0,0,0,0.055);
          box-shadow: 2px 0 24px rgba(0,0,0,0.06);
        }
        .dark .sb-root {
          background: rgba(9,10,20,0.94);
          border-right-color: rgba(255,255,255,0.05);
          box-shadow: 2px 0 24px rgba(0,0,0,0.38);
        }

        .sb-root.sb-expanded  { --sb-current-w: ${W_EXPANDED}px;  width: ${W_EXPANDED}px;  }
        .sb-root.sb-collapsed { --sb-current-w: ${W_COLLAPSED}px; width: ${W_COLLAPSED}px; }

        /* ── Toggle button ── */
        .sb-toggle {
          position: absolute;
          right: -11px; top: 22px;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg,#ea580c,#f97316);
          color: #fff;
          border: 2.5px solid rgba(255,255,255,0.95);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 45;
          box-shadow: 0 2px 10px rgba(234,88,12,0.4);
          transition: transform 0.2s, background 0.2s;
          padding: 0; flex-shrink: 0;
        }
        .dark .sb-toggle { border-color: rgba(9,10,20,0.95); }
        .sb-toggle:hover {
          background: linear-gradient(135deg,#c2410c,#ea580c);
          transform: scale(1.14);
        }

        /* ── Scrollable content ── */
        .sb-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 6px;
          scrollbar-width: none;
        }
        .sb-content::-webkit-scrollbar { display: none; }

        /* ── Section label ── */
        .sb-section {
          font-size: 0.58rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #c4c9d8;
          padding: 10px 10px 5px;
          white-space: nowrap;
          overflow: hidden;
          max-width: 100%;
          opacity: 1;
          transition: opacity 0.18s ease, max-height 0.18s ease;
        }
        .dark .sb-section { color: #374151; }
        .sb-root.sb-collapsed .sb-section {
          opacity: 0;
          pointer-events: none;
          max-height: 0;
          padding-top: 0; padding-bottom: 0;
        }

        /* ── Geo section header ── */
        .sb-section-geo {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.58rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.12em;
          padding: 10px 10px 5px;
          white-space: nowrap; overflow: hidden; max-width: 100%;
          opacity: 1;
          transition: opacity 0.18s ease, max-height 0.18s ease;
          background: linear-gradient(90deg, var(--geo-cyan), var(--geo-lime));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .sb-root.sb-collapsed .sb-section-geo {
          opacity: 0; pointer-events: none; max-height: 0;
          padding-top: 0; padding-bottom: 0;
        }

        /* ── Divider ── */
        .sb-divider {
          height: 1px;
          background: rgba(0,0,0,0.05);
          margin: 6px 8px;
          transition: margin 0.26s;
        }
        .dark .sb-divider { background: rgba(255,255,255,0.05); }
        .sb-root.sb-collapsed .sb-divider { margin: 6px 12px; }

        /* Geo divider has a gradient tint */
        .sb-divider-geo {
          height: 1px;
          margin: 6px 8px;
          background: linear-gradient(90deg, rgba(6,182,212,0.25), rgba(132,204,22,0.25));
          transition: margin 0.26s;
        }

        /* ── Nav item ── */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 11px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.845rem;
          font-weight: 600;
          color: #6b7280;
          transition:
            background 0.16s ease,
            color 0.16s ease,
            padding 0.26s cubic-bezier(0.4,0,0.2,1);
          white-space: nowrap;
          margin-bottom: 2px;
          position: relative;
          overflow: hidden;
        }
        .sb-item:hover {
          background: rgba(0,0,0,0.04);
          color: #374151;
        }
        .dark .sb-item { color: #6b7280; }
        .dark .sb-item:hover { background: rgba(255,255,255,0.05); color: #d1d5db; }
        .sb-item.active {
          color: #fff !important;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(0,0,0,0.16);
        }

        /* Geo items get a subtle tinted background on hover */
        .sb-item.sb-geo:not(.active):hover {
          background: rgba(6,182,212,0.07);
        }
        .dark .sb-item.sb-geo:not(.active):hover {
          background: rgba(6,182,212,0.1);
        }

        /* ── Icon container ── */
        .sb-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.16s, border-radius 0.26s;
          background: rgba(0,0,0,0.04);
        }
        .dark .sb-icon { background: rgba(255,255,255,0.05); }
        .sb-item.active .sb-icon { background: rgba(255,255,255,0.18); }
        .sb-item:hover:not(.active) .sb-icon { background: rgba(0,0,0,0.06); }
        .dark .sb-item:hover:not(.active) .sb-icon { background: rgba(255,255,255,0.08); }

        .sb-root.sb-collapsed .sb-icon {
          width: 38px; height: 38px; border-radius: 11px;
        }

        /* ── Label ── */
        .sb-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.18s ease, transform 0.18s ease;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }
        .sb-root.sb-collapsed .sb-label {
          opacity: 0;
          transform: translateX(-6px);
          pointer-events: none;
          width: 0; flex: 0;
        }

        /* ── GPS pulse badge (shown on geo items when expanded) ── */
        .sb-geo-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 6px;
          border-radius: 20px;
          font-size: 0.52rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.07em;
          background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(132,204,22,0.15));
          color: var(--geo-cyan);
          border: 1px solid rgba(6,182,212,0.2);
          flex-shrink: 0;
          opacity: 1;
          transition: opacity 0.18s ease;
          position: relative;
        }
        /* Pulse dot inside badge */
        .sb-geo-badge::before {
          content: '';
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--geo-cyan);
          display: inline-block;
          flex-shrink: 0;
          animation: geoPulse 2s ease-in-out infinite;
        }
        @keyframes geoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        .sb-root.sb-collapsed .sb-geo-badge {
          opacity: 0; pointer-events: none; width: 0; flex: 0; padding: 0; border: none;
        }
        /* Hide badge on active items (color already communicates state) */
        .sb-item.active .sb-geo-badge { display: none; }

        /* ── Collapsed item layout ── */
        .sb-root.sb-collapsed .sb-item {
          justify-content: center;
          padding: 8px; gap: 0;
        }

        /* ── Tooltip on hover when collapsed ── */
        .sb-root.sb-collapsed .sb-item::after {
          content: attr(data-tooltip);
          position: absolute;
          left: calc(100% + 10px);
          top: 50%; transform: translateY(-50%);
          padding: 6px 12px;
          background: #1e293b;
          color: #f8fafc;
          border-radius: 9px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          z-index: 200;
          pointer-events: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sb-root.sb-collapsed .sb-item:hover::after { opacity: 1; }
        .dark .sb-root.sb-collapsed .sb-item::after {
          background: #f1f5f9; color: #0f172a;
        }

        /* ── User card at bottom ── */
        .sb-user {
          display: flex; align-items: center; gap: 10px;
          padding: 10px;
          margin: 4px 6px 8px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.055);
          background: rgba(0,0,0,0.025);
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          text-align: left;
          transition: background 0.18s, border-color 0.18s;
          overflow: hidden;
          white-space: nowrap;
        }
        .dark .sb-user {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.05);
        }
        .sb-user:hover {
          background: rgba(234,88,12,0.06);
          border-color: rgba(234,88,12,0.2);
        }
        .sb-root.sb-collapsed .sb-user {
          justify-content: center;
          padding: 8px;
        }

        .sb-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #ea580c, #f97316);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(234,88,12,0.3);
        }

        .sb-user-info {
          min-width: 0; flex: 1; overflow: hidden;
          opacity: 1; transform: translateX(0);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .sb-root.sb-collapsed .sb-user-info {
          opacity: 0; transform: translateX(-6px);
          width: 0; flex: 0; pointer-events: none;
        }

        .sb-user-name {
          font-size: 0.8rem; font-weight: 700;
          color: #1f2937; letter-spacing: -0.02em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dark .sb-user-name { color: #f3f4f6; }

        .sb-user-role {
          font-size: 0.66rem; color: #9ca3af;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 1px;
        }

        .sb-admin-badge {
          display: inline-block; padding: 2px 7px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; border-radius: 5px;
          font-size: 0.56rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.06em;
          line-height: 1.4;
        }

        /* Admin item accents */
        .sb-item.sb-admin:not(.active):hover {
          background: rgba(239,68,68,0.06);
          color: #dc2626;
        }
        .dark .sb-item.sb-admin:not(.active):hover {
          background: rgba(239,68,68,0.1);
          color: #f87171;
        }
        .sb-item.sb-admin.active {
          background: linear-gradient(135deg, #ef4444, #dc2626) !important;
        }
      `}</style>

      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          className="sb-backdrop md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside className={`sb-root ${collapsed ? 'sb-collapsed' : 'sb-expanded'}`}>

        {/* Toggle chip */}
        <button
          className="sb-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight size={11} /> : <FiChevronLeft size={11} />}
        </button>

        <div className="sb-content">

          <p className="sb-section">Main Menu</p>

          {mainItems.map(({ path, icon: Icon, label, color }) => {
            const active = isActive(path);
            const isGeo = geoItems.has(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                data-tooltip={label}
                className={`sb-item${active ? ' active' : ''}${isGeo ? ' sb-geo' : ''}`}
                style={active ? { background: `linear-gradient(135deg, ${color}f0, ${color}bb)` } : {}}
              >
                <span className="sb-icon" style={active ? {} : { color }}>
                  <Icon size={16} />
                </span>
                <span className="sb-label">{label}</span>
                {isGeo && (
                  <span className="sb-geo-badge">GPS</span>
                )}
              </button>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="sb-divider" />
              <p className="sb-section" style={{ color: '#ef4444' }}>Admin</p>
              <button
                onClick={() => navigate('/admin')}
                data-tooltip="Admin Panel"
                className={`sb-item sb-admin${isActive('/admin') ? ' active' : ''}`}
              >
                <span className="sb-icon" style={isActive('/admin') ? {} : { color: '#ef4444' }}>
                  <FiSettings size={16} />
                </span>
                <span className="sb-label">Admin Panel</span>
              </button>
              <button
                onClick={() => navigate('/blog/create')}
                data-tooltip="New Post"
                className={`sb-item sb-admin${isActive('/blog/create') ? ' active' : ''}`}
              >
                <span className="sb-icon" style={isActive('/blog/create') ? {} : { color: '#ec4899' }}>
                  <FiEdit3 size={16} />
                </span>
                <span className="sb-label">New Blog Post</span>
              </button>
            </>
          )}

          <div className="sb-divider" />
          <p className="sb-section">Account</p>

          {accountItems.map(({ path, icon: Icon, label, color }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                data-tooltip={label}
                className={`sb-item${active ? ' active' : ''}`}
                style={active ? { background: `linear-gradient(135deg, ${color}f0, ${color}bb)` } : {}}
              >
                <span className="sb-icon" style={active ? {} : { color }}>
                  <Icon size={15} />
                </span>
                <span className="sb-label">{label}</span>
              </button>
            );
          })}
        </div>

        {/* User card pinned at bottom */}
        <button className="sb-user" onClick={() => navigate('/profile')}>
          <div className="sb-avatar">{initials}</div>
          <div className="sb-user-info">
            <p className="sb-user-name">{user?.full_name}</p>
            <p className="sb-user-role">
              {isAdmin
                ? <span className="sb-admin-badge">Admin</span>
                : (user?.class_name || 'Student')
              }
            </p>
          </div>
        </button>
      </aside>
    </>
  );
}