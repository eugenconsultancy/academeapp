import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiZap, FiChevronDown,
  FiUser, FiSettings, FiLogOut, FiHelpCircle,
  FiHome, FiBell, FiBriefcase, FiPackage, FiBook,
  FiBookOpen, FiMapPin, FiNavigation, FiShield, FiBarChart2
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { path: '/', label: 'Home', icon: FiHome },
  { path: '/announcements', label: 'Announcements', icon: FiBell },
  { path: '/blog', label: 'Blog', icon: FiBookOpen },
  { path: '/opportunities', label: 'Opportunities', icon: FiBriefcase },
  { path: '/found-items', label: 'Found Items', icon: FiPackage },
  { path: '/classes', label: 'Classes', icon: FiBook },
  { path: '/nearby-classes', label: 'Nearby', icon: FiNavigation },
  { path: '/campus-map', label: 'Map', icon: FiMapPin },
];

export default function Navbar({ onToggleSidebar }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';
  const isAdmin = user?.role === 'admin';
  const isLeader = ['admin', 'student_leader', 'faculty_rep'].includes(user?.role);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');

        .nav-root {
          font-family: 'Outfit', sans-serif;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          height: 68px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          transition: all 0.3s ease;
        }
        .nav-root.scrolled {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.06);
        }
        .nav-root.flat {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .dark .nav-root.scrolled {
          background: rgba(10,10,20,0.92);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3);
        }
        .dark .nav-root.flat {
          background: rgba(10,10,20,0.75);
          border-bottom-color: rgba(255,255,255,0.05);
        }

        /* ========== BRANDING ========== */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nav-logo-mark {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c084fc 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px -4px rgba(79,70,229,0.4);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .nav-logo-mark:hover {
          transform: scale(1.02);
        }
        .nav-logo-mark::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          border-radius: inherit;
        }
        .nav-logo-text {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #4f46e5, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }
        .dark .nav-logo-text {
          background: linear-gradient(135deg, #a5b4fc, #d8b4fe);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        @media (max-width: 640px) {
          .nav-logo-text { font-size: 1.4rem; }
          .nav-logo-mark { width: 36px; height: 36px; border-radius: 10px; }
        }

        /* ========== DESKTOP NAV LINKS ========== */
        .nav-links {
          display: none;
          align-items: center;
          gap: 4px;
          margin-left: 24px;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .nav-links::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .nav-links { display: flex; } }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 40px;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          text-decoration: none;
          color: #4b5563;
          transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          white-space: nowrap;
          position: relative;
          background: transparent;
        }
        .nav-link:hover {
          color: #4f46e5;
          background: rgba(79,70,229,0.08);
          transform: translateY(-1px);
        }
        .dark .nav-link { color: #9ca3af; }
        .dark .nav-link:hover {
          color: #a5b4fc;
          background: rgba(79,70,229,0.12);
        }

        .nav-link.active {
          color: #4f46e5;
          background: rgba(79,70,229,0.12);
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .dark .nav-link.active {
          color: #a5b4fc;
          background: rgba(79,70,229,0.18);
        }

        /* Active indicator dot */
        .nav-link-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #4f46e5;
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .nav-link.active .nav-link-dot { opacity: 1; }

        /* Blog link accent */
        .nav-link.nav-blog { color: #ec4899; }
        .nav-link.nav-blog:hover { background: rgba(236,72,153,0.08); color: #db2777; }
        .nav-link.nav-blog.active { background: rgba(236,72,153,0.12); color: #db2777; }
        .nav-link.nav-blog .nav-link-dot { background: #ec4899; }

        /* Geo link accent */
        .nav-link.nav-geo { color: #06b6d4; }
        .nav-link.nav-geo:hover { background: rgba(6,182,212,0.08); color: #0891b2; }
        .nav-link.nav-geo.active { background: rgba(6,182,212,0.12); color: #0891b2; }
        .nav-link.nav-geo .nav-link-dot { background: #06b6d4; }

        /* Spacer */
        .nav-spacer { flex: 1; }

        /* ========== RIGHT ACTIONS ========== */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-sidebar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }
        .nav-sidebar-toggle:hover {
          background: rgba(0,0,0,0.05);
          color: #374151;
          transform: scale(0.96);
        }
        .dark .nav-sidebar-toggle { color: #9ca3af; }
        .dark .nav-sidebar-toggle:hover {
          background: rgba(255,255,255,0.08);
          color: #e5e7eb;
        }
        @media (min-width: 768px) { .nav-sidebar-toggle { display: none; } }

        /* Profile button */
        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 6px;
          border-radius: 40px;
          border: 1px solid rgba(0,0,0,0.06);
          background: rgba(255,255,255,0.9);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .nav-profile-btn:hover {
          border-color: rgba(79,70,229,0.3);
          background: white;
          box-shadow: 0 4px 12px rgba(79,70,229,0.12);
          transform: translateY(-1px);
        }
        .dark .nav-profile-btn {
          background: rgba(30,30,50,0.85);
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .dark .nav-profile-btn:hover {
          background: rgba(40,40,70,0.95);
          border-color: rgba(79,70,229,0.4);
        }

        .nav-avatar {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #4f46e5, #c084fc);
          border-radius: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .nav-profile-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1f2937;
          letter-spacing: -0.01em;
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .nav-profile-name { color: #f3f4f6; }
        .nav-chevron {
          color: #9ca3af;
          transition: transform 0.2s;
        }
        .nav-chevron.open { transform: rotate(180deg); }

        /* Dropdown menu */
        .nav-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 260px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.12);
          overflow: hidden;
          animation: dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 20;
        }
        .dark .nav-dropdown {
          background: rgba(18,18,35,0.98);
          border-color: rgba(255,255,255,0.07);
          box-shadow: 0 12px 32px rgba(0,0,0,0.4);
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .nav-dropdown-header {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .dark .nav-dropdown-header { border-bottom-color: rgba(255,255,255,0.06); }
        .nav-dropdown-name {
          font-size: 0.9rem; font-weight: 700; color: #111827;
        }
        .dark .nav-dropdown-name { color: #f9fafb; }
        .nav-dropdown-class {
          font-size: 0.72rem; color: #9ca3af; margin-top: 4px;
        }
        .nav-dropdown-body { padding: 8px; }
        .nav-dd-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 14px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          color: #374151;
          text-align: left;
          transition: all 0.15s;
        }
        .nav-dd-item:hover { background: rgba(0,0,0,0.04); color: #111827; }
        .dark .nav-dd-item { color: #d1d5db; }
        .dark .nav-dd-item:hover { background: rgba(255,255,255,0.06); color: #f9fafb; }
        .nav-dd-item.danger { color: #dc2626; }
        .nav-dd-item.danger:hover { background: rgba(239,68,68,0.08); color: #b91c1c; }
        .nav-dd-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dark .nav-dd-icon { background: rgba(255,255,255,0.06); }
        .nav-dd-divider {
          height: 1px;
          background: rgba(0,0,0,0.05);
          margin: 6px 10px;
        }
        .dark .nav-dd-divider { background: rgba(255,255,255,0.05); }

        /* Mobile menu button */
        .nav-mobile-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }
        .nav-mobile-btn:hover { background: rgba(0,0,0,0.05); color: #374151; transform: scale(0.96); }
        .dark .nav-mobile-btn { color: #9ca3af; }
        .dark .nav-mobile-btn:hover { background: rgba(255,255,255,0.08); color: #e5e7eb; }
        @media (min-width: 768px) { .nav-mobile-btn { display: none; } }

        /* Mobile drawer */
        .nav-drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 60;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .nav-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 300px;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(28px);
          z-index: 61;
          display: flex;
          flex-direction: column;
          animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 1px solid rgba(0,0,0,0.05);
        }
        .dark .nav-drawer {
          background: rgba(12,12,24,0.98);
          border-left-color: rgba(255,255,255,0.06);
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .nav-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .dark .nav-drawer-header { border-bottom-color: rgba(255,255,255,0.05); }
        .nav-drawer-title {
          font-size: 1rem; font-weight: 800; color: #111827;
        }
        .dark .nav-drawer-title { color: #f9fafb; }
        .nav-drawer-close {
          width: 34px; height: 34px;
          border-radius: 10px;
          border: none;
          background: rgba(0,0,0,0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.15s;
        }
        .nav-drawer-close:hover { background: rgba(239,68,68,0.08); color: #dc2626; }
        .nav-drawer-body { padding: 12px; flex: 1; overflow-y: auto; }
        .nav-drawer-section {
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #9ca3af;
          padding: 12px 10px 6px;
        }
        .nav-drawer-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          transition: all 0.15s;
          margin-bottom: 4px;
        }
        .nav-drawer-link:hover { background: rgba(79,70,229,0.08); color: #4f46e5; }
        .nav-drawer-link.active { background: rgba(79,70,229,0.12); color: #4f46e5; }
        .dark .nav-drawer-link { color: #d1d5db; }
        .dark .nav-drawer-link:hover { background: rgba(79,70,229,0.12); color: #a5b4fc; }
        .nav-drawer-link-icon {
          width: 36px; height: 36px;
          border-radius: 12px;
          background: rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dark .nav-drawer-link-icon { background: rgba(255,255,255,0.06); }
      `}</style>

      <nav className={`nav-root ${scrolled ? 'scrolled' : 'flat'}`}>
        {/* Sidebar toggle button */}
        <button className="nav-sidebar-toggle" onClick={onToggleSidebar}>
          <FiMenu size={20} />
        </button>

        {/* Enhanced Logo */}
        <Link to="/" className="nav-logo">
          <div className="nav-logo-mark">
            <FiZap size={18} color="#fff" />
          </div>
          <span className="nav-logo-text">Academe</span>
        </Link>

        {/* Desktop navigation links */}
        <div className="nav-links">
          {navLinks.map(({ path, label }) => {
            const isBlog = path === '/blog';
            const isGeo = path === '/nearby-classes' || path === '/campus-map';
            return (
              <Link
                key={path}
                to={path}
                className={`nav-link ${isBlog ? 'nav-blog' : ''} ${isGeo ? 'nav-geo' : ''} ${location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? 'active' : ''}`}
              >
                {label}
                <span className="nav-link-dot" />
              </Link>
            );
          })}
        </div>

        <div className="nav-spacer" />

        <div className="nav-actions">
          {/* Profile dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className="nav-avatar">{initials}</div>
              <span className="nav-profile-name">
                {user?.full_name?.split(' ')[0] ?? 'User'}
              </span>
              <FiChevronDown size={14} className={`nav-chevron ${profileOpen ? 'open' : ''}`} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <p className="nav-dropdown-name">{user?.full_name}</p>
                    <p className="nav-dropdown-class">{user?.class_name ?? 'Student'}</p>
                  </div>
                  <div className="nav-dropdown-body">
                    <button className="nav-dd-item" onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiUser size={15} /></span> Profile
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/sessions'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiShield size={15} /></span> Active Sessions
                    </button>
                    <button className="nav-dd-item" onClick={() => { navigate('/contact'); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiHelpCircle size={15} /></span> Help & Support
                    </button>
                    <div className="nav-dd-divider" />
                    {isLeader && (
                      <>
                        <button className="nav-dd-item" onClick={() => { navigate('/governance'); setProfileOpen(false); }}>
                          <span className="nav-dd-icon"><FiBarChart2 size={15} /></span> Governance
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button className="nav-dd-item" onClick={() => { navigate('/admin'); setProfileOpen(false); }}>
                        <span className="nav-dd-icon"><FiSettings size={15} /></span> Admin Panel
                      </button>
                    )}
                    <div className="nav-dd-divider" />
                    <button className="nav-dd-item danger" onClick={() => { logout(); setProfileOpen(false); }}>
                      <span className="nav-dd-icon"><FiLogOut size={15} /></span> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="nav-mobile-btn" onClick={() => setMobileOpen(true)}>
            <FiMenu size={20} />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="nav-drawer-overlay" onClick={() => setMobileOpen(false)} />
            <div className="nav-drawer">
              <div className="nav-drawer-header">
                <span className="nav-drawer-title">Navigation</span>
                <button className="nav-drawer-close" onClick={() => setMobileOpen(false)}>
                  <FiX size={18} />
                </button>
              </div>
              <div className="nav-drawer-body">
                <p className="nav-drawer-section">Main Pages</p>
                {navLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className={`nav-drawer-link ${location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? 'active' : ''}`}
                  >
                    <span className="nav-drawer-link-icon"><Icon size={16} /></span>
                    {label}
                  </Link>
                ))}

                {/* Governance section in mobile drawer */}
                {isLeader && (
                  <>
                    <p className="nav-drawer-section" style={{ marginTop: 16 }}>Governance</p>
                    <Link
                      to="/governance"
                      onClick={() => setMobileOpen(false)}
                      className={`nav-drawer-link ${location.pathname.startsWith('/governance') ? 'active' : ''}`}
                    >
                      <span className="nav-drawer-link-icon"><FiBarChart2 size={16} /></span>
                      Governance Dashboard
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className={`nav-drawer-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                      >
                        <span className="nav-drawer-link-icon"><FiSettings size={16} /></span>
                        Admin Panel
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}