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

function notifyListeners(notification) {
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
    // Use environment variable for WebSocket URL, fallback to localhost:8000
    const wsUrl = process.env.REACT_APP_WS_URL || 'localhost:8000';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    // If using proxy in development, use current host
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_WS_URL) {
        return `${protocol}://${window.location.host}/ws/notifications/`;
    }

    return `${protocol}://${wsUrl}/ws/notifications/`;
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

    // Close existing connection if in other state
    if (globalSocket && globalSocket.readyState !== WebSocket.CLOSED) {
        console.log('Closing existing notification WebSocket');
        globalSocket.close();
    }

    const url = getWebSocketUrl();
    console.log(`Connecting notification WebSocket to: ${url}`);

    // Try with subprotocol first, fallback to URL parameter
    let ws;
    try {
        ws = new WebSocket(url, ['token', accessToken]);
    } catch (e) {
        ws = new WebSocket(`${url}?token=${encodeURIComponent(accessToken)}`);
    }

    globalSocket = ws;

    ws.onopen = () => {
        console.log('Notification WebSocket connected');
        startHeartbeat(ws);

        // Reset reconnect attempts on successful connection
        if (globalReconnectTimeout) {
            clearTimeout(globalReconnectTimeout);
            globalReconnectTimeout = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Handle pong response
            if (data.type === 'pong') {
                if (pongTimeout) {
                    clearTimeout(pongTimeout);
                    pongTimeout = null;
                }
                return;
            }

            notifyListeners(data);
        } catch (e) {
            console.error('Failed to parse notification', e);
        }
    };

    ws.onclose = (e) => {
        console.log(`Notification WebSocket disconnected with code: ${e.code}`);
        globalSocket = null;
        stopHeartbeat();

        // Don't reconnect if no active listeners
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
                        if (activeListenerCount > 0) connectWebSocket(storageEvent.newValue);
                    }, 1000);
                }
            };
            window.addEventListener('storage', handleTokenChange);
            return;
        }

        if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout);

        // Exponential backoff with jitter
        const attempt = (ws._reconnectAttempt || 0) + 1;
        ws._reconnectAttempt = attempt;
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 35000);

        console.log(`Reconnecting notification socket in ${Math.round(delay)}ms (attempt ${attempt})`);
        globalReconnectTimeout = setTimeout(() => {
            const token = localStorage.getItem('access_token');
            if (token && activeListenerCount > 0) connectWebSocket(token);
        }, delay);
    };

    ws.onerror = (err) => {
        console.error('Notification WebSocket error:', err);
    };
}

function disconnectGlobalSocket() {
    console.log('Disconnecting global notification socket');
    if (globalSocket) {
        stopHeartbeat();
        globalSocket.close();
        globalSocket = null;
    }
    if (globalReconnectTimeout) {
        clearTimeout(globalReconnectTimeout);
        globalReconnectTimeout = null;
    }
}

// Reconnect when tab becomes visible
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
        // Generate unique ID for this listener
        const listenerId = nextListenerId++;
        listenerIdRef.current = listenerId;

        // Create handler that uses ref
        const handler = (notification) => {
            if (onNewNotificationRef.current) {
                onNewNotificationRef.current(notification);
            }
        };

        // Add to map
        listeners.set(listenerId, handler);
        activeListenerCount++;
        console.log(`Notification listener added (total: ${activeListenerCount})`);

        // Connect WebSocket if this is the first listener
        if (activeListenerCount === 1) {
            console.log('First listener, connecting notification WebSocket');
            const token = localStorage.getItem('access_token');
            if (token) {
                connectWebSocket(token);
            }

            // Setup global handlers once
            const removeVisibility = setupVisibilityHandler();
            const removeBeforeUnload = setupBeforeUnloadHandler();
            cleanupHandlersRef.current = [removeVisibility, removeBeforeUnload];
        }

        // Listen for token changes
        const handleStorageChange = (e) => {
            if (e.key === 'access_token' && e.newValue !== e.oldValue) {
                console.log('Token changed, reconnecting notification socket');
                // Close existing connection and reconnect with new token
                if (globalSocket) {
                    const oldSocket = globalSocket;
                    globalSocket = null;
                    oldSocket.close();
                }
                if (e.newValue && activeListenerCount > 0) {
                    connectWebSocket(e.newValue);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Cleanup
        return () => {
            // Remove this listener
            listeners.delete(listenerId);
            activeListenerCount--;
            console.log(`Notification listener removed (total: ${activeListenerCount})`);
            window.removeEventListener('storage', handleStorageChange);

            // If no more listeners, close global socket
            if (activeListenerCount === 0) {
                console.log('No more listeners, disconnecting notification socket');
                disconnectGlobalSocket();

                // Clean up global handlers
                cleanupHandlersRef.current.forEach(cleanup => {
                    if (cleanup && typeof cleanup === 'function') cleanup();
                });
                cleanupHandlersRef.current = [];
                visibilityHandler = null;
                beforeUnloadHandler = null;
            }
        };
    }, []); // Empty dependency array - only run once per component mount

    return {
        disconnect: disconnectGlobalSocket,
        hasListeners: activeListenerCount > 0,
    };
}