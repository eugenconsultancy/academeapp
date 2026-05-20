import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiPackage, FiBookOpen, FiBook, FiUser } from 'react-icons/fi';
import { useUnreadCount } from '../../hooks/useUnreadCount';

const navItems = [
  { path: '/', icon: FiHome, label: 'Home' },
  { path: '/blog', icon: FiBookOpen, label: 'Blog' },
  { path: '/found-items', icon: FiPackage, label: 'Found' },
  { path: '/classes', icon: FiBook, label: 'Classes' },
  { path: '/profile', icon: FiUser, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@500;600&display=swap');

        .bn-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-top: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            0 -4px 24px rgba(0,0,0,0.07),
            0 -1px 0 rgba(234,88,12,0.08),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .dark .bn-nav {
          background: rgba(12,10,22,0.90);
          border-top-color: rgba(255,255,255,0.06);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04);
        }

        /* visible only on mobile */
        @media (min-width: 768px) { .bn-nav { display: none; } }

        .bn-inner {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 64px;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .bn-btn {
          all: unset;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 12px 8px;
          border-radius: 16px;
          cursor: pointer;
          position: relative;
          min-width: 56px;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
          -webkit-tap-highlight-color: transparent;
        }
        .bn-btn:active { transform: scale(0.90); }

        /* icon wrapper — holds the indicator blob */
        .bn-icon-wrap {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: 12px;
          transition:
            background 0.22s ease,
            box-shadow 0.22s ease,
            transform 0.26s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* active state – icon pill */
        .bn-btn.bn-active .bn-icon-wrap {
          background: linear-gradient(135deg, #ea580c, #fb923c);
          box-shadow: 0 4px 16px rgba(234,88,12,0.40), 0 0 0 3px rgba(234,88,12,0.10);
          transform: translateY(-5px) scale(1.12);
        }

        /* active icon color */
        .bn-btn.bn-active .bn-icon { color: #fff !important; }

        /* inactive icon */
        .bn-icon {
          color: #9ca3af;
          transition: color 0.2s;
        }
        .dark .bn-icon { color: #6b7280; }
        .bn-btn:not(.bn-active):hover .bn-icon { color: #ea580c; }
        .dark .bn-btn:not(.bn-active):hover .bn-icon { color: #fb923c; }

        /* label */
        .bn-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #9ca3af;
          transition: color 0.2s;
          margin-top: 1px;
          white-space: nowrap;
        }
        .bn-btn.bn-active .bn-label {
          color: #ea580c;
          font-weight: 800;
        }
        .dark .bn-btn.bn-active .bn-label { color: #fb923c; }

        /* unread badge */
        .bn-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 16px; height: 16px;
          padding: 0 4px;
          background: linear-gradient(135deg, #ef4444, #f87171);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem; font-weight: 800;
          border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(239,68,68,0.5);
          border: 2px solid rgba(255,255,255,0.85);
          animation: badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes badgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        /* active indicator dot above label */
        .bn-btn.bn-active::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%;
          background: #ea580c;
          box-shadow: 0 0 6px rgba(234,88,12,0.6);
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.3); }
        }
      `}</style>

      <nav className="bn-nav">
        <div className="bn-inner">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
              || (path !== '/' && location.pathname.startsWith(path));

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`bn-btn${isActive ? ' bn-active' : ''}`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="bn-icon-wrap">
                  <Icon className="bn-icon" size={20} />
                  {Icon === FiPackage && unreadCount > 0 && (
                    <span className="bn-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="bn-label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}