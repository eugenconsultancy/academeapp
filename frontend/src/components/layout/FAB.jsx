// src/components/layout/FAB.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useDraggableFAB from '../../hooks/useDraggableFAB';
import { FiHome, FiPackage, FiBell, FiUser, FiLogOut } from 'react-icons/fi';

// ─── Menu config ───────────────────────────────────────────────────────────────
const MENU_ITEMS = [
    {
        icon: FiHome,
        label: 'Home',
        route: '/',
        color: '#3b82f6',          // blue-500
        bg: 'rgba(59,130,246,0.12)',
        hoverBg: 'rgba(59,130,246,0.18)',
    },
    {
        icon: FiPackage,
        label: 'Found Items',
        route: '/found-items',
        color: '#10b981',          // emerald-500
        bg: 'rgba(16,185,129,0.12)',
        hoverBg: 'rgba(16,185,129,0.18)',
    },
    {
        icon: FiBell,
        label: 'Announcements',
        route: '/announcements',
        color: '#f59e0b',          // amber-500
        bg: 'rgba(245,158,11,0.12)',
        hoverBg: 'rgba(245,158,11,0.18)',
    },
    {
        icon: FiUser,
        label: 'Profile',
        route: '/profile',
        color: '#8b5cf6',          // violet-500
        bg: 'rgba(139,92,246,0.12)',
        hoverBg: 'rgba(139,92,246,0.18)',
    },
    {
        icon: FiLogOut,
        label: 'Sign out',
        danger: true,
        color: '#ef4444',          // red-500
        bg: 'rgba(239,68,68,0.10)',
        hoverBg: 'rgba(239,68,68,0.18)',
    },
];

// ─── Individual menu pill ──────────────────────────────────────────────────────
function MenuItem({ item, index, total, openDirection, onClick }) {
    const [hovered, setHovered] = useState(false);
    const Icon = item.icon;

    // Staggered entrance delay
    const delay = openDirection === 'up'
        ? (total - 1 - index) * 45
        : index * 45;

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={item.label}
            style={{
                animationDelay: `${delay}ms`,
                backgroundColor: hovered ? item.hoverBg : item.bg,
                borderColor: hovered ? item.color + '55' : 'rgba(255,255,255,0.15)',
                boxShadow: hovered
                    ? `0 4px 20px ${item.color}33, 0 0 0 1px ${item.color}22`
                    : '0 2px 12px rgba(0,0,0,0.12)',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
            className="
        group relative flex items-center gap-3
        px-4 py-2.5 rounded-2xl
        backdrop-blur-xl border
        transition-all duration-200 ease-out
        animate-fab-item
        cursor-pointer
        min-w-[148px]
      "
        >
            {/* Icon slot — fixed size so FAB never resizes */}
            <span
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors duration-200"
                style={{ backgroundColor: item.color + '22' }}
            >
                <Icon style={{ color: item.color }} className="w-4 h-4" />
            </span>

            {/* Label */}
            <span
                className="text-sm font-semibold tracking-tight whitespace-nowrap transition-colors duration-200"
                style={{ color: item.danger ? item.color : 'inherit' }}
            >
                {item.label}
            </span>

            {/* Subtle right-side accent line */}
            <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full transition-opacity duration-200"
                style={{
                    backgroundColor: item.color,
                    opacity: hovered ? 1 : 0,
                }}
            />
        </button>
    );
}

// ─── Main FAB ──────────────────────────────────────────────────────────────────
export default function FAB() {
    const [open, setOpen] = useState(false);
    const [isTopHalf, setIsTopHalf] = useState(false);
    const fabRef = useRef(null);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const {
        handleDragStart,
        handleDrag,
        handleDragEnd,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        fabStyle,
        isDragging,
        position,
        snapEdge,
    } = useDraggableFAB({
        snapToEdge: true,
        edgePadding: 16,
        onClick: () => setOpen((prev) => !prev),
        onDragStart: () => { if (open) setOpen(false); },
    });

    // ── Detect whether FAB is in the top half of the viewport ─────────────────
    useEffect(() => {
        if (!position) return;
        const mid = window.innerHeight / 2;
        // position.y is the FAB's top edge from useDraggableFAB
        setIsTopHalf((position.y ?? 0) < mid);
    }, [position]);

    const openDirection = isTopHalf ? 'down' : 'up';

    // ── Actions ────────────────────────────────────────────────────────────────
    const actions = MENU_ITEMS.map((item) => ({
        ...item,
        action: item.danger ? logout : () => navigate(item.route),
    }));

    const handleItemClick = useCallback((action) => {
        action();
        setOpen(false);
    }, []);

    // ── Escape to close ────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && open) setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // ── Merge cursor style into fabStyle ──────────────────────────────────────
    const mergedFabStyle = {
        ...fabStyle,
        cursor: isDragging ? 'grabbing' : 'grab',
        // Bouncy snap transition — applied to the container so it covers the snap
        transition: isDragging
            ? 'none'
            : 'left 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    };

    return (
        <>
            {/* ── Backdrop ─────────────────────────────────────────────────────── */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-40"
                    style={{ animation: 'fabBackdropIn 0.18s ease both' }}
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Draggable container ───────────────────────────────────────────── */}
            <div
                ref={fabRef}
                className="fixed z-50 touch-none select-none"
                style={mergedFabStyle}
                onMouseDown={handleDragStart}
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                role="button"
                aria-label="Navigation menu"
                aria-expanded={open}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((prev) => !prev);
                    }
                }}
            >
                {/* ── Menu items ─────────────────────────────────────────────────── */}
                {open && (
                    <div
                        className={`
              absolute right-0 flex flex-col items-end gap-2
              ${openDirection === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'}
            `}
                        style={{ animation: 'fabMenuIn 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
                    >
                        {/* Render bottom→top visually when opening upward */}
                        {(openDirection === 'up' ? [...actions].reverse() : actions).map((item, idx) => (
                            <MenuItem
                                key={item.label}
                                item={item}
                                index={idx}
                                total={actions.length}
                                openDirection={openDirection}
                                onClick={() => handleItemClick(item.action)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Main button ────────────────────────────────────────────────── */}
                <button
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    className={`
            relative w-14 h-14 rounded-full
            flex items-center justify-center
            bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600
            hover:from-indigo-600 hover:via-indigo-700 hover:to-blue-700
            text-white
            shadow-lg hover:shadow-xl hover:shadow-indigo-500/30
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
            dark:focus:ring-offset-gray-900
            transition-all duration-300 ease-out
            active:scale-95
            overflow-hidden
          `}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                // Don't attach click here — the drag hook handles click via onClick callback
                >
                    {/* Shimmer ring when open */}
                    {open && (
                        <span
                            className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"
                            style={{ animationDuration: '1.4s' }}
                        />
                    )}

                    {/* Fixed-size icon wrapper so button never shifts size */}
                    <span className="relative w-6 h-6 flex items-center justify-center">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-6 h-6 absolute inset-0 transition-all duration-300"
                            style={{
                                opacity: open ? 0 : 1,
                                transform: open ? 'rotate(45deg) scale(0.7)' : 'rotate(0deg) scale(1)',
                            }}
                        >
                            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-6 h-6 absolute inset-0 transition-all duration-300"
                            style={{
                                opacity: open ? 1 : 0,
                                transform: open ? 'rotate(0deg) scale(1)' : 'rotate(-45deg) scale(0.7)',
                            }}
                        >
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </span>
                </button>
            </div>

            {/* ── Keyframes ────────────────────────────────────────────────────────── */}
            <style>{`
        @keyframes fabBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fabMenuIn {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-fab-item {
          animation: fabItemIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Light mode menu pill glass */
        .animate-fab-item {
          background-clip: padding-box;
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          backdrop-filter: blur(16px) saturate(180%);
          color: #1f2937;
        }
        /* Dark mode override */
        @media (prefers-color-scheme: dark) {
          .animate-fab-item { color: #f3f4f6; }
        }
        /* Also handle Tailwind's class-based dark mode */
        .dark .animate-fab-item { color: #f3f4f6; }
      `}</style>
        </>
    );
}