import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiZap, FiArrowLeft, FiHome, FiSearch,
  FiAlertCircle, FiWifiOff, FiHelpCircle,
  FiRefreshCw, FiChevronRight,
} from 'react-icons/fi';

/**
 * ItemNotFound Component
 * 
 * A versatile "not found" state component with multiple variants,
 * customizable actions, search suggestions, and error type detection.
 * 
 * Features:
 * - Multiple variants: 404, network error, offline, generic
 * - Customizable icon, title, description
 * - Configurable action buttons
 * - Search bar for finding items
 * - Suggested items/links section
 * - Contact support link
 * - Back navigation with browser history
 * - Animation variants (fade, slide, bounce)
 * - ARIA live region for screen readers
 * - Dark mode support via CSS variables
 * - Error code display
 * 
 * @param {Object} props
 * @param {string} props.title - Item type name (e.g., "Announcement", "Student")
 * @param {string} props.variant - '404', 'network', 'offline', 'generic'
 * @param {string} props.message - Custom description (overrides default)
 * @param {React.ReactNode} props.icon - Custom icon component
 * @param {string} props.errorCode - Error code to display (e.g., "404")
 * @param {string} props.backTo - URL for back button
 * @param {string} props.backLabel - Label for back button
 * @param {Array} props.actions - Array of { label, to, icon, variant } for action buttons
 * @param {Array} props.suggestions - Array of { label, to, description } for suggested items
 * @param {boolean} props.showSearch - Show search input
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {Function} props.onSearch - Search callback
 * @param {boolean} props.showSupport - Show contact support link
 * @param {string} props.animation - 'fade', 'slide', 'bounce'
 * @param {Function} props.onRetry - Retry callback (for network errors)
 */
export default function ItemNotFound({
  title = 'Item',
  variant = 'generic',
  message = null,
  icon = null,
  errorCode = null,
  backTo = '/',
  backLabel = 'Go Back',
  actions = null,
  suggestions = null,
  showSearch = false,
  searchPlaceholder = 'Search for items...',
  onSearch = null,
  showSupport = false,
  animation = 'fade',
  onRetry = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // ═════════════════════════════════════════════════════════
  // VARIANT CONFIGURATION
  // ═════════════════════════════════════════════════════════

  const variantConfig = {
    '404': {
      defaultIcon: FiZap,
      defaultTitle: 'Page Not Found',
      defaultMessage: `The page you're looking for doesn't exist or has been moved.`,
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
      iconShadow: 'rgba(245,158,11,0.3)',
    },
    network: {
      defaultIcon: FiAlertCircle,
      defaultTitle: 'Connection Error',
      defaultMessage: 'Unable to load this item. Please check your internet connection and try again.',
      iconBg: 'bg-gradient-to-br from-red-400 to-rose-500',
      iconShadow: 'rgba(239,68,68,0.3)',
    },
    offline: {
      defaultIcon: FiWifiOff,
      defaultTitle: 'You\'re Offline',
      defaultMessage: 'This content is not available offline. Please connect to the internet to view it.',
      iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
      iconShadow: 'rgba(100,116,139,0.3)',
    },
    generic: {
      defaultIcon: FiZap,
      defaultTitle: `${title} Not Found`,
      defaultMessage: `The ${title.toLowerCase()} you're looking for doesn't exist or may have been removed.`,
      iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      iconShadow: 'rgba(99,102,241,0.3)',
    },
  };

  const config = variantConfig[variant] || variantConfig.generic;
  const IconComponent = icon || config.defaultIcon;
  const displayTitle = errorCode ? `${config.defaultTitle} (${errorCode})` : config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  // ═════════════════════════════════════════════════════════
  // DEFAULT ACTIONS
  // ═════════════════════════════════════════════════════════

  const defaultActions = actions || [
    {
      label: backLabel,
      to: backTo,
      icon: FiArrowLeft,
      variant: 'outline',
      onClick: null,
    },
    {
      label: 'Home',
      to: '/',
      icon: FiHome,
      variant: 'primary',
      onClick: null,
    },
  ];

  // Add retry for network errors
  if (variant === 'network' && onRetry) {
    defaultActions.unshift({
      label: 'Retry',
      icon: FiRefreshCw,
      variant: 'primary',
      to: null,
      onClick: onRetry,
    });
  }

  // ═════════════════════════════════════════════════════════
  // SEARCH HANDLER
  // ═════════════════════════════════════════════════════════

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  // ═════════════════════════════════════════════════════════
  // ANIMATION CLASSES
  // ═════════════════════════════════════════════════════════

  const animationClasses = {
    fade: 'animate-fadeIn',
    slide: 'animate-slideUp',
    bounce: 'animate-bounceIn',
  };

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div
      className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      {/* ── Animation Styles ────────────────────── */}
      <style>{`
                .inf-container {
                    max-width: 480px;
                    width: 100%;
                }
                .animate-fadeIn {
                    animation: infFadeIn 0.5s ease both;
                }
                .animate-slideUp {
                    animation: infSlideUp 0.5s ease both;
                }
                .animate-bounceIn {
                    animation: infBounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
                }
                @keyframes infFadeIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes infSlideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes infBounceIn {
                    0% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 1; transform: scale(1.05); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>

      <div className={`inf-container ${animationClasses[animation] || animationClasses.fade}`}>
        {/* ── Icon ────────────────────────────── */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{
            background: `var(--inf-icon-bg, linear-gradient(135deg, #6366f1, #8b5cf6))`,
            boxShadow: `0 8px 32px var(--inf-icon-shadow, rgba(99,102,241,0.25))`,
          }}
        >
          <IconComponent size={32} className="text-white" />
        </div>

        {/* ── Title ───────────────────────────── */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {displayTitle}
        </h2>

        {/* ── Description ──────────────────────── */}
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-md mx-auto">
          {displayMessage}
        </p>

        {/* ── Search Bar ───────────────────────── */}
        {showSearch && (
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-sm mx-auto">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 outline-none transition-all"
              />
            </div>
          </form>
        )}

        {/* ── Action Buttons ───────────────────── */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {defaultActions.map((action, index) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant === 'primary';

            if (action.onClick) {
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${isPrimary
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {ActionIcon && <ActionIcon size={16} />}
                  {action.label}
                </button>
              );
            }

            return (
              <Link
                key={index}
                to={action.to || '/'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${isPrimary
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {ActionIcon && <ActionIcon size={16} />}
                {action.label}
              </Link>
            );
          })}
        </div>

        {/* ── Suggested Items ──────────────────── */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              You might be looking for:
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Link
                  key={index}
                  to={suggestion.to || '/'}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {suggestion.label}
                    </p>
                    {suggestion.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {suggestion.description}
                      </p>
                    )}
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Support Link ─────────────────────── */}
        {showSupport && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <FiHelpCircle size={14} />
              Still can't find it? Contact Support
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// IMPORT: Add useState to the import at the top
// ═══════════════════════════════════════════════════════════════
// Change: import { Link } from 'react-router-dom';
// To: import { Link, useNavigate, useLocation } from 'react-router-dom';
// And add: import { useState } from 'react';