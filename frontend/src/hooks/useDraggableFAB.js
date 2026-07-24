// frontend/src/hooks/useDraggableFAB.js
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const FAB_SIZE = 56;
const DRAG_THRESHOLD = 5;
const EDGE_PADDING = 16;
const ANIMATION_DURATION = 300;
const SNAP_THRESHOLD = 0.3;

const DEFAULT_POSITION = {
    x: (typeof window !== 'undefined' ? window.innerWidth : 1024) - FAB_SIZE - EDGE_PADDING,
    y: (typeof window !== 'undefined' ? window.innerHeight : 768) - FAB_SIZE - EDGE_PADDING,
};

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
    } = options;

    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('fab_position');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (
                    parsed.x >= edgePadding &&
                    parsed.x <= _getMaxX(edgePadding) &&
                    parsed.y >= edgePadding &&
                    parsed.y <= _getMaxY(edgePadding)
                ) {
                    return parsed;
                }
            }
        } catch { /* ignore */ }
        return defaultPosition;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [snapEdge, setSnapEdge] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const positionRef = useRef(position);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
    const hasMovedRef = useRef(false);
    const velocityRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(null);
    const isMountedRef = useRef(true);
    // Holds the actual move/end handlers so we can remove them later
    const moveHandlerRef = useRef(null);
    const endHandlerRef = useRef(null);

    // Keep refs in sync
    useEffect(() => { positionRef.current = position; }, [position]);
    useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

    // Persist position to localStorage
    useEffect(() => {
        try { localStorage.setItem('fab_position', JSON.stringify(position)); } catch { /* ignore */ }
    }, [position]);

    // Re‑clamp on window resize / orientation change
    useEffect(() => {
        const handleResize = () => {
            if (!isMountedRef.current) return;
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

    // ── Snap animation ─────────────────────────────────────────────────
    const snapToNearestEdge = useCallback(
        (x, y, velocityX = 0) => {
            const maxX = _getMaxX(edgePadding);
            const centerX = maxX / 2;
            const maxY = _getMaxY(edgePadding);
            let snappedX, edge;

            if (preferredEdge) {
                edge = preferredEdge;
                snappedX = preferredEdge === 'left' ? edgePadding : maxX;
            } else if (Math.abs(velocityX) > SNAP_THRESHOLD * 100) {
                edge = velocityX < 0 ? 'left' : 'right';
                snappedX = velocityX < 0 ? edgePadding : maxX;
            } else {
                edge = x < centerX ? 'left' : 'right';
                snappedX = x < centerX ? edgePadding : maxX;
            }

            const clampedY = Math.max(edgePadding, Math.min(y, maxY));
            const startX = x;
            const startY = y;
            const startTime = performance.now();

            const animate = (currentTime) => {
                if (!isMountedRef.current) return;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentX = startX + (snappedX - startX) * easeOut;
                const currentY = startY + (clampedY - startY) * easeOut;
                setPosition({ x: currentX, y: currentY });
                if (progress < 1 && isMountedRef.current) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = requestAnimationFrame(animate);
            setSnapEdge(edge);
            return { x: snappedX, y: clampedY, edge };
        },
        [edgePadding, preferredEdge]
    );

    // ── Internal drag logic ───────────────────────────────────────────
    const handleDragMove = useCallback(
        (clientX, clientY) => {
            // Block dragging when keyboard or mobile sidebar is open
            if (
                document.body.classList.contains('keyboard-open') ||
                document.body.classList.contains('mobile-sidebar-open')
            ) {
                return;
            }
            if (disabled) return;

            const deltaX = clientX - dragStartRef.current.x;
            const deltaY = clientY - dragStartRef.current.y;

            if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
                hasMovedRef.current = true;
                setIsDragging(true);
            }

            if (hasMovedRef.current) {
                const newX = positionRef.current.x + deltaX;
                const newY = positionRef.current.y + deltaY;
                const maxX = _getMaxX(edgePadding);
                const maxY = _getMaxY(edgePadding);
                setPosition({
                    x: Math.max(edgePadding, Math.min(newX, maxX)),
                    y: Math.max(edgePadding, Math.min(newY, maxY)),
                });
            }
        },
        [disabled, edgePadding]
    );

    const handleDragEndInternal = useCallback(
        (clientX, clientY) => {
            if (disabled) return;
            setIsDragging(false);

            const now = Date.now();
            const timeDelta = now - dragStartRef.current.time;
            if (timeDelta > 0) {
                velocityRef.current = {
                    x: ((clientX - dragStartRef.current.x) / timeDelta) * 1000,
                    y: ((clientY - dragStartRef.current.y) / timeDelta) * 1000,
                };
            }

            if (snapToEdge && hasMovedRef.current) {
                snapToNearestEdge(
                    positionRef.current.x,
                    positionRef.current.y,
                    velocityRef.current.x
                );
            }

            if (onDragEnd) onDragEnd(positionRef.current);

            // Only fire onClick if no drag occurred (i.e. a simple tap)
            if (!hasMovedRef.current && onClick) {
                onClick();
            }

            dragStartRef.current = { x: 0, y: 0, time: 0 };
            hasMovedRef.current = false;
        },
        [disabled, snapToEdge, snapToNearestEdge, onDragEnd, onClick]
    );

    // ── Pointer‑down handlers (attach move/end listeners immediately) ─
    const handleDragStart = useCallback(
        (e) => {
            if (disabled) return;
            e.preventDefault();
            const clientX = e.clientX;
            const clientY = e.clientY;
            dragStartRef.current = { x: clientX, y: clientY, time: Date.now() };
            hasMovedRef.current = false;
            if (onDragStart) onDragStart(positionRef.current);

            // Remove any previously registered listeners (shouldn't exist, but safe)
            removeListeners();

            const onMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
            const onMouseUp = (e) => {
                handleDragEndInternal(e.clientX, e.clientY);
                removeListeners();
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            moveHandlerRef.current = onMouseMove;
            endHandlerRef.current = onMouseUp;
        },
        [disabled, onDragStart, handleDragMove, handleDragEndInternal]
    );

    const handleTouchStart = useCallback(
        (e) => {
            if (disabled) return;
            const touch = e.touches[0];
            if (!touch) return;
            e.preventDefault();
            dragStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            };
            hasMovedRef.current = false;
            if (onDragStart) onDragStart(positionRef.current);

            removeListeners();

            const onTouchMove = (e) => {
                const touch = e.touches[0];
                if (touch) handleDragMove(touch.clientX, touch.clientY);
            };
            const onTouchEnd = (e) => {
                const touch = e.changedTouches[0];
                handleDragEndInternal(touch.clientX, touch.clientY);
                removeListeners();
            };

            window.addEventListener('touchmove', onTouchMove, { passive: true });
            window.addEventListener('touchend', onTouchEnd);
            moveHandlerRef.current = onTouchMove;
            endHandlerRef.current = onTouchEnd;
        },
        [disabled, onDragStart, handleDragMove, handleDragEndInternal]
    );

    // Helper to remove any active listeners
    const removeListeners = useCallback(() => {
        if (moveHandlerRef.current) {
            window.removeEventListener('mousemove', moveHandlerRef.current);
            window.removeEventListener('touchmove', moveHandlerRef.current);
            moveHandlerRef.current = null;
        }
        if (endHandlerRef.current) {
            window.removeEventListener('mouseup', endHandlerRef.current);
            window.removeEventListener('touchend', endHandlerRef.current);
            endHandlerRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            removeListeners();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [removeListeners]);

    // ── Keyboard navigation ──────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e) => {
            const STEP = 20;
            const maxX = _getMaxX(edgePadding);
            const maxY = _getMaxY(edgePadding);
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setPosition((p) => ({ ...p, x: Math.max(edgePadding, p.x - STEP) }));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setPosition((p) => ({ ...p, x: Math.min(maxX, p.x + STEP) }));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setPosition((p) => ({ ...p, y: Math.max(edgePadding, p.y - STEP) }));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setPosition((p) => ({ ...p, y: Math.min(maxY, p.y + STEP) }));
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

    const resetPosition = useCallback(() => {
        setPosition(defaultPosition);
        setSnapEdge(null);
    }, [defaultPosition]);

    const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);
    const getPosition = useCallback(() => ({ ...positionRef.current }), []);

    // ── Returned API ──────────────────────────────────────────────────
    return {
        position,
        isDragging,
        isExpanded,
        snapEdge,
        handleDragStart,
        handleTouchStart,
        handleKeyDown,
        resetPosition,
        toggleExpanded,
        getPosition,
        snapToNearestEdge,
        fabStyle: {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${FAB_SIZE}px`,
            height: `${FAB_SIZE}px`,
            zIndex: 1000,
            cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
            transition: isDragging
                ? 'none'
                : `left ${ANIMATION_DURATION}ms ease-out, top ${ANIMATION_DURATION}ms ease-out`,
            touchAction: 'none',
            userSelect: 'none',
        },
    };
}

// ── Helpers ──────────────────────────────────────────────────────────
function _getMaxX(padding) {
    return (typeof window !== 'undefined' ? window.innerWidth : 1024) - FAB_SIZE - padding;
}
function _getMaxY(padding) {
    return (typeof window !== 'undefined' ? window.innerHeight : 768) - FAB_SIZE - padding;
}

export default useDraggableFAB;