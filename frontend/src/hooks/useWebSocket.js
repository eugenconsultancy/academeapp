// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import useChatStore from '../stores/useChatStore';
import { TOKEN_REFRESHED_EVENT } from '../api/client';

export const useWebSocket = (conversationId) => {
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const pingIntervalRef = useRef(null);
    const pongTimeoutRef = useRef(null);
    const conversationIdRef = useRef(conversationId);
    const shouldReconnectRef = useRef(true);
    const currentTokenRef = useRef(null);
    const isConnectingRef = useRef(false);
    const isUnmountedRef = useRef(false);
    const visibilityListenerRef = useRef(null);

    const setSocket = useChatStore((s) => s.setSocket);
    const disconnectSocket = useChatStore((s) => s.disconnectSocket);
    const userId = useChatStore((s) => s.userId);
    const flushQueue = useChatStore((s) => s.flushQueue);

    // Update ref when conversationId changes
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    // Handle tab visibility changes (reconnect when tab becomes visible)
    useEffect(() => {
        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            const isSocketClosed = !socketRef.current || socketRef.current.readyState === WebSocket.CLOSED;

            if (isVisible && isSocketClosed && shouldReconnectRef.current && !isConnectingRef.current) {
                console.log('👁️ Tab became visible, reconnecting WebSocket...');
                connect();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        visibilityListenerRef.current = handleVisibilityChange;

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Listen for token changes - use refs to avoid re-renders
    useEffect(() => {
        const handleTokenChange = () => {
            console.log('🔄 Token changed, reconnecting WebSocket...');
            if (socketRef.current) {
                // Prevent reconnect from the old socket
                socketRef.current.onclose = null;
                socketRef.current.close();
                socketRef.current = null;
            }
            // Clear any pending reconnect
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            // Reset reconnect attempts on token change
            reconnectAttemptRef.current = 0;
            // Trigger reconnect with delay
            setTimeout(() => connect(), 500);
        };

        window.addEventListener('storage', handleTokenChange);
        window.addEventListener(TOKEN_REFRESHED_EVENT, handleTokenChange);

        return () => {
            window.removeEventListener('storage', handleTokenChange);
            window.removeEventListener(TOKEN_REFRESHED_EVENT, handleTokenChange);
        };
    }, []);

    const getAuthToken = useCallback(() => {
        const token = localStorage.getItem('access_token');
        if (token && token !== currentTokenRef.current) {
            currentTokenRef.current = token;
        }
        return token;
    }, []);

    const getWebSocketUrl = useCallback((convId, token) => {
        const isNgrok = window.location.hostname.includes('ngrok') ||
            import.meta.env.VITE_WS_URL?.includes('ngrok');

        let wsHost, protocol;
        if (isNgrok) {
            wsHost = import.meta.env.VITE_WS_URL || window.location.host;
            protocol = 'wss';
        } else if (import.meta.env.VITE_WS_URL && import.meta.env.VITE_WS_URL !== 'localhost:8000') {
            wsHost = import.meta.env.VITE_WS_URL;
            protocol = 'wss';
        } else {
            wsHost = 'localhost:8000';
            protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        }

        return `${protocol}://${wsHost}/ws/chat/${convId}/?token=${encodeURIComponent(token)}`;
    }, []);

    const startHeartbeat = useCallback((ws) => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);

        pingIntervalRef.current = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
                pongTimeoutRef.current = setTimeout(() => {
                    console.warn('No pong received, closing WebSocket');
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                }, 10000);
            }
        }, 30000);
    }, []);

    const stopHeartbeat = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        // Don't connect if component is unmounted
        if (isUnmountedRef.current) {
            console.log('⏳ Component unmounted, skipping connection');
            return;
        }

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('⏳ Connection already in progress, skipping...');
            return;
        }

        const currentConvId = conversationIdRef.current;
        const token = getAuthToken();

        if (!currentConvId || !userId || currentConvId === 'undefined' || !token) {
            console.warn('❌ Cannot connect: missing required data', {
                hasConvId: !!currentConvId,
                hasUserId: !!userId,
                hasToken: !!token,
                convId: currentConvId
            });
            return;
        }

        // Close existing connection cleanly
        if (socketRef.current) {
            stopHeartbeat();
            // Remove onclose handler to prevent reconnect trigger
            socketRef.current.onclose = null;
            socketRef.current.close();
            socketRef.current = null;
        }

        const url = getWebSocketUrl(currentConvId, token);
        console.log(`🔌 Connecting WebSocket to: ${url.replace(token, '***HIDDEN***')}`);

        isConnectingRef.current = true;

        try {
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('✅ WebSocket connected successfully');
                isConnectingRef.current = false;
                reconnectAttemptRef.current = 0; // Reset on successful connection
                setSocket(ws);
                startHeartbeat(ws);

                // Get fresh queue snapshot directly from store
                const queue = useChatStore.getState().queuedMessages[currentConvId];
                if (queue?.length > 0) {
                    console.log(`📤 Flushing ${queue.length} queued messages`);
                    flushQueue(currentConvId);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle pong response
                    if (data.type === 'pong') {
                        if (pongTimeoutRef.current) {
                            clearTimeout(pongTimeoutRef.current);
                            pongTimeoutRef.current = null;
                        }
                        return;
                    }

                    // Dispatch custom event for store handlers
                    const eventBus = new CustomEvent('websocket_message', { detail: data });
                    window.dispatchEvent(eventBus);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onclose = (e) => {
                console.log(`❌ WebSocket closed: Code ${e.code}, Reason: ${e.reason || 'No reason'}`);
                isConnectingRef.current = false;
                stopHeartbeat();
                setSocket(null);

                // Don't trigger reconnect from this socket instance
                if (socketRef.current === ws) {
                    socketRef.current = null;
                }

                // Don't reconnect if component is unmounted or intentionally disconnected
                if (!shouldReconnectRef.current || isUnmountedRef.current) {
                    console.log('Manual disconnect or unmounted, not reconnecting');
                    return;
                }

                // Terminal codes - don't reconnect
                const terminalCodes = [4001, 4002, 4003, 4004];
                if (terminalCodes.includes(e.code)) {
                    console.log(`Connection rejected with terminal code ${e.code}, not reconnecting`);
                    return;
                }

                // Clear any existing reconnect timeout
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }

                // Exponential backoff with jitter - increased max delay to 60s
                const attempt = reconnectAttemptRef.current + 1;
                reconnectAttemptRef.current = attempt;
                const baseDelay = Math.min(2000 * Math.pow(2, attempt - 1), 60000);
                const jitter = Math.random() * 2000;
                const delay = Math.min(baseDelay + jitter, 65000);

                console.log(`🔄 Reconnecting in ${Math.round(delay)}ms (attempt ${attempt})`);
                reconnectTimeoutRef.current = setTimeout(() => {
                    // Check again before reconnecting
                    if (shouldReconnectRef.current && !isUnmountedRef.current) {
                        connect();
                    }
                }, delay);
            };

            ws.onerror = (err) => {
                console.error('⚠️ WebSocket error:', err);
                // onclose will fire after onerror
            };
        } catch (err) {
            console.error('💥 Failed to create WebSocket connection:', err);
            isConnectingRef.current = false;

            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            const attempt = reconnectAttemptRef.current + 1;
            reconnectAttemptRef.current = attempt;
            const baseDelay = Math.min(2000 * Math.pow(2, attempt - 1), 60000);
            const jitter = Math.random() * 2000;
            const delay = Math.min(baseDelay + jitter, 65000);
            reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
    }, [userId, setSocket, startHeartbeat, stopHeartbeat, getAuthToken, flushQueue, getWebSocketUrl]);

    const disconnect = useCallback(() => {
        console.log('🔌 Manually disconnecting WebSocket');
        shouldReconnectRef.current = false;
        isConnectingRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (socketRef.current) {
            // Prevent onclose from triggering reconnect
            socketRef.current.onclose = null;
            stopHeartbeat();
            socketRef.current.close();
            socketRef.current = null;
        }
        disconnectSocket();
    }, [disconnectSocket, stopHeartbeat]);

    // Initial connection
    useEffect(() => {
        shouldReconnectRef.current = true;
        isConnectingRef.current = false;
        isUnmountedRef.current = false;

        // Small delay to ensure store is ready
        const timer = setTimeout(() => connect(), 100);

        return () => {
            isUnmountedRef.current = true;
            shouldReconnectRef.current = false;
            clearTimeout(timer);

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (socketRef.current) {
                socketRef.current.onclose = null;
                stopHeartbeat();
                socketRef.current.close();
                socketRef.current = null;
            }
            disconnectSocket();
        };
    }, [connect, disconnectSocket, stopHeartbeat]);

    // Log connection state for debugging
    useEffect(() => {
        const interval = setInterval(() => {
            if (socketRef.current) {
                console.log(`📊 WebSocket state: ${socketRef.current.readyState} - ${socketRef.current.readyState === WebSocket.OPEN ? 'OPEN' : socketRef.current.readyState === WebSocket.CONNECTING ? 'CONNECTING' : socketRef.current.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'}`);
            }
        }, 60000); // Log every minute

        return () => clearInterval(interval);
    }, []);

    return {
        reconnect: connect,
        disconnect,
        isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    };
};