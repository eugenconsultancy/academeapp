import { useState, useCallback, useRef, useEffect } from 'react';
import {
    FiEye, FiEyeOff, FiRefreshCw, FiLock,
    FiZoomIn, FiZoomOut, FiDownload,
} from 'react-icons/fi';

/**
 * BlurredImage Component
 * 
 * Features:
 * - Privacy-first: images start blurred with toggle to reveal
 * - Click/tap to toggle blur state
 * - Progressive blur transition animation
 * - Configurable blur amount and overlay text
 * - PIN/password protection option
 * - Lazy loading with intersection observer
 * - Responsive images with srcSet support
 * - Loading skeleton with proper dimensions
 * - Error state with retry
 * - Keyboard accessible
 * - ARIA compliant
 * - Auto-reblur after timeout
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.initialBlur - Initial blur amount in px (default 20)
 * @param {number} props.revealedBlur - Blur when revealed (default 0)
 * @param {string} props.overlayText - Text shown over blurred image
 * @param {boolean} props.showOverlayOnReveal - Show overlay when revealed
 * @param {string} props.overlayPosition - 'center', 'top', 'bottom'
 * @param {boolean} props.requireTap - Require tap to reveal
 * @param {string} props.protectionType - 'none', 'tap', 'hover', 'pin'
 * @param {string} props.correctPin - PIN for protection (if type is 'pin')
 * @param {number} props.autoReblurMs - Auto re-blur after ms (0 = never)
 * @param {Function} props.onReveal - Callback when image is revealed
 * @param {Function} props.onBlur - Callback when image is re-blurred
 * @param {string} props.placeholderColor - Skeleton background color
 * @param {number} props.aspectRatio - Aspect ratio (width/height)
 * @param {boolean} props.lazy - Enable lazy loading
 * @param {boolean} props.zoomable - Enable zoom on double click
 */
export function BlurredImage({
    src,
    alt = '',
    className = '',
    initialBlur = 20,
    revealedBlur = 0,
    overlayText = 'Tap to reveal',
    showOverlayOnReveal = false,
    overlayPosition = 'center',
    requireTap = true,
    protectionType = 'tap', // 'none', 'tap', 'hover', 'pin'
    correctPin = null,
    autoReblurMs = 0,
    onReveal = null,
    onBlur = null,
    placeholderColor = 'bg-gray-200 dark:bg-gray-700',
    aspectRatio = null,
    lazy = true,
    zoomable = false,
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [isRevealed, setIsRevealed] = useState(protectionType === 'none');
    const [currentBlur, setCurrentBlur] = useState(initialBlur);
    const [isZoomed, setIsZoomed] = useState(false);
    const [showPinInput, setShowPinInput] = useState(false);
    const [pinValue, setPinValue] = useState('');
    const [pinError, setPinError] = useState(false);

    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const autoReblurTimerRef = useRef(null);
    const observerRef = useRef(null);
    const [isInViewport, setIsInViewport] = useState(!lazy);

    // ═════════════════════════════════════════════════════════
    // INTERSECTION OBSERVER FOR LAZY LOADING
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (!lazy || isInViewport) return;

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInViewport(true);
                    observerRef.current?.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        if (containerRef.current) {
            observerRef.current.observe(containerRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [lazy, isInViewport]);

    // ═════════════════════════════════════════════════════════
    // BLUR TRANSITION
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        // Smooth blur transition
        const targetBlur = isRevealed ? revealedBlur : initialBlur;
        const startBlur = currentBlur;
        const duration = 400; // ms
        const startTime = performance.now();

        const animateBlur = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease-out

            const newBlur = startBlur + (targetBlur - startBlur) * eased;
            setCurrentBlur(newBlur);

            if (progress < 1) {
                requestAnimationFrame(animateBlur);
            }
        };

        requestAnimationFrame(animateBlur);
    }, [isRevealed, initialBlur, revealedBlur]);

    // ═════════════════════════════════════════════════════════
    // AUTO RE-BLUR TIMER
    // ═════════════════════════════════════════════════════════

    useEffect(() => {
        if (autoReblurTimerRef.current) {
            clearTimeout(autoReblurTimerRef.current);
        }

        if (isRevealed && autoReblurMs > 0) {
            autoReblurTimerRef.current = setTimeout(() => {
                handleToggleBlur(false);
            }, autoReblurMs);
        }

        return () => {
            if (autoReblurTimerRef.current) {
                clearTimeout(autoReblurTimerRef.current);
            }
        };
    }, [isRevealed, autoReblurMs]);

    // ═════════════════════════════════════════════════════════
    // TOGGLE HANDLERS
    // ═════════════════════════════════════════════════════════

    const handleToggleBlur = useCallback(
        (reveal = null) => {
            const newState = reveal !== null ? reveal : !isRevealed;

            if (newState && protectionType === 'pin' && correctPin) {
                setShowPinInput(true);
                return;
            }

            setIsRevealed(newState);

            if (newState && onReveal) onReveal();
            if (!newState && onBlur) onBlur();
        },
        [isRevealed, protectionType, correctPin, onReveal, onBlur]
    );

    const handlePinSubmit = useCallback(() => {
        if (pinValue === correctPin) {
            setIsRevealed(true);
            setShowPinInput(false);
            setPinError(false);
            setPinValue('');
            if (onReveal) onReveal();
        } else {
            setPinError(true);
            setTimeout(() => setPinError(false), 2000);
        }
    }, [pinValue, correctPin, onReveal]);

    const handleRetry = useCallback(() => {
        setError(false);
        setLoaded(false);
        // Force re-fetch by appending timestamp
        if (imageRef.current) {
            imageRef.current.src = `${src}${src.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        }
    }, [src]);

    const handleZoom = useCallback(() => {
        if (!zoomable) return;
        setIsZoomed(!isZoomed);
    }, [zoomable, isZoomed]);

    // ═════════════════════════════════════════════════════════
    // KEYBOARD HANDLER
    // ═════════════════════════════════════════════════════════

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggleBlur();
            }
            if (e.key === 'Escape') {
                handleToggleBlur(false);
            }
        },
        [handleToggleBlur]
    );

    // ═════════════════════════════════════════════════════════
    // RENDER: ERROR STATE
    // ═════════════════════════════════════════════════════════

    if (error) {
        return (
            <div
                className={`flex flex-col items-center justify-center gap-3 ${placeholderColor} ${className}`}
                style={aspectRatio ? { aspectRatio } : undefined}
                role="img"
                aria-label={`Failed to load image: ${alt}`}
            >
                <span className="text-4xl" aria-hidden="true">🖼️</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</span>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-600 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all"
                >
                    <FiRefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════
    // RENDER: MAIN
    // ═════════════════════════════════════════════════════════

    const overlayPositionClasses = {
        center: 'items-center justify-center',
        top: 'items-start justify-center pt-2',
        bottom: 'items-end justify-center pb-2',
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden group ${className}`}
            style={aspectRatio ? { aspectRatio } : undefined}
            onClick={() => protectionType !== 'pin' && handleToggleBlur()}
            onMouseEnter={() => protectionType === 'hover' && handleToggleBlur(true)}
            onMouseLeave={() => protectionType === 'hover' && handleToggleBlur(false)}
            onDoubleClick={handleZoom}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`${isRevealed ? 'Revealed' : 'Blurred'} image: ${alt}. ${protectionType === 'tap' ? 'Press Enter or Space to toggle.' : ''}`}
            aria-pressed={isRevealed}
        >
            {/* Loading skeleton */}
            {!loaded && (
                <div
                    className={`absolute inset-0 ${placeholderColor} animate-pulse`}
                    aria-hidden="true"
                />
            )}

            {/* Actual image (only load if in viewport) */}
            {isInViewport && (
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt}
                    loading={lazy ? 'lazy' : undefined}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={`
                        w-full h-full object-cover transition-all duration-500 ease-out
                        ${loaded ? 'opacity-100' : 'opacity-0'}
                        ${isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-pointer'}
                    `}
                    style={{
                        filter: `blur(${currentBlur}px)`,
                        transition: 'filter 0.4s ease-out, transform 0.3s ease-out, opacity 0.5s ease-out',
                    }}
                    draggable={false}
                />
            )}

            {/* Overlay with privacy text */}
            {(!isRevealed || showOverlayOnReveal) && loaded && (
                <div
                    className={`absolute inset-0 flex ${overlayPositionClasses[overlayPosition] || overlayPositionClasses.center} p-4 transition-opacity duration-300 ${!isRevealed ? 'opacity-100' : 'opacity-70'}`}
                    aria-hidden="true"
                >
                    <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                        {!isRevealed && protectionType === 'pin' && <FiLock className="w-3 h-3" />}
                        {!isRevealed && protectionType !== 'pin' && <FiEye className="w-3 h-3" />}
                        {isRevealed && <FiEyeOff className="w-3 h-3" />}
                        <span>{isRevealed ? 'Tap to blur' : overlayText}</span>
                    </div>
                </div>
            )}

            {/* Zoom indicator */}
            {zoomable && isRevealed && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-lg">
                        <FiZoomIn className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* Reveal/Blur toggle button (visible on hover) */}
            {protectionType !== 'hover' && protectionType !== 'pin' && loaded && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBlur();
                    }}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-black/80"
                    aria-label={isRevealed ? 'Blur image' : 'Reveal image'}
                >
                    {isRevealed ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
            )}

            {/* PIN Input Modal */}
            {showPinInput && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-xs w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                <FiLock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Enter PIN</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Required to view image</p>
                            </div>
                        </div>

                        <input
                            type="password"
                            value={pinValue}
                            onChange={(e) => {
                                setPinValue(e.target.value);
                                setPinError(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                            placeholder="Enter PIN"
                            maxLength={6}
                            className={`w-full px-4 py-2.5 rounded-lg border-2 text-center text-lg tracking-widest font-mono ${pinError ? 'border-red-500 animate-shake' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all`}
                            autoFocus
                        />

                        {pinError && (
                            <p className="text-red-500 text-xs mt-2 text-center">Incorrect PIN. Try again.</p>
                        )}

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowPinInput(false);
                                    setPinValue('');
                                    setPinError(false);
                                }}
                                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePinSubmit}
                                className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Unlock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animation style */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════
export default BlurredImage;

// ═══════════════════════════════════════════════════════════════
// PRESET VARIANTS
// ═══════════════════════════════════════════════════════════════

/**
 * ID Card variant - heavily blurred with PIN protection
 */
export function IDCardImage(props) {
    return (
        <BlurredImage
            {...props}
            initialBlur={30}
            overlayText="🔒 ID Card • Enter PIN to view"
            protectionType="pin"
            correctPin={props.pin || '1234'}
            autoReblurMs={10000}
        />
    );
}

/**
 * Document variant - medium blur, tap to reveal
 */
export function DocumentImage(props) {
    return (
        <BlurredImage
            {...props}
            initialBlur={15}
            overlayText="📄 Document • Tap to view"
            protectionType="tap"
            autoReblurMs={15000}
        />
    );
}

/**
 * Found item variant - light blur for privacy
 */
export function FoundItemImage(props) {
    return (
        <BlurredImage
            {...props}
            initialBlur={10}
            overlayText="🔍 Found Item • Tap to verify"
            protectionType="tap"
            showOverlayOnReveal={true}
        />
    );
}