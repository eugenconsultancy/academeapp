import { useState } from 'react';
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
  true: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
};

const padMap = { none: 0, xs: 8, sm: 14, md: 22, lg: 32, xl: 44 };

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

  const accentGrad = accent ? (accentGradients[accent] || accentGradients.indigo) : null;
  const glowFill = glow && glowColor ? `${glowColor}14` : undefined;
  const glowBorder = glow && glowColor ? `${glowColor}40` : undefined;
  const actualPadding = noPad ? 0 : (padMap[padding] ?? padMap.md);

  const cardContent = (
    <div
      className={[
        'ac-card',
        hover && 'ac-hover',
        glow && 'ac-glow',
        accent && 'ac-accent',
        (onClick || selectable) && 'ac-clickable',
        !bordered && 'ac-no-border',
        elevated && 'ac-elevated',
        selected && 'ac-selected',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        '--accent-grad': accentGrad,
        '--glow-fill': glowFill,
        '--glow-border': glowBorder,
        ...style,
      }}
      onClick={selectable ? onSelect : onClick}
      {...props}
    >
      {/* Accent bar */}
      {accent && <div aria-hidden="true" className="ac-accent-bar" />}

      {/* Image */}
      {image && (
        <div className="relative overflow-hidden" style={{ height: imageHeight }}>
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Header */}
      {header && (
        <div
          className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50"
          style={{ padding: actualPadding }}
        >
          {header}
          {collapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
          className="flex items-center justify-between w-full font-semibold text-gray-800 dark:text-gray-200"
          style={{ padding: actualPadding }}
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
          className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30"
          style={{ padding: actualPadding }}
        >
          {footer}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="ac-loading-overlay">
          <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER WITH STYLES
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        .ac-card {
          font-family: 'DM Sans', system-ui, sans-serif;
          position: relative;
          border-radius: 18px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(182, 161, 161, 0.7);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease, border-color 0.28s ease;
          word-wrap: break-word;
        }
        .dark .ac-card {
          background: rgba(15,14,26,0.85);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .ac-card.ac-no-border { border-color: transparent; }
        .ac-card.ac-elevated { box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08); }
        .dark .ac-card.ac-elevated { box-shadow: 0 2px 10px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.5); }
        .ac-card.ac-hover:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05), 0 16px 40px rgba(99,102,241,0.08);
        }
        .ac-card.ac-glow:hover {
          border-color: var(--glow-border, rgba(99,102,241,0.4));
          box-shadow: 0 0 0 4px var(--glow-fill, rgba(99,102,241,0.08)), 0 16px 40px rgba(99,102,241,0.12);
        }
        .ac-card.ac-accent::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3.5px;
          background: var(--accent-grad); z-index: 2;
          border-radius: 18px 18px 0 0;
          background-size: 200% 200%;
          animation: acGradientShift 4s ease-in-out infinite;
        }
        @keyframes acGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .ac-card.ac-clickable { cursor: pointer; }
        .ac-card.ac-selected { border-color: #4144f5; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .ac-body { position: relative; z-index: 1; word-break: break-word; }
        .ac-loading-overlay {
          position: absolute; inset: 0; z-index: 10;
          background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        /* Accent bar element */
        .ac-accent-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3.5px;
          background: var(--accent-grad); z-index: 2;
          border-radius: 18px 18px 0 0;
          background-size: 200% 200%;
          animation: acGradientShift 4s ease-in-out infinite;
        }
      `}</style>

      {cardContent}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL PORTAL HELPER
// Use this to render modals outside the Card's overflow context
// ═══════════════════════════════════════════════════════════════

/**
 * Renders content in a React Portal to document.body.
 * Use this for modals, dropdowns, and tooltips that need to break
 * out of parent containers with overflow: hidden or position: relative.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to portal
 * @param {HTMLElement} props.container - Target container (default: document.body)
 */
export function Portal({ children, container = null }) {
  const target = container || (typeof document !== 'undefined' ? document.body : null);
  if (!target) return children;
  return createPortal(children, target);
}

/**
 * Modal wrapper that automatically portals to document.body.
 * im using this instead of inline modal markup inside Card components.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Show/hide modal
 * @param {Function} props.onClose - Close handler
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.className - Additional overlay classes
 */
export function CardModal({ isOpen, onClose, children, className = '' }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}