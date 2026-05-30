// src/components/layout/AppLayout.jsx
import { useEffect, useRef } from 'react';

export default function AppLayout({ children }) {
    const watermarkRef = useRef(null);

    // Optional: animate the gradient based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            if (watermarkRef.current) {
                const scrollY = window.scrollY;
                const maxScroll = document.body.scrollHeight - window.innerHeight;
                const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
                // Shift the gradient angle (0 to 30 degrees)
                const angle = 10 + progress * 20;
                watermarkRef.current.style.setProperty('--watermark-angle', `${angle}deg`);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Enhanced Watermark Layer */}
            <div className="watermark-overlay" ref={watermarkRef}>
                {/* Grid pattern */}
                <div className="watermark-grid" />

                {/* Main text layer – large, semi‑transparent, rotated */}
                <span className="watermark-text watermark-text-main">ACADEME</span>

                {/* Secondary text – smaller, different rotation, even fainter */}
                <span className="watermark-text watermark-text-secondary">ACADEME</span>

                {/* Accent dot pattern (optional) */}
                <div className="watermark-dots" />
            </div>

            {/* Main Page Content */}
            <main style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </main>

            {/* Inline styles for modern watermark (overrides any existing .watermark-* classes) */}
            <style>{`
        .watermark-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          --watermark-angle: 15deg;
          --watermark-color: #4F6BFF;
          --watermark-color-light: #7DA8FF;
        }

        /* Grid pattern – subtle lines */
        .watermark-grid {
          position: absolute;
          inset: 0;
          background-image: 
            repeating-linear-gradient(transparent, transparent 39px, rgba(79,107,255,0.04) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(79,107,255,0.04) 40px);
          background-size: 40px 40px;
          animation: watermarkSlowMove 60s linear infinite;
        }

        /* Dot pattern – organic, modern */
        .watermark-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 30%, rgba(79,107,255,0.03) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.6;
        }

        /* Base text styles */
        .watermark-text {
          position: absolute;
          font-family: 'Bricolage Grotesque', 'Outfit', system-ui, sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          pointer-events: none;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(var(--watermark-angle));
          transform-origin: center center;
          transition: transform 0.3s ease-out;
        }

        /* Main text – large, bold, gradient */
        .watermark-text-main {
          font-size: clamp(8rem, 18vw, 16rem);
          letter-spacing: -0.04em;
          background: linear-gradient(
            var(--watermark-angle),
            rgba(79,107,255,0.08) 0%,
            rgba(125,168,255,0.04) 50%,
            rgba(79,107,255,0.06) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: none;
          filter: drop-shadow(0 2px 8px rgba(79,107,255,0.06));
        }

        /* Secondary text – smaller, offset, much fainter */
        .watermark-text-secondary {
          font-size: clamp(4rem, 10vw, 8rem);
          transform: translate(calc(-50% + 30px), calc(-50% - 20px)) rotate(calc(var(--watermark-angle) - 25deg));
          background: rgba(79,107,255,0.02);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 0.1em;
          opacity: 0.4;
          filter: blur(0.5px);
        }

        /* Animation for the grid – subtle drift */
        @keyframes watermarkSlowMove {
          0% { background-position: 0 0; }
          100% { background-position: 80px 80px; }
        }

        /* Reduce motion if user prefers */
        @media (prefers-reduced-motion: reduce) {
          .watermark-grid {
            animation: none;
          }
          .watermark-text {
            transition: none;
          }
        }

        /* Dark mode adjustments (if needed) */
        .dark .watermark-text-main {
          background: linear-gradient(
            var(--watermark-angle),
            rgba(165,180,252,0.12) 0%,
            rgba(196,181,253,0.06) 50%,
            rgba(165,180,252,0.1) 100%
          );
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