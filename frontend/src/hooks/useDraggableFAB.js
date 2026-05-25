import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_POSITION = { x: 20, y: window.innerHeight - 100 };
const FAB_SIZE = 56; // Standard FAB size
const HALF_FAB = FAB_SIZE / 2;
const SNAP_THRESHOLD = 0.3; // 30% velocity threshold for snap direction
const DRAG_THRESHOLD = 5; // Minimum pixels before drag starts
const EDGE_PADDING = 16;
const ANIMATION_DURATION = 300;

/**
 * Hook for a draggable Floating Action Button (FAB).
 * Enhanced with snap-to-edge, velocity-based positioning,
 * click vs drag detection, accessibility, and mobile support.
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.defaultPosition - Default {x, y} position
 * @param {boolean} options.snapToEdge - Whether to snap to nearest edge
 * @param {boolean} options.disabled - Disable dragging
 * @param {number} options.edgePadding - Padding from edges
 * @param {string} options.preferredEdge - 'left' or 'right'
 * @param {Function} options.onDragStart - Callback when drag starts
 * @param {Function} options.onDragEnd - Callback when drag ends
 * @param {Function} options.onClick - Callback on click (not drag)
 * @param {Function} options.onLongPress - Callback on long press
 * @param {Function} options.onDoubleTap - Callback on double tap
 * @param {HTMLElement} options.boundaryElement - Element to constrain within
 * @returns {Object} FAB hook API
 */
export function useDraggableFAB(options = {}) {
    const {
        defaultPosition = DEFAULT_POSITION,
        snapToEdge = true,
        disabled = false,
        edgePadding = EDGE_PADDING,
        preferredEdge = null,
        onDragStart = null,
        onDragEnd = null,
        onClick = null,
        onLongPress = null,
        onDoubleTap = null,
        boundaryElement = null,
    } = options;

    // ── State ──────────────────────────────────────────────────────
    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('fab_position');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate saved position is within bounds
                if (_isWithinBounds(parsed.x, parsed.y, edgePadding)) {
                    return parsed;
                }
            }
        } catch (e) {
            // Invalid saved position
        }
        return defaultPosition;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [snapEdge, setSnapEdge] = useState(null); // 'left' or 'right'

    // ── Refs ───────────────────────────────────────────────────────
    const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const lastPositionRef = useRef(position);
    const touchStartTimeRef = useRef(0);
    const hasMovedRef = useRef(false);
    const animationFrameRef = useRef(null);
    const isMountedRef = useRef(true);

    // ═══════════════════════════════════════════════════════════════
    // POSITION PERSISTENCE
    // ═══════════════════════════════════════════════════════════════

    useEffect(() => {
        try {
            localStorage.setItem('fab_position', JSON.stringify(position));
        } catch (e) {
            // localStorage full or unavailable
        }
    }, [position]);

    // ═══════════════════════════════════════════════════════════════
    // RESIZE & ORIENTATION HANDLER
    // ═══════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleResize = () => {
            const maxX = _getMaxX(edgePadding);
            const maxY = _getMaxY(edgePadding);

            setPosition((prev) => ({
                x: Math.max(edgePadding, Math.min(prev.x, maxX)),
                y: Math.max(edgePadding, Math.min(prev.y, maxY)),
            }));
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [edgePadding]);

    // ═══════════════════════════════════════════════════════════════
    // SNAP TO EDGE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Snap FAB to nearest edge with animation
     */
    const snapToNearestEdge = useCallback(
        (x, y, velocityX = 0) => {
            const maxX = _getMaxX(edgePadding);
            const centerX = maxX / 2;
            const maxY = _getMaxY(edgePadding);

            let snappedX;
            let edge;

            if (preferredEdge) {
                // Use preferred edge
                edge = preferredEdge;
                snappedX = preferredEdge === 'left' ? edgePadding : maxX;
            } else if (Math.abs(velocityX) > SNAP_THRESHOLD * 100) {
                // Snap based on velocity direction
                edge = velocityX < 0 ? 'left' : 'right';
                snappedX = velocityX < 0 ? edgePadding : maxX;
            } else {
                // Snap to nearest edge
                edge = x < centerX ? 'left' : 'right';
                snappedX = x < centerX ? edgePadding : maxX;
            }

            const clampedY = Math.max(edgePadding, Math.min(y, maxY));

            // Animate to snapped position
            const startX = x;
            const startY = y;
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

                // Ease-out cubic
                const easeOut = 1 - Math.pow(1 - progress, 3);

                const currentX = startX + (snappedX - startX) * easeOut;
                const currentY = startY + (clampedY - startY) * easeOut;

                setPosition({ x: currentX, y: currentY });

                if (progress < 1 && isMountedRef.current) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(animate);

            setSnapEdge(edge);
            return { x: snappedX, y: clampedY, edge };
        },
        [edgePadding, preferredEdge]
    );

    // ═══════════════════════════════════════════════════════════════
    // DRAG HANDLERS (Mouse)
    // ═══════════════════════════════════════════════════════════════

    const handleDragStart = useCallback(
        (e) => {
            if (disabled) return;

            e.dataTransfer.setData('text/plain', '');
            e.dataTransfer.effectAllowed = 'move';

            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
            };
            hasMovedRef.current = false;
            lastPositionRef.current = { ...position };

            if (onDragStart) onDragStart(position);
        },
        [disabled, position, onDragStart]
    );

    const handleDrag = useCallback(
        (e) => {
            if (disabled || e.clientX === 0) return; // Ignore invalid events

            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            // Check drag threshold
            if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
                hasMovedRef.current = true;
                setIsDragging(true);
            }

            if (hasMovedRef.current) {
                const newX = position.x + deltaX;
                const newY = position.y + deltaY;
                const maxX = _getMaxX(edgePadding);
                const maxY = _getMaxY(edgePadding);

                setPosition({
                    x: Math.max(edgePadding, Math.min(newX, maxX)),
                    y: Math.max(edgePadding, Math.min(newY, maxY)),
                });
            }
        },
        [disabled, position, edgePadding]
    );

    const handleDragEnd = useCallback(
        (e) => {
            if (disabled) return;

            setIsDragging(false);

            const now = Date.now();
            const timeDelta = now - dragStartRef.current.time;

            // Calculate velocity
            if (timeDelta > 0) {
                velocityRef.current = {
                    x: (e.clientX - dragStartRef.current.x) / timeDelta * 1000,
                    y: (e.clientY - dragStartRef.current.y) / timeDelta * 1000,
                };
            }

            if (snapToEdge && hasMovedRef.current) {
                snapToNearestEdge(position.x, position.y, velocityRef.current.x);
            }

            if (onDragEnd) {
                onDragEnd(position);
            }

            // Handle click vs drag
            if (!hasMovedRef.current && onClick) {
                onClick();
            }
        },
        [disabled, snapToEdge, position, snapToNearestEdge, onDragEnd, onClick]
    );

    // ═══════════════════════════════════════════════════════════════
    // TOUCH HANDLERS
    // ═══════════════════════════════════════════════════════════════

    const handleTouchStart = useCallback(
        (e) => {
            if (disabled) return;

            const touch = e.touches[0];
            dragStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            };
            touchStartTimeRef.current = Date.now();
            hasMovedRef.current = false;
            lastPositionRef.current = { ...position };

            if (onDragStart) onDragStart(position);
        },
        [disabled, position, onDragStart]
    );

    const handleTouchMove = useCallback(
        (e) => {
            if (disabled) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - dragStartRef.current.x;
            const deltaY = touch.clientY - dragStartRef.current.y;

            // Check drag threshold
            if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
                hasMovedRef.current = true;
                setIsDragging(true);
            }

            if (hasMovedRef.current) {
                const maxX = _getMaxX(edgePadding);
                const maxY = _getMaxY(edgePadding);

                setPosition({
                    x: Math.max(edgePadding, Math.min(touch.clientX - HALF_FAB, maxX)),
                    y: Math.max(edgePadding, Math.min(touch.clientY - HALF_FAB, maxY)),
                });
            }
        },
        [disabled, edgePadding]
    );

    const handleTouchEnd = useCallback(
        (e) => {
            if (disabled) return;

            setIsDragging(false);

            const now = Date.now();
            const touchDuration = now - touchStartTimeRef.current;

            // Long press detection
            if (!hasMovedRef.current && touchDuration > 500 && onLongPress) {
                onLongPress();
            }

            // Double tap detection
            if (!hasMovedRef.current && touchDuration < 300) {
                const lastTap = dragStartRef.current._lastTap || 0;
                if (now - lastTap < 300 && onDoubleTap) {
                    onDoubleTap();
                }
                dragStartRef.current._lastTap = now;
            }

            if (snapToEdge && hasMovedRef.current) {
                snapToNearestEdge(position.x, position.y, velocityRef.current.x);
            }

            if (onDragEnd) onDragEnd(position);

            // Click vs drag
            if (!hasMovedRef.current && onClick) {
                onClick();
            }
        },
        [disabled, snapToEdge, position, snapToNearestEdge, onDragEnd, onClick, onLongPress, onDoubleTap]
    );

    // ═══════════════════════════════════════════════════════════════
    // KEYBOARD ACCESSIBILITY
    // ═══════════════════════════════════════════════════════════════

    const handleKeyDown = useCallback(
        (e) => {
            const STEP = 20;
            const maxX = _getMaxX(edgePadding);
            const maxY = _getMaxY(edgePadding);

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setPosition((prev) => ({
                        ...prev,
                        x: Math.max(edgePadding, prev.x - STEP),
                    }));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setPosition((prev) => ({
                        ...prev,
                        x: Math.min(maxX, prev.x + STEP),
                    }));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setPosition((prev) => ({
                        ...prev,
                        y: Math.max(edgePadding, prev.y - STEP),
                    }));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setPosition((prev) => ({
                        ...prev,
                        y: Math.min(maxY, prev.y + STEP),
                    }));
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (onClick) onClick();
                    break;
                default:
                    break;
            }
        },
        [edgePadding, onClick]
    );

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Reset FAB to default position
     */
    const resetPosition = useCallback(() => {
        setPosition(defaultPosition);
        setSnapEdge(null);
    }, [defaultPosition]);

    /**
     * Toggle expanded menu state
     */
    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    /**
     * Get current position relative to viewport
     */
    const getPosition = useCallback(() => {
        return { ...position };
    }, [position]);

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // RETURN API
    // ═══════════════════════════════════════════════════════════════

    return {
        // Position state
        position,
        isDragging,
        isExpanded,
        snapEdge,

        // Mouse handlers
        handleDragStart,
        handleDrag,
        handleDragEnd,

        // Touch handlers
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,

        // Keyboard handler
        handleKeyDown,

        // Public methods
        resetPosition,
        toggleExpanded,
        getPosition,
        snapToNearestEdge,

        // ARIA attributes for accessibility
        ariaAttributes: {
            role: 'button',
            'aria-label': 'Floating action button',
            'aria-draggable': !disabled,
            'aria-expanded': isExpanded,
            tabIndex: 0,
        },

        // Style helpers
        fabStyle: {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${FAB_SIZE}px`,
            height: `${FAB_SIZE}px`,
            zIndex: 1000,
            cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : `left ${ANIMATION_DURATION}ms ease-out, top ${ANIMATION_DURATION}ms ease-out`,
            touchAction: 'none',
            userSelect: 'none',
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get maximum X position within viewport
 */
function _getMaxX(edgePadding) {
    const boundary = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return boundary - FAB_SIZE - edgePadding;
}

/**
 * Get maximum Y position within viewport
 */
function _getMaxY(edgePadding) {
    const boundary = typeof window !== 'undefined' ? window.innerHeight : 768;
    return boundary - FAB_SIZE - edgePadding;
}

/**
 * Check if position is within viewport bounds
 */
function _isWithinBounds(x, y, edgePadding) {
    const maxX = _getMaxX(edgePadding);
    const maxY = _getMaxY(edgePadding);
    return x >= edgePadding && x <= maxX && y >= edgePadding && y <= maxY;
}

export default useDraggableFAB;