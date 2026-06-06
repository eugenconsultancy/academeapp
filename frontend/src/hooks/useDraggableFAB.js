import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_POSITION = { x: 20, y: window.innerHeight - 100 };
const FAB_SIZE = 56;
const HALF_FAB = FAB_SIZE / 2;
const SNAP_THRESHOLD = 0.3;
const DRAG_THRESHOLD = 5;
const EDGE_PADDING = 16;
const ANIMATION_DURATION = 300;

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

    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('fab_position');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (_isWithinBounds(parsed.x, parsed.y, edgePadding)) {
                    return parsed;
                }
            }
        } catch (e) { }
        return defaultPosition;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [snapEdge, setSnapEdge] = useState(null);

    const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const lastPositionRef = useRef(position);
    const touchStartTimeRef = useRef(0);
    const hasMovedRef = useRef(false);
    const animationFrameRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        try { localStorage.setItem('fab_position', JSON.stringify(position)); } catch { }
    }, [position]);

    useEffect(() => {
        const handleResize = () => {
            const maxX = _getMaxX(edgePadding);
            const maxY = _getMaxY(edgePadding);
            setPosition(prev => ({
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

    // ── Mouse handlers (no dataTransfer) ──────────────────
    const handleDragStart = useCallback(
        (e) => {
            if (disabled) return;
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
            if (disabled || e.clientX === 0) return;
            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;
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
            if (timeDelta > 0) {
                velocityRef.current = {
                    x: (e.clientX - dragStartRef.current.x) / timeDelta * 1000,
                    y: (e.clientY - dragStartRef.current.y) / timeDelta * 1000,
                };
            }
            if (snapToEdge && hasMovedRef.current) {
                snapToNearestEdge(position.x, position.y, velocityRef.current.x);
            }
            if (onDragEnd) onDragEnd(position);
            if (!hasMovedRef.current && onClick) onClick();
        },
        [disabled, snapToEdge, position, snapToNearestEdge, onDragEnd, onClick]
    );

    // ── Touch handlers ────────────────────────────────────
    const handleTouchStart = useCallback(
        (e) => {
            if (disabled) return;
            const touch = e.touches[0];
            dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
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
            if (!hasMovedRef.current && touchDuration > 500 && onLongPress) onLongPress();
            if (!hasMovedRef.current && touchDuration < 300) {
                const lastTap = dragStartRef.current._lastTap || 0;
                if (now - lastTap < 300 && onDoubleTap) onDoubleTap();
                dragStartRef.current._lastTap = now;
            }
            if (snapToEdge && hasMovedRef.current) {
                snapToNearestEdge(position.x, position.y, velocityRef.current.x);
            }
            if (onDragEnd) onDragEnd(position);
            if (!hasMovedRef.current && onClick) onClick();
        },
        [disabled, snapToEdge, position, snapToNearestEdge, onDragEnd, onClick, onLongPress, onDoubleTap]
    );

    const handleKeyDown = useCallback(
        (e) => {
            const STEP = 20;
            const maxX = _getMaxX(edgePadding);
            const maxY = _getMaxY(edgePadding);
            switch (e.key) {
                case 'ArrowLeft': e.preventDefault(); setPosition(p => ({ ...p, x: Math.max(edgePadding, p.x - STEP) })); break;
                case 'ArrowRight': e.preventDefault(); setPosition(p => ({ ...p, x: Math.min(maxX, p.x + STEP) })); break;
                case 'ArrowUp': e.preventDefault(); setPosition(p => ({ ...p, y: Math.max(edgePadding, p.y - STEP) })); break;
                case 'ArrowDown': e.preventDefault(); setPosition(p => ({ ...p, y: Math.min(maxY, p.y + STEP) })); break;
                case 'Enter': case ' ': e.preventDefault(); if (onClick) onClick(); break;
            }
        },
        [edgePadding, onClick]
    );

    const resetPosition = useCallback(() => { setPosition(defaultPosition); setSnapEdge(null); }, [defaultPosition]);
    const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);
    const getPosition = useCallback(() => ({ ...position }), [position]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, []);

    return {
        position, isDragging, isExpanded, snapEdge,
        handleDragStart, handleDrag, handleDragEnd,
        handleTouchStart, handleTouchMove, handleTouchEnd,
        handleKeyDown,
        resetPosition, toggleExpanded, getPosition, snapToNearestEdge,
        ariaAttributes: {
            role: 'button', 'aria-label': 'Floating action button', 'aria-draggable': !disabled,
            'aria-expanded': isExpanded, tabIndex: 0,
        },
        fabStyle: {
            position: 'fixed', left: `${position.x}px`, top: `${position.y}px`,
            width: `${FAB_SIZE}px`, height: `${FAB_SIZE}px`, zIndex: 1000,
            cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : `left ${ANIMATION_DURATION}ms ease-out, top ${ANIMATION_DURATION}ms ease-out`,
            touchAction: 'none', userSelect: 'none',
        },
    };
}

function _getMaxX(padding) { return (typeof window !== 'undefined' ? window.innerWidth : 1024) - FAB_SIZE - padding; }
function _getMaxY(padding) { return (typeof window !== 'undefined' ? window.innerHeight : 768) - FAB_SIZE - padding; }
function _isWithinBounds(x, y, padding) { return x >= padding && x <= _getMaxX(padding) && y >= padding && y <= _getMaxY(padding); }

export default useDraggableFAB;