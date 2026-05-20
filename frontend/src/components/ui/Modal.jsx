import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

/**
 * Modal — Premium modal dialog component
 * 
 * Props:
 *   isOpen     - Show/hide modal
 *   onClose    - Close handler
 *   title      - Modal title
 *   children   - Modal content
 *   size       - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 *   showClose  - Show close button (default: true)
 *   closeOnOverlay - Close when clicking overlay (default: true)
 */
export default function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    showClose = true,
    closeOnOverlay = true,
}) {
    const modalRef = useRef(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
            
            // Calculate scrollbar width
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        '2xl': 'max-w-4xl',
        full: 'max-w-[95vw] max-h-[95vh]',
    };

    return (
        <>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    animation: modalFadeIn 0.2s ease both;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    animation: modalFadeIn 0.25s ease both;
                }

                .modal-container {
                    position: relative;
                    width: 100%;
                    border-radius: 24px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow:
                        0 4px 12px rgba(0, 0, 0, 0.1),
                        0 20px 60px rgba(0, 0, 0, 0.2),
                        0 0 0 0.5px rgba(0, 0, 0, 0.05);
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                @keyframes modalSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .dark .modal-container {
                    background: rgba(17, 17, 34, 0.95);
                    border-color: rgba(255, 255, 255, 0.08);
                    box-shadow:
                        0 4px 12px rgba(0, 0, 0, 0.4),
                        0 20px 60px rgba(0, 0, 0, 0.6);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                    flex-shrink: 0;
                }
                .dark .modal-header {
                    border-bottom-color: rgba(255, 255, 255, 0.06);
                }

                .modal-title {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                    letter-spacing: -0.01em;
                }
                .dark .modal-title { color: #f9fafb; }

                .modal-close-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: none;
                    background: rgba(0, 0, 0, 0.04);
                    color: #6b7280;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .modal-close-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    transform: scale(1.05);
                }
                .dark .modal-close-btn {
                    background: rgba(255, 255, 255, 0.06);
                    color: #9ca3af;
                }
                .dark .modal-close-btn:hover {
                    background: rgba(239, 68, 68, 0.15);
                    color: #f87171;
                }

                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }

                /* Scrollbar styling */
                .modal-body::-webkit-scrollbar {
                    width: 4px;
                }
                .modal-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .modal-body::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 2px;
                }
                .dark .modal-body::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }

                @media (max-width: 640px) {
                    .modal-overlay {
                        padding: 8px;
                        align-items: flex-end;
                    }
                    .modal-container {
                        border-radius: 24px 24px 8px 8px;
                        max-height: 85vh;
                    }
                    .modal-header {
                        padding: 16px 20px;
                    }
                    .modal-body {
                        padding: 20px;
                    }
                }
            `}</style>

            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                {/* Backdrop */}
                <div 
                    className="modal-backdrop" 
                    onClick={closeOnOverlay ? onClose : undefined}
                />

                {/* Modal Container */}
                <div 
                    ref={modalRef}
                    className={`modal-container ${sizeClasses[size] || sizeClasses.md}`}
                    tabIndex={-1}
                >
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="modal-title" id="modal-title">
                            {title}
                        </h2>
                        {showClose && (
                            <button 
                                className="modal-close-btn" 
                                onClick={onClose}
                                aria-label="Close modal"
                            >
                                <FiX size={18} />
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
