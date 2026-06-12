// frontend/src/hooks/useNotificationWebSocket.js
import { useEffect, useRef, useCallback } from 'react';

// Module-level singleton to prevent duplicate connections
let globalSocket = null;
let globalReconnectTimeout = null;
const listeners = new Set();

function notifyListeners(notification) {
    listeners.forEach(callback => {
        try {
            callback(notification);
        } catch (e) {
            console.error('Notification listener error:', e);
        }
    });
}

function connectWebSocket(accessToken) {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/ws/notifications/?token=${accessToken}`;

    const ws = new WebSocket(url);
    globalSocket = ws;

    ws.onopen = () => {
        console.log('Notification WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            const notification = JSON.parse(event.data);
            notifyListeners(notification);
        } catch (e) {
            console.error('Failed to parse notification', e);
        }
    };

    ws.onclose = (e) => {
        console.log('Notification WebSocket disconnected, reconnecting...');
        globalSocket = null;

        if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout);

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const attempt = (ws._reconnectAttempt || 0) + 1;
        ws._reconnectAttempt = attempt;
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);

        globalReconnectTimeout = setTimeout(() => {
            const token = localStorage.getItem('access_token');
            if (token) connectWebSocket(token);
        }, delay);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error', err);
        ws.close();
    };
}

export default function useNotificationWebSocket(onNewNotification) {
    const onNewNotificationRef = useRef(onNewNotification);
    onNewNotificationRef.current = onNewNotification;

    const subscribe = useCallback(() => {
        const handler = (notification) => {
            if (onNewNotificationRef.current) {
                onNewNotificationRef.current(notification);
            }
        };
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        // Connect (or reuse existing connection)
        connectWebSocket(accessToken);

        // Register listener
        const unsubscribe = subscribe();

        // Listen for token changes
        const handleStorageChange = (e) => {
            if (e.key === 'access_token' && e.newValue !== e.oldValue) {
                // Close existing connection and reconnect with new token
                if (globalSocket) {
                    globalSocket.close();
                    globalSocket = null;
                }
                if (e.newValue) {
                    connectWebSocket(e.newValue);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            unsubscribe();
            window.removeEventListener('storage', handleStorageChange);
            // Don't close global socket on individual unmount
        };
    }, [subscribe]);

    return {
        disconnect: () => {
            if (globalSocket) {
                globalSocket.close();
                globalSocket = null;
            }
            if (globalReconnectTimeout) {
                clearTimeout(globalReconnectTimeout);
                globalReconnectTimeout = null;
            }
        },
    };
}