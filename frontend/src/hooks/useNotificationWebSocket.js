// frontend/src/hooks/useNotificationWebSocket.js
import { useEffect, useRef, useCallback } from 'react';

// Module-level singleton with proper cleanup tracking
let globalSocket = null;
let globalReconnectTimeout = null;
let pingInterval = null;
let pongTimeout = null;
let activeListenerCount = 0;
const listeners = new Map();
let nextListenerId = 0;

// Deduplication cache for notification IDs
const seenNotificationIds = new Set();

function notifyListeners(notification) {
    if (notification && notification.id && seenNotificationIds.has(notification.id)) {
        console.log(`Deduplicating notification ${notification.id}`);
        return;
    }

    if (notification && notification.id) {
        seenNotificationIds.add(notification.id);
        setTimeout(() => seenNotificationIds.delete(notification.id), 5000);
    }

    listeners.forEach((callback, id) => {
        try {
            callback(notification);
        } catch (e) {
            console.error(`Notification listener ${id} error:`, e);
        }
    });
}

function stopHeartbeat() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
    }
}

function startHeartbeat(ws) {
    stopHeartbeat();

    pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));

            pongTimeout = setTimeout(() => {
                console.warn('No pong received for notification socket, closing');
                ws.close();
            }, 10000);
        }
    }, 30000);
}

function getWebSocketUrl() {
    // Build WebSocket URL using environment variable or fallback
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    return `${wsBase}/ws/notifications/`;
}

function connectWebSocket(accessToken) {
    if (!accessToken) {
        console.warn('No access token provided for notification WebSocket');
        return;
    }

    // Don't create duplicate open connections
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
        console.log('Notification WebSocket already connected');
        return;
    }

    // Clean up existing socket properly before creating new one
    if (globalSocket) {
        globalSocket.onclose = null;
        globalSocket.close();
        globalSocket = null;
    }

    // ✅ ALWAYS send token as query parameter (not subprotocol)
    const url = `${getWebSocketUrl()}?token=${encodeURIComponent(accessToken)}`;
    console.log(`Connecting notification WebSocket to: ${url}`);

    const ws = new WebSocket(url);
    globalSocket = ws;

    ws.onopen = () => {
        console.log('Notification WebSocket connected');
        startHeartbeat(ws);

        if (globalReconnectTimeout) {
            clearTimeout(globalReconnectTimeout);
            globalReconnectTimeout = null;
        }

        seenNotificationIds.clear();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'pong') {
                if (pongTimeout) {
                    clearTimeout(pongTimeout);
                    pongTimeout = null;
                }
                return;
            }

            notifyListeners(data);

            const eventBus = new CustomEvent('websocket_message', { detail: data });
            window.dispatchEvent(eventBus);
        } catch (e) {
            console.error('Failed to parse notification', e);
        }
    };

    ws.onclose = (e) => {
        console.log(`Notification WebSocket disconnected with code: ${e.code}`);
        globalSocket = null;
        stopHeartbeat();

        if (activeListenerCount === 0) {
            console.log('No active listeners, not reconnecting');
            return;
        }

        // Auth error - wait for token refresh
        if (e.code === 4002) {
            console.warn('Notification auth error, waiting for token refresh...');
            const handleTokenChange = (storageEvent) => {
                if (storageEvent.key === 'access_token' && storageEvent.newValue) {
                    console.log('Token refreshed, reconnecting notification socket...');
                    window.removeEventListener('storage', handleTokenChange);
                    setTimeout(() => {
                        if (activeListenerCount > 0) {
                            const freshToken = localStorage.getItem('access_token');
                            if (freshToken) connectWebSocket(freshToken);
                        }
                    }, 1000);
                }
            };
            window.addEventListener('storage', handleTokenChange);
            return;
        }

        if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout);

        const attempt = (ws._reconnectAttempt || 0) + 1;
        ws._reconnectAttempt = attempt;
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 35000);

        console.log(`Reconnecting notification socket in ${Math.round(delay)}ms (attempt ${attempt})`);
        globalReconnectTimeout = setTimeout(() => {
            const freshToken = localStorage.getItem('access_token');
            if (freshToken && activeListenerCount > 0) connectWebSocket(freshToken);
        }, delay);
    };

    ws.onerror = (err) => {
        console.error('Notification WebSocket error:', err);
    };
}

function disconnectGlobalSocket() {
    console.log('Disconnecting global notification socket');
    if (globalSocket) {
        globalSocket.onclose = null;
        stopHeartbeat();
        globalSocket.close();
        globalSocket = null;
    }
    if (globalReconnectTimeout) {
        clearTimeout(globalReconnectTimeout);
        globalReconnectTimeout = null;
    }
    seenNotificationIds.clear();
}

let visibilityHandler = null;
let beforeUnloadHandler = null;

function setupVisibilityHandler() {
    if (visibilityHandler) return visibilityHandler;

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && activeListenerCount > 0) {
            const token = localStorage.getItem('access_token');
            if (token && (!globalSocket || globalSocket.readyState !== WebSocket.OPEN)) {
                console.log('Tab became visible, reconnecting notification socket');
                connectWebSocket(token);
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityHandler = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    return visibilityHandler;
}

function setupBeforeUnloadHandler() {
    if (beforeUnloadHandler) return beforeUnloadHandler;

    const handleBeforeUnload = () => {
        if (globalSocket) {
            globalSocket.close();
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    beforeUnloadHandler = () => window.removeEventListener('beforeunload', handleBeforeUnload);
    return beforeUnloadHandler;
}

export default function useNotificationWebSocket(onNewNotification) {
    const onNewNotificationRef = useRef(onNewNotification);
    const listenerIdRef = useRef(null);
    const cleanupHandlersRef = useRef([]);

    onNewNotificationRef.current = onNewNotification;

    useEffect(() => {
        const listenerId = nextListenerId++;
        listenerIdRef.current = listenerId;

        const handler = (notification) => {
            if (onNewNotificationRef.current) {
                onNewNotificationRef.current(notification);
            }
        };

        listeners.set(listenerId, handler);
        activeListenerCount++;
        console.log(`Notification listener added (total: ${activeListenerCount})`);

        if (activeListenerCount === 1) {
            console.log('First listener, connecting notification WebSocket');
            const token = localStorage.getItem('access_token');
            if (token) {
                connectWebSocket(token);
            }

            const removeVisibility = setupVisibilityHandler();
            const removeBeforeUnload = setupBeforeUnloadHandler();
            cleanupHandlersRef.current = [removeVisibility, removeBeforeUnload];
        }

        const handleStorageChange = (e) => {
            if (e.key === 'access_token' && e.newValue !== e.oldValue) {
                console.log('Token changed, reconnecting notification socket');
                if (globalSocket) {
                    const oldSocket = globalSocket;
                    globalSocket = null;
                    oldSocket.onclose = null;
                    oldSocket.close();
                }
                if (e.newValue && activeListenerCount > 0) {
                    connectWebSocket(e.newValue);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            listeners.delete(listenerId);
            activeListenerCount--;
            console.log(`Notification listener removed (total: ${activeListenerCount})`);
            window.removeEventListener('storage', handleStorageChange);

            if (activeListenerCount === 0) {
                console.log('No more listeners, disconnecting notification socket');
                disconnectGlobalSocket();

                cleanupHandlersRef.current.forEach(cleanup => {
                    if (cleanup && typeof cleanup === 'function') cleanup();
                });
                cleanupHandlersRef.current = [];
                visibilityHandler = null;
                beforeUnloadHandler = null;
            }
        };
    }, []);

    return {
        disconnect: disconnectGlobalSocket,
        hasListeners: activeListenerCount > 0,
    };
}