// src/components/ui/Card.jsx - REFACTORED: Visual Hierarchy & Responsive Design
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const accentGradients = {
  indigo: 'linear-gradient(135deg, #2b2ee4 0%, #4312b6 50%, #431cb9 100%)',
  violet: 'linear-gradient(135deg, #6041aa 0%, #6b50bd 50%, #7b68c9 100%)',
  emerald: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
  amber: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
  rose: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)',
  pink: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)',
  cyan: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
  orange: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
  true: 'linear-gradient(135deg, #3d40e6 0%, #784cdd 50%, #8a68f0 100%)',
};

const padMap = { none: 0, xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };

export default function Card({
  children,
  className = '',
  hover = true,
  glow = false,
  glowColor = '#1d1fc5',
  noPad = false,
  accent = false,
  padding = 'md',
  style = {},
  onClick,
  bordered = true,
  elevated = false,
  collapsible = false,
  defaultExpanded = true,
  collapsibleTitle = '',
  header = null,
  footer = null,
  image = null,
  imageAlt = '',
  imageHeight = 200,
  loading = false,
  selectable = false,
  selected = false,
  onSelect = null,
  ...props
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (!cardRef.current || !hover) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      });
    },
    [hover]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePosition({ x: 0.5, y: 0.5 });
  }, []);

  const accentGrad = accent ? accentGradients[accent] || accentGradients.indigo : null;
  const glowFill = glow && glowColor ? `${glowColor}14` : undefined;
  const glowBorder = glow && glowColor ? `${glowColor}40` : undefined;
  const actualPadding = noPad ? 0 : padMap[padding] ?? padMap.md;

  const lightX = mousePosition.x * 100;
  const lightY = mousePosition.y * 100;
  const lightAngle =
    Math.atan2(mousePosition.y - 0.5, mousePosition.x - 0.5) *
    (180 / Math.PI);
  const lightDistance = Math.hypot(
    mousePosition.x - 0.5,
    mousePosition.y - 0.5
  );

  const dynamicStyle = {
    '--mouse-x': mousePosition.x,
    '--mouse-y': mousePosition.y,
    '--light-x': `${lightX}%`,
    '--light-y': `${lightY}%`,
    '--light-angle': `${lightAngle}deg`,
    '--light-distance': lightDistance,
    '--accent-grad': accentGrad,
    '--glow-fill': glowFill,
    '--glow-border': glowBorder,
    ...style,
  };

  const cardContent = (
    <div
      ref={cardRef}
      className={[
        'ac-card',
        hover && 'ac-hover',
        glow && 'ac-glow',
        accent && 'ac-accent',
        (onClick || selectable) && 'ac-clickable',
        !bordered && 'ac-no-border',
        elevated && 'ac-elevated',
        selected && 'ac-selected',
        isHovered && 'ac-hovered',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={dynamicStyle}
      onClick={selectable ? onSelect : onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Accent bar (top) */}
      {accent && <div aria-hidden="true" className="ac-accent-bar" />}

      {/* Ambient light overlay */}
      <div className="ac-ambient-light" aria-hidden="true" />

      {/* Reflective overlay */}
      <div className="ac-reflection" aria-hidden="true" />

      {/* Edge highlight glow */}
      <div className="ac-edge-highlight" aria-hidden="true" />

      {/* Image */}
      {image && (
        <div style={{ height: imageHeight, overflow: 'hidden' }}>
          <img
            src={image}
            alt={imageAlt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />
        </div>
      )}

      {/* Header */}
      {header && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
            padding: actualPadding,
          }}
          className="dark:border-gray-700/30"
        >
          {header}
          {collapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </button>
          )}
        </div>
      )}

      {/* Collapsible title */}
      {collapsible && !header && collapsibleTitle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: actualPadding,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{collapsibleTitle}</span>
          {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </button>
      )}

      {/* Body */}
      {(!collapsible || isExpanded) && (
        <div className="ac-body" style={{ padding: actualPadding }}>
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && (!collapsible || isExpanded) && (
        <div
          style={{
            borderTop: '1px solid rgba(226, 232, 240, 0.5)',
            padding: actualPadding,
            background: 'rgba(0, 0, 0, 0.02)',
          }}
          className="dark:border-gray-700/30 dark:bg-gray-800/20"
        >
          {footer}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="dark:bg-gray-900/80"
        >
          <svg
            className="animate-spin"
            style={{
              height: 32,
              width: 32,
              color: '#6366f1',
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              opacity="0.25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              opacity="0.75"
            />
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        /* ── Core Card Base ─────────────────────────────────── */
        .ac-card {
          font-family: 'DM Sans', system-ui, sans-serif;
          position: relative;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.05),
            0 4px 12px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.3s ease,
                      border-color 0.3s ease;
          word-wrap: break-word;
          overflow: hidden;
          isolation: isolate;
        }

        .dark .ac-card {
          background: rgba(13, 17, 23, 0.85);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.3),
            0 4px 16px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        /* ── Elevated Depth ────────────────────────────────── */
        .ac-card.ac-elevated {
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 12px 32px rgba(0, 0, 0, 0.1);
        }

        .dark .ac-card.ac-elevated {
          box-shadow:
            0 2px 10px rgba(0, 0, 0, 0.4),
            0 12px 40px rgba(0, 0, 0, 0.5);
        }

        /* ── No Border ─────────────────────────────────────── */
        .ac-card.ac-no-border {
          border-color: transparent;
        }

        /* ── Hover Effects ─────────────────────────────────── */
        .ac-card.ac-hover {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.3s ease,
                      border-color 0.3s ease;
        }

        .ac-card.ac-hover:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 12px 32px rgba(0, 0, 0, 0.12);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .dark .ac-card.ac-hover:hover {
          box-shadow:
            0 2px 10px rgba(0, 0, 0, 0.4),
            0 12px 40px rgba(0, 0, 0, 0.4);
        }

        /* ── Glow Effect ───────────────────────────────── */
        .ac-card.ac-glow:hover {
          border-color: var(--glow-border, rgba(99, 102, 241, 0.4));
          box-shadow:
            0 0 0 4px var(--glow-fill, rgba(99, 102, 241, 0.08)),
            0 12px 32px rgba(99, 102, 241, 0.12);
        }

        /* ── Accent Bar ────────────────────────────────────── */
        .ac-card.ac-accent::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent-grad);
          z-index: 2;
          border-radius: 16px 16px 0 0;
          background-size: 200% 200%;
          animation: acGradientShift 4s ease-in-out infinite;
        }

        @keyframes acGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* ── Clickable & Selected ──────────────────────────────── */
        .ac-card.ac-clickable { cursor: pointer; }

        .ac-card.ac-selected {
          border-color: #6366f1;
          box-shadow:
            0 0 0 2px rgba(99, 102, 241, 0.15),
            0 4px 12px rgba(0, 0, 0, 0.06);
        }

        /* ── Ambient Light Overlay ─────────────────────────── */
        .ac-ambient-light {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(
            circle at var(--light-x, 50%) var(--light-y, 50%),
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .dark .ac-ambient-light {
          background: radial-gradient(
            circle at var(--light-x, 50%) var(--light-y, 50%),
            rgba(99, 102, 241, 0.12) 0%,
            rgba(99, 102, 241, 0.04) 50%,
            transparent 70%
          );
        }

        .ac-card.ac-hovered .ac-ambient-light {
          opacity: 1;
        }

        /* ── Reflective Overlay ────────────────────────────── */
        .ac-reflection {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background: linear-gradient(
            calc(var(--light-angle, 135deg) + 45deg),
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.04) 40%,
            transparent 60%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          mix-blend-mode: overlay;
        }

        .dark .ac-reflection {
          background: linear-gradient(
            calc(var(--light-angle, 135deg) + 45deg),
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.01) 40%,
            transparent 60%
          );
        }

        .ac-card.ac-hovered .ac-reflection {
          opacity: 1;
        }

        /* ── Edge Highlight ────────────────────────────────── */
        .ac-edge-highlight {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          border-radius: 16px;
          box-shadow:
            inset 1px 1px 0 rgba(255, 255, 255, 0.4),
            inset -1px -1px 0 rgba(0, 0, 0, 0.05);
          opacity: 0.6;
          transition: opacity 0.3s ease;
        }

        .dark .ac-edge-highlight {
          box-shadow:
            inset 1px 1px 0 rgba(255, 255, 255, 0.05),
            inset -1px -1px 0 rgba(0, 0, 0, 0.2);
        }

        .ac-card.ac-hovered .ac-edge-highlight {
          opacity: 0.8;
        }

        /* ── Body & Loading ────────────────────────────────– */
        .ac-body {
          position: relative;
          z-index: 4;
          word-break: break-word;
        }

        /* ── Accent Bar Element ────────────────────────────– */
        .ac-accent-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent-grad);
          z-index: 2;
          border-radius: 16px 16px 0 0;
          background-size: 200% 200%;
          animation: acGradientShift 4s ease-in-out infinite;
        }

        /* ── Mobile Responsive ─────────────────────────────– */
        @media (max-width: 640px) {
          .ac-card {
            border-radius: 12px;
          }
          .ac-card.ac-accent::before,
          .ac-accent-bar {
            border-radius: 12px 12px 0 0;
          }
          .ac-edge-highlight {
            border-radius: 12px;
          }
        }

        /* ── Reduced Motion ────────────────────────────────– */
        @media (prefers-reduced-motion: reduce) {
          .ac-card,
          .ac-card.ac-hover,
          .ac-card.ac-glow {
            transition: none;
          }
          .ac-ambient-light,
          .ac-reflection,
          .ac-edge-highlight {
            transition: none;
            opacity: 0 !important;
          }
        }
      `}</style>

      {cardContent}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL PORTAL HELPERS
// ═══════════════════════════════════════════════════════════════

export function Portal({ children, container = null }) {
  const target =
    container ||
    (typeof document !== 'undefined' ? document.body : null);
  if (!target) return children;
  return createPortal(children, target);
}

export function CardModal({ isOpen, onClose, children, className = '' }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className={`dark:bg-gray-900 dark:border-gray-700/50 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}