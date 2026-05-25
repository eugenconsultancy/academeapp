import { forwardRef, useEffect, useRef } from 'react';

// ───────────────────────────
// 1. Global button styles (injected once)
// ───────────────────────────
const GLOBAL_STYLES = `
  @keyframes btn-sheen {
    0% { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(200%) skewX(-15deg); }
  }
  @keyframes btn-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .btn-sheen-effect {
    overflow: hidden;
  }
  .btn-sheen-effect::after {
    content: '';
    position: absolute;
    top: 0; left: -50%;
    width: 50%;
    height: 100%;
    background: linear-gradient(120deg,
      transparent 0%,
      rgba(255,255,255,0.3) 40%,
      rgba(255,255,255,0.5) 60%,
      transparent 100%
    );
    animation: btn-sheen 2.5s ease-in-out infinite;
    pointer-events: none;
  }
  .btn-sheen-effect.dark::after {
    background: linear-gradient(120deg,
      transparent 0%,
      rgba(255,255,255,0.1) 40%,
      rgba(255,255,255,0.2) 60%,
      transparent 100%
    );
  }
  .btn-loading-spinner {
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    width: 1em;
    height: 1em;
    animation: btn-spin 0.6s linear infinite;
  }
`;

// Inject styles once
let stylesInjected = false;
function ensureGlobalStyles() {
    if (!stylesInjected && typeof document !== 'undefined') {
        const styleEl = document.createElement('style');
        styleEl.textContent = GLOBAL_STYLES;
        document.head.appendChild(styleEl);
        stylesInjected = true;
    }
}

// ───────────────────────────
// 2. Enhanced Variants
// ───────────────────────────
const variants = {
    // Primary – luxurious purple-blue gradient with layered glow
    primary:
        'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 ' +
        'text-white ' +
        'shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 ' +
        'hover:brightness-110 active:brightness-100 ' +
        'border border-indigo-400/20',

    // Secondary – floating card look with glass effect
    secondary:
        'bg-white/80 dark:bg-gray-800/80 ' +
        'backdrop-blur-xl backdrop-saturate-150 ' +
        'text-gray-700 dark:text-gray-200 ' +
        'border border-white/20 dark:border-gray-700/40 ' +
        'shadow-md shadow-gray-200/50 dark:shadow-gray-900/50 ' +
        'hover:shadow-lg hover:shadow-gray-300/60 dark:hover:shadow-gray-900/70 ' +
        'hover:bg-white/90 dark:hover:bg-gray-800/90 ' +
        'hover:border-gray-200/50 dark:hover:border-gray-600/50',

    // Danger – vibrant red with contrast ring
    danger:
        'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 ' +
        'text-white ' +
        'shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/45 ' +
        'hover:brightness-110 active:brightness-100 ' +
        'border border-red-400/20',

    // Success – fresh emerald
    success:
        'bg-gradient-to-br from-emerald-500 to-teal-600 ' +
        'text-white ' +
        'shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/45 ' +
        'hover:brightness-110 active:brightness-100 ' +
        'border border-emerald-400/20',

    // Warning – rich amber/orange
    warning:
        'bg-gradient-to-br from-amber-500 to-orange-600 ' +
        'text-white ' +
        'shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/45 ' +
        'hover:brightness-110 active:brightness-100 ' +
        'border border-amber-400/20',

    // Info – sky blue
    info:
        'bg-gradient-to-br from-sky-500 to-blue-600 ' +
        'text-white ' +
        'shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/45 ' +
        'hover:brightness-110 active:brightness-100 ' +
        'border border-sky-400/20',

    // Outline – clean edge with glass feel
    outline:
        'bg-transparent backdrop-blur-sm ' +
        'text-indigo-600 dark:text-indigo-400 ' +
        'border-2 border-indigo-500/40 dark:border-indigo-400/30 ' +
        'shadow-sm ' +
        'hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 ' +
        'hover:border-indigo-500/60 dark:hover:border-indigo-400/50 ' +
        'hover:shadow-md hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/30',

    // Ghost – minimal, perfect for icon buttons
    ghost:
        'bg-transparent text-gray-600 dark:text-gray-400 ' +
        'hover:bg-gray-100/70 dark:hover:bg-gray-800/70 ' +
        'hover:text-gray-900 dark:hover:text-white ' +
        'active:bg-gray-200/50 dark:active:bg-gray-700/50',

    'ghost-danger':
        'bg-transparent text-red-500 ' +
        'hover:bg-red-50/80 dark:hover:bg-red-900/20 ' +
        'hover:text-red-600 dark:hover:text-red-400 ' +
        'active:bg-red-100/50 dark:active:bg-red-900/40',

    // NEW: Glass – full glassmorphism with luminous border
    glass:
        'bg-white/60 dark:bg-gray-900/60 ' +
        'backdrop-blur-2xl backdrop-saturate-200 ' +
        'text-gray-800 dark:text-gray-100 ' +
        'border border-white/30 dark:border-gray-700/30 ' +
        'shadow-xl shadow-black/5 dark:shadow-black/20 ' +
        'hover:bg-white/75 dark:hover:bg-gray-900/75 ' +
        'hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 ' +
        'hover:border-white/50 dark:hover:border-gray-600/40',

    // NEW: Floating – elevated button with extra depth
    floating:
        'bg-white dark:bg-gray-800 ' +
        'text-gray-800 dark:text-gray-100 ' +
        'border border-gray-200/60 dark:border-gray-600/40 ' +
        'shadow-xl shadow-gray-300/40 dark:shadow-gray-900/50 ' +
        'hover:shadow-2xl hover:shadow-gray-400/50 dark:hover:shadow-gray-900/70 ' +
        'hover:-translate-y-1',
};

// ───────────────────────────
// 3. Sizes with icon‑only perfect squares
// ───────────────────────────
const sizes = {
    xs: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    sm: 'px-4 py-2 text-sm rounded-xl gap-2',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2.5',
    lg: 'px-7 py-3.5 text-base rounded-2xl gap-3',
    xl: 'px-9 py-4.5 text-lg rounded-2xl gap-3.5',
};

const iconOnlyPadding = {
    xs: 'p-1.5',
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
    xl: 'p-4',
};

// ───────────────────────────
// 4. The Premium Button Component
// ───────────────────────────
const Button = forwardRef(
    (
        {
            variant = 'primary',
            size = 'md',
            className = '',
            disabled = false,
            loading = false,
            loadingText = 'Loading...',
            icon: Icon = null,
            iconRight: IconRight = null,
            fullWidth = false,
            pill = false,
            iconOnly = false,
            disabledReason = null,
            badge = null,
            children,
            sheen = false,          // NEW: animated sheen overlay
            ...props
        },
        ref
    ) => {
        ensureGlobalStyles();

        const iconSize = size === 'xs' ? 14 : size === 'sm' ? 15 : 16;

        // Safe badge logic – never render NaN
        const displayBadge =
            typeof badge === 'number' && isNaN(badge) ? null : badge;
        const hasBadge = displayBadge !== null && displayBadge !== undefined;

        // Combine classes
        const combinedClassName = `
      ${variants[variant] || variants.primary}
      ${iconOnly ? iconOnlyPadding[size] || 'p-2.5' : sizes[size] || sizes.md}
      inline-flex items-center justify-center
      relative font-semibold tracking-tight
      transition-all duration-200 ease-out
      hover:-translate-y-0.5
      active:translate-y-0 active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:shadow-none
      focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900
      ${fullWidth ? 'w-full' : ''}
      ${pill ? '!rounded-full' : ''}
      ${sheen ? 'btn-sheen-effect' : ''}
      ${className}
    `
            .trim()
            .replace(/\s+/g, ' ');

        return (
            <button
                ref={ref}
                className={combinedClassName}
                disabled={disabled || loading}
                title={disabled && disabledReason ? disabledReason : undefined}
                {...props}
            >
                {/* Badge */}
                {hasBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm z-10">
                        {displayBadge > 99 ? '99+' : displayBadge}
                    </span>
                )}

                {/* Loading state */}
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="btn-loading-spinner" />
                        {!iconOnly && <span>{loadingText}</span>}
                    </div>
                ) : (
                    <>
                        {Icon && <Icon size={iconSize} className="shrink-0" />}
                        {!iconOnly && children}
                        {IconRight && <IconRight size={iconSize} className="shrink-0" />}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
export default Button;