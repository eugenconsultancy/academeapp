/**
 * Card — Premium glassmorphism card component
 *
 * Props:
 *   children   - Content to display
 *   className  - Additional CSS classes
 *   hover      - Enable lift-on-hover effect (default: true)
 *   glow       - Show colored glow on hover (default: false)
 *   glowColor  - CSS hex color for glow (default: '#6366f1')
 *   noPad      - Remove default padding (default: false)
 *   accent     - Top-edge accent bar: boolean | 'indigo'|'violet'|'emerald'|'amber'|'rose'|'pink'|'cyan'|'orange'
 *   padding    - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 *   style      - Inline styles
 *   onClick    - Click handler
 *   bordered   - Show visible border (default: true)
 *   elevated   - Stronger shadow for emphasis (default: false)
 */
export default function Card({
  children,
  className = '',
  hover = true,
  glow = false,
  glowColor = '#6366f1',
  noPad = false,
  accent = false,
  padding = 'md',
  style = {},
  onClick,
  bordered = true,
  elevated = false,
  ...props
}) {
  const accentGradients = {
    indigo: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
    violet: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
    emerald: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
    amber: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
    rose: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)',
    pink: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)',
    cyan: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
    orange: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
    true: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
  };

  const padMap = { sm: 14, md: 22, lg: 32, xl: 44 };

  const accentGrad = accent ? (accentGradients[accent] || accentGradients.indigo) : null;
  const glowFill = glow && glowColor ? `${glowColor}14` : undefined;
  const glowBorder = glow && glowColor ? `${glowColor}40` : undefined;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        .ac-card {
          font-family: 'DM Sans', sans-serif;
          position: relative;
          border-radius: 18px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 16px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.9);
          transition:
            transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.28s ease,
            border-color 0.28s ease;
          overflow: hidden;
          word-wrap: break-word;
        }

        .dark .ac-card {
          background: rgba(15,14,26,0.85);
          border-color: rgba(255,255,255,0.06);
          box-shadow:
            0 1px 2px rgba(0,0,0,0.3),
            0 4px 20px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.03);
        }

        /* No border variant */
        .ac-card.ac-no-border {
          border-color: transparent;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
        }
        .dark .ac-card.ac-no-border {
          border-color: transparent;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.35);
        }

        /* Elevated */
        .ac-card.ac-elevated {
          box-shadow:
            0 2px 8px rgba(0,0,0,0.06),
            0 8px 32px rgba(0,0,0,0.08),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .dark .ac-card.ac-elevated {
          box-shadow:
            0 2px 10px rgba(0,0,0,0.4),
            0 12px 40px rgba(0,0,0,0.5);
        }

        /* Hover lift */
        .ac-card.ac-hover { cursor: default; }
        .ac-card.ac-hover:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow:
            0 2px 8px rgba(0,0,0,0.05),
            0 16px 40px rgba(99,102,241,0.08),
            0 4px 12px rgba(0,0,0,0.06),
            inset 0 1px 0 rgba(255,255,255,0.9);
          border-color: rgba(99,102,241,0.15);
        }
        .dark .ac-card.ac-hover:hover {
          box-shadow:
            0 2px 12px rgba(0,0,0,0.4),
            0 16px 48px rgba(0,0,0,0.5);
          border-color: rgba(99,102,241,0.2);
        }

        /* Glow on hover */
        .ac-card.ac-glow:hover {
          border-color: var(--glow-border, rgba(99,102,241,0.4));
          box-shadow:
            0 0 0 4px var(--glow-fill, rgba(99,102,241,0.08)),
            0 16px 40px rgba(99,102,241,0.12),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        /* Accent bar */
        .ac-card.ac-accent::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3.5px;
          background: var(--accent-grad);
          z-index: 2;
          border-radius: 18px 18px 0 0;
          background-size: 200% 200%;
          animation: acGradientShift 4s ease-in-out infinite;
        }

        @keyframes acGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Clickable cursor */
        .ac-card.ac-clickable { cursor: pointer; }

        /* Inner body */
        .ac-body {
          position: relative; z-index: 1;
          overflow: hidden;
          word-break: break-word;
        }
      `}</style>

      <div
        className={[
          'ac-card',
          hover && 'ac-hover',
          glow && 'ac-glow',
          accent && 'ac-accent',
          onClick && 'ac-clickable',
          !bordered && 'ac-no-border',
          elevated && 'ac-elevated',
          className,
        ].filter(Boolean).join(' ')}
        style={{
          '--accent-grad': accentGrad,
          '--glow-fill': glowFill,
          '--glow-border': glowBorder,
          ...style,
        }}
        onClick={onClick}
        {...props}
      >
        <div
          className="ac-body"
          style={noPad ? {} : { padding: padMap[padding] ?? padMap.md }}
        >
          {children}
        </div>
      </div>
    </>
  );
}