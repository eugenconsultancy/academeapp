import { useEffect, useRef, useCallback, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
};

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer = null,
    size = 'md',
    showClose = true,
    closeOnOverlay = true,
    closeOnEscape = true,
    loading = false,
    className = '',
    initialFocus = null,
    onOpen = null,
    onClosed = null,
    preventScroll = true,
}) {
    const modalRef = useRef(null);
    const triggerRef = useRef(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // ═════════════════════════════════════════════════════════
    // ANIMATION HANDLING
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (isOpen) {
            // Save trigger element for return focus
            triggerRef.current = document.activeElement;
            setShouldRender(true);
            // Trigger enter animation
            requestAnimationFrame(() => setIsAnimating(true));
            if (onOpen) onOpen();
        } else {
            setIsAnimating(false);
            // Wait for exit animation before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
                if (onClosed) onClosed();
                // Return focus to trigger
                if (triggerRef.current) {
                    triggerRef.current.focus();
                    triggerRef.current = null;
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onOpen, onClosed]);

    // ═════════════════════════════════════════════════════════
    // SCROLL LOCK
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (isOpen && preventScroll) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen, preventScroll]);

    // ═════════════════════════════════════════════════════════
    // ESCAPE KEY
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // ═════════════════════════════════════════════════════════
    // FOCUS TRAP
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focus initial element or first focusable
        if (initialFocus && modalRef.current.querySelector(initialFocus)) {
            modalRef.current.querySelector(initialFocus).focus();
        } else if (firstFocusable) {
            firstFocusable.focus();
        }

        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        };

        modalRef.current.addEventListener('keydown', handleTab);
        return () => modalRef.current?.removeEventListener('keydown', handleTab);
    }, [isOpen, initialFocus]);

    if (!shouldRender) return null;

    return createPortal(
        <>
            <style>{`
                .modal-overlay {
                    position: fixed; inset: 0; z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 16px;
                }
                .modal-backdrop {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    transition: opacity 0.2s ease;
                    opacity: ${isAnimating ? 1 : 0};
                }
                .modal-container {
                    position: relative; width: 100%;
                    border-radius: 24px;
                    background: rgba(250, 216, 240, 0.95);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.5);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 20px 60px rgba(0,0,0,0.2);
                    max-height: 90vh; overflow: hidden;
                    display: flex; flex-direction: column;
                    transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
                    transform: ${isAnimating ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)'};
                    opacity: ${isAnimating ? 1 : 0};
                }
                .dark .modal-container {
                    background: rgba(17,17,34,0.95);
                    border-color: rgba(255,255,255,0.08);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.6);
                }
                .modal-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.06); flex-shrink: 0;
                }
                .dark .modal-header { border-bottom-color: rgba(255,255,255,0.06); }
                .modal-title { font-size: 1.2rem; font-weight: 700; color: #1f2937; margin: 0; }
                .dark .modal-title { color: #f9fafb; }
                .modal-close-btn {
                    width: 36px; height: 36px; border-radius: 10px; border: none;
                    background: rgba(0,0,0,0.04); color: #6b7280; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; flex-shrink: 0;
                }
                .modal-close-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; transform: scale(1.05); }
                .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
                .modal-body::-webkit-scrollbar { width: 4px; }
                .modal-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
                .modal-footer {
                    padding: 16px 24px; border-top: 1px solid rgba(0,0,0,0.06);
                    display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;
                }
                .dark .modal-footer { border-top-color: rgba(255,255,255,0.06); }
                .modal-loading-overlay {
                    position: absolute; inset: 0; z-index: 10;
                    background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                }
                @media (max-width: 640px) {
                    .modal-overlay { padding: 8px; align-items: flex-end; }
                    .modal-container { border-radius: 24px 24px 8px 8px; max-height: 85vh; }
                }
            `}</style>

            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div
                    className="modal-backdrop"
                    onClick={closeOnOverlay ? onClose : undefined}
                />
                <div
                    ref={modalRef}
                    className={`modal-container ${sizeClasses[size] || sizeClasses.md} ${className}`}
                    tabIndex={-1}
                >
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="modal-title" id="modal-title">{title}</h2>
                        {showClose && (
                            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                                <FiX size={18} />
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="modal-body">{children}</div>

                    {/* Footer */}
                    {footer && <div className="modal-footer">{footer}</div>}

                    {/* Loading overlay */}
                    {loading && (
                        <div className="modal-loading-overlay">
                            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE: Confirm Dialog
// ═══════════════════════════════════════════════════════════════

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary', // primary, danger, warning
    loading = false,
}) {
    const buttonVariants = {
        primary: 'bg-indigo-500 hover:bg-indigo-600 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showClose={!loading}>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
            <div className="flex gap-3 mt-6">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${buttonVariants[variant] || buttonVariants.primary}`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processing...
                        </span>
                    ) : confirmText}
                </button>
            </div>
        </Modal>
    );
}