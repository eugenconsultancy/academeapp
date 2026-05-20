import { useState, useEffect, useCallback } from 'react';

const DEFAULT_POSITION = { x: 20, y: window.innerHeight - 100 };

export function useDraggableFAB() {
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('fab_position');
        return saved ? JSON.parse(saved) : DEFAULT_POSITION;
    });

    useEffect(() => {
        localStorage.setItem('fab_position', JSON.stringify(position));
    }, [position]);

    const handleDragStart = useCallback((e) => {
        e.dataTransfer.setData('text/plain', '');
    }, []);

    const handleDragEnd = useCallback((e) => {
        const newX = e.clientX - 28; // Half of button width
        const newY = e.clientY - 28;

        // Keep within viewport bounds
        const maxX = window.innerWidth - 56;
        const maxY = window.innerHeight - 56;

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
        });
    }, []);

    // Touch support
    const handleTouchMove = useCallback((e) => {
        const touch = e.touches[0];
        const newX = touch.clientX - 28;
        const newY = touch.clientY - 28;

        const maxX = window.innerWidth - 56;
        const maxY = window.innerHeight - 56;

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
        });
    }, []);

    return {
        position,
        handleDragStart,
        handleDragEnd,
        handleTouchMove,
    };
}