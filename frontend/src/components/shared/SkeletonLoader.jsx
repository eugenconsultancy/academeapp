import { useMemo } from 'react';
import { FiZap } from 'react-icons/fi';

// ✅ FIXED: Extracted outside the component to prevent useMemo cache invalidation
const SHIMMER_CLASS =
  'bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:800px_100%] animate-shimmer rounded-lg';

const SIZE_MAP = {
  sm: { h: 8, w: '60%', gap: 6 },
  md: { h: 12, w: '70%', gap: 8 },
  lg: { h: 16, w: '80%', gap: 10 },
};

/**
 * SkeletonLoader Component
 */
export default function SkeletonLoader({
  type = 'card',
  count = 1,
  lines = 3,
  width = null,
  height = null,
  variant = 'md',
  staggered = true,
  className = '',
  brandName = 'Academe',
  loadingText = 'Loading...',
}) {

  const { h: lineH, w: lineW, gap } = SIZE_MAP[variant] || SIZE_MAP.md;

  // ═════════════════════════════════════════════════════════
  // RENDER BY TYPE (Optimized & Clean)
  // ═════════════════════════════════════════════════════════
  const renderSkeleton = useMemo(() => {
    switch (type) {
      // ── PAGE LOADER ──────────────────────────
      case 'page':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
                <FiZap size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {brandName}
                </h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
                  Loading
                </p>
              </div>
            </div>

            <div className="w-48 h-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-full animate-progress-indeterminate" />
            </div>

            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
              {loadingText}
            </p>
          </div>
        );

      // ── CARD ─────────────────────────────────
      case 'card':
        return (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 overflow-hidden">
            <div className={`${SHIMMER_CLASS} h-40 rounded-xl mb-4`} />
            <div className={`${SHIMMER_CLASS} h-4 w-[70%] mb-3`} />
            <div className={`${SHIMMER_CLASS} h-3 w-[45%]`} />
          </div>
        );

      // ── LIST ─────────────────────────────────
      case 'list':
        return (
          <div className="flex flex-col" style={{ gap: `${gap}px` }}>
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
                style={{
                  animationDelay: staggered ? `${i * 80}ms` : '0ms',
                }}
              >
                <div
                  className={`${SHIMMER_CLASS} rounded-full flex-shrink-0`}
                  style={{ width: 36, height: 36 }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className={SHIMMER_CLASS}
                    style={{ height: lineH, width: '65%' }}
                  />
                  <div
                    className={SHIMMER_CLASS}
                    style={{ height: lineH - 2, width: '40%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      // ── TEXT / PARAGRAPH ─────────────────────
      case 'text':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines || count }).map((_, i) => (
              <div
                key={i}
                className={SHIMMER_CLASS}
                style={{
                  height: `${lineH}px`,
                  width: i === lines - 1 ? '60%' : lineW,
                  animationDelay: staggered ? `${i * 100}ms` : '0ms',
                }}
              />
            ))}
          </div>
        );

      // ── TABLE ────────────────────────────────
      case 'table':
        return (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`h-${i}`} className={`${SHIMMER_CLASS} h-4 flex-1`} />
              ))}
            </div>
            {Array.from({ length: count }).map((_, row) => (
              <div
                key={row}
                className="flex gap-4 p-4 border-t border-gray-50 dark:border-gray-800"
                style={{ animationDelay: staggered ? `${row * 60}ms` : '0ms' }}
              >
                {Array.from({ length: 4 }).map((_, col) => (
                  <div key={`${row}-${col}`} className={`${SHIMMER_CLASS} h-3 flex-1`} />
                ))}
              </div>
            ))}
          </div>
        );

      // ── AVATAR / PROFILE ─────────────────────
      case 'avatar':
        return (
          <div className="flex items-center gap-4">
            <div
              className={`${SHIMMER_CLASS} rounded-full flex-shrink-0`}
              style={{
                width: width || 48,
                height: height || 48,
              }}
            />
            <div className="flex-1 space-y-2">
              <div className={`${SHIMMER_CLASS} h-4 w-[55%]`} />
              <div className={`${SHIMMER_CLASS} h-3 w-[35%]`} />
            </div>
          </div>
        );

      // ── DASHBOARD ────────────────────────────
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
                  style={{ animationDelay: staggered ? `${i * 100}ms` : '0ms' }}
                >
                  <div className={`${SHIMMER_CLASS} h-8 w-8 rounded-lg mb-3`} />
                  <div className={`${SHIMMER_CLASS} h-3 w-[60%] mb-2`} />
                  <div className={`${SHIMMER_CLASS} h-6 w-[40%]`} />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
              <div className={`${SHIMMER_CLASS} h-4 w-[30%] mb-4`} />
              <div className={`${SHIMMER_CLASS} h-48 rounded-lg`} />
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
              <div className={`${SHIMMER_CLASS} h-4 w-[25%] mb-4`} />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`${SHIMMER_CLASS} h-8 w-8 rounded-full`} />
                    <div className="flex-1 space-y-2">
                      <div className={`${SHIMMER_CLASS} h-3 w-[55%]`} />
                      <div className={`${SHIMMER_CLASS} h-2 w-[35%]`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ── FORM ─────────────────────────────────
      case 'form':
        return (
          <div className="space-y-5">
            {Array.from({ length: count || 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className={`${SHIMMER_CLASS} h-3 w-[25%] rounded`} />
                <div className={`${SHIMMER_CLASS} h-10 rounded-lg`} />
              </div>
            ))}
            <div className={`${SHIMMER_CLASS} h-10 w-[30%] rounded-lg mt-6`} />
          </div>
        );

      // ── IMAGE ────────────────────────────────
      case 'image':
        return (
          <div
            className="rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden"
            style={{
              width: width || '100%',
              height: height || 200,
              minHeight: 120,
            }}
          >
            <FiZap size={28} className="text-gray-300 dark:text-gray-600 animate-pulse" />
          </div>
        );

      // ── GRID ─────────────────────────────────
      case 'grid':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: count || 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3"
                style={{ animationDelay: staggered ? `${i * 60}ms` : '0ms' }}
              >
                <div className={`${SHIMMER_CLASS} h-32 rounded-lg mb-3`} />
                <div className={`${SHIMMER_CLASS} h-3 w-[70%] mb-2`} />
                <div className={`${SHIMMER_CLASS} h-2 w-[45%]`} />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
    // ✅ FIXED: Removed SHIMMER_CLASS reference string so validation works smoothly
  }, [type, count, lines, width, height, variant, staggered, lineH, lineW, gap, brandName, loadingText]);

  return (
    <>
      {/* Fallback animations for styling resilience */}
      <style>{`
        @keyframes progressIndeterminate {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progressIndeterminate 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="sr-only" role="status" aria-live="polite">
        Loading content, please wait...
      </div>

      <div className={className} aria-hidden="true">
        {renderSkeleton}
      </div>
    </>
  );
}