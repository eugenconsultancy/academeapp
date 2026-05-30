// src/components/layout/FAB.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useDraggableFAB from '../../hooks/useDraggableFAB';
import { FiHome, FiPackage, FiBell, FiUser, FiLogOut, FiX } from 'react-icons/fi';

export default function FAB() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();
    const fabRef = useRef(null);

    // Use the draggable hook
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
        onClick: () => setOpen(prev => !prev),
        onDragStart: () => {
            // Optionally close menu when dragging starts
            if (open) setOpen(false);
        },
    });

    const menuItems = [
        { icon: FiHome, label: 'Home', action: () => navigate('/'), color: 'text-blue-500' },
        { icon: FiPackage, label: 'Found Items', action: () => navigate('/found-items'), color: 'text-emerald-500' },
        { icon: FiBell, label: 'Announcements', action: () => navigate('/announcements'), color: 'text-amber-500' },
        { icon: FiUser, label: 'Profile', action: () => navigate('/profile'), color: 'text-purple-500' },
        { icon: FiLogOut, label: 'Sign Out', action: logout, danger: true, color: 'text-red-500' },
    ];

    // Close menu when pressing Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && open) setOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    // Prevent dragging when clicking on menu items
    const handleMenuItemClick = (action) => {
        action();
        setOpen(false);
    };

    return (
        <>
            {/* Backdrop overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-all duration-200"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Draggable FAB Container */}
            <div
                ref={fabRef}
                className="fixed z-50 touch-none"
                style={fabStyle}
                onMouseDown={handleDragStart}
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                role="button"
                aria-label="Floating action button"
                aria-expanded={open}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen(prev => !prev);
                    }
                }}
            >
                {/* Menu Items (popup above FAB) */}
                {open && (
                    <div className="absolute bottom-full right-0 mb-4 flex flex-col items-end gap-3 animate-slideUp">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuItemClick(item.action);
                                }}
                                className={`
                                    group relative flex items-center justify-center
                                    w-12 h-12 rounded-full
                                    shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl
                                    bg-white/90 dark:bg-gray-800/90 backdrop-blur-md
                                    border border-gray-200 dark:border-gray-700
                                    ${item.danger ? 'hover:bg-red-50 dark:hover:bg-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                                    ${item.color}
                                `}
                                title={item.label}
                            >
                                <item.icon className="w-5 h-5" />
                                {/* Tooltip on hover */}
                                <span className="
                                    absolute right-full mr-3 px-2 py-1 rounded-md text-xs font-medium
                                    bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-200
                                    whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                                    shadow-md
                                ">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Floating Action Button */}
                <button
                    className={`
                        w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                        transition-all duration-300 ease-out
                        bg-gradient-to-br from-primary-500 to-primary-600
                        hover:from-primary-600 hover:to-primary-700
                        text-white
                        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                        active:scale-95
                        ${open ? 'rotate-45 shadow-2xl' : 'rotate-0 shadow-lg'}
                    `}
                    aria-label="Menu"
                >
                    <svg
                        className={`w-6 h-6 transition-transform duration-300 ${open ? 'rotate-0' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        {open ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        )}
                    </svg>
                </button>
            </div>
        </>
    );
}