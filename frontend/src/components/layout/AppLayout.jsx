// frontend/src/components/layout/AppLayout.jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import OfflineIndicator from '../shared/OfflineIndicator';
import BottomNav from './BottomNav';
// FAB removed – now rendered globally in App.jsx

export default function AppLayout({ children }) {
  const watermarkRef = useRef(null);
  const location = useLocation();

  // ── Hide watermark on chat routes ──
  useEffect(() => {
    if (location.pathname.startsWith('/chat')) {
      document.body.classList.add('chat-page');
    } else {
      document.body.classList.remove('chat-page');
    }
    return () => document.body.classList.remove('chat-page');
  }, [location.pathname]);

  // ── Watermark scroll angle animation ──
  useEffect(() => {
    const handleScroll = () => {
      if (watermarkRef.current) {
        const scrollY = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
        const angle = 10 + progress * 20;
        watermarkRef.current.style.setProperty('--watermark-angle', `${angle}deg`);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 'calc(var(--visual-vh, 1vh) * 100)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <OfflineIndicator position="top" />

      <div className="watermark-overlay" ref={watermarkRef} aria-hidden="true">
        <div className="watermark-grid" />
        <span className="watermark-text watermark-text-main">ACADEME</span>
        <span className="watermark-text watermark-text-secondary">ACADEME</span>
        <div className="watermark-dots" />
      </div>

      {/* Main content – single source of navbar padding */}
      <main
        id="main-content"
        className="app-main"
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          paddingTop: 'var(--navbar-height)',
        }}
      >
        {children}
      </main>

      <BottomNav />

      <style>{`
        /* ══════════════════════════════════════════════════════
           WATERMARK OVERLAY
           ═══════════════════════════════════════════════════ */
        .watermark-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          --watermark-angle: 15deg;
          visibility: visible;
          opacity: 1;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        @media (max-height: 450px) {
          .watermark-overlay { opacity: 0; visibility: hidden; }
        }
        body.keyboard-open .watermark-overlay {
          opacity: 0; visibility: hidden;
        }
        /* Hide watermark on chat pages for a distraction‑free background */
        body.chat-page .watermark-overlay {
          opacity: 0; visibility: hidden;
        }
        .watermark-grid {
          position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(transparent, transparent 39px, rgba(79,107,255,0.04) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(79,107,255,0.04) 40px);
          background-size: 40px 40px;
          animation: watermarkSlowMove 60s linear infinite;
        }
        .watermark-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle at 20% 30%, rgba(79,107,255,0.03) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.6;
        }
        .watermark-text {
          position: absolute;
          font-family: var(--font-heading, 'Bricolage Grotesque', 'Outfit', system-ui, sans-serif);
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          pointer-events: none;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%) rotate(var(--watermark-angle));
          transform-origin: center center;
          transition: transform 0.3s ease-out;
        }
        .watermark-text-main {
          font-size: clamp(8rem, 18vw, 16rem);
          letter-spacing: -0.04em;
          background: linear-gradient(var(--watermark-angle), rgba(79,107,255,0.08) 0%, rgba(125,168,255,0.04) 50%, rgba(79,107,255,0.06) 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 2px 8px rgba(79,107,255,0.06));
        }
        .watermark-text-secondary {
          font-size: clamp(4rem, 10vw, 8rem);
          transform: translate(calc(-50% + 30px), calc(-50% - 20px)) rotate(calc(var(--watermark-angle) - 25deg));
          background: rgba(79,107,255,0.02);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          letter-spacing: 0.1em; opacity: 0.4; filter: blur(0.5px);
        }
        @keyframes watermarkSlowMove {
          0% { background-position: 0 0; }
          100% { background-position: 80px 80px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .watermark-grid { animation: none; }
          .watermark-text { transition: none; }
        }
        .dark .watermark-text-main {
          background: linear-gradient(var(--watermark-angle), rgba(165,180,252,0.12) 0%, rgba(196,181,253,0.06) 50%, rgba(165,180,252,0.1) 100%);
        }
        .dark .watermark-text-secondary {
          background: rgba(165,180,252,0.03);
        }
        .dark .watermark-grid {
          background-image:
            repeating-linear-gradient(transparent, transparent 39px, rgba(165,180,252,0.06) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(165,180,252,0.06) 40px);
        }
        .dark .watermark-dots {
          background-image: radial-gradient(circle at 20% 30%, rgba(165,180,252,0.05) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}