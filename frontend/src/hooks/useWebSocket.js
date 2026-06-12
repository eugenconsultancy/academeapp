// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import useChatStore from '../stores/useChatStore';

export const useWebSocket = (conversationId) => {
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const pingIntervalRef = useRef(null);
    const conversationIdRef = useRef(conversationId);
    const shouldReconnectRef = useRef(true);

    const setSocket = useChatStore((s) => s.setSocket);
    const disconnectSocket = useChatStore((s) => s.disconnectSocket);
    const userId = useChatStore((s) => s.userId);
    const flushQueue = useChatStore((s) => s.flushQueue);
    const queuedMessages = useChatStore((s) => s.queuedMessages);

    // Update ref when conversationId changes
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    const getAuthToken = useCallback(() => {
        return localStorage.getItem('access_token');
    }, []);

    const getWebSocketUrl = useCallback((convId, token) => {
        // Use environment variable for WebSocket URL
        const wsHost = import.meta.env.VITE_WS_URL || window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

        // Build URL with token in query string (most reliable method)
        return `${protocol}://${wsHost}/ws/chat/${convId}/?token=${encodeURIComponent(token)}`;
    }, []);

    const startHeartbeat = useCallback((ws) => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }, []);

    const stopHeartbeat = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        const currentConvId = conversationIdRef.current;
        const token = getAuthToken();

        if (!currentConvId || !userId || currentConvId === 'undefined' || !token) {
            console.warn('Cannot connect: missing conversationId, userId, or token');
            return;
        }

        // Close existing connection
        if (socketRef.current) {
            stopHeartbeat();
            socketRef.current.close();
            socketRef.current = null;
        }

        const url = getWebSocketUrl(currentConvId, token);
        console.log(`Connecting WebSocket to: ${url}`);

        try {
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('✅ WebSocket connected successfully');
                reconnectAttemptRef.current = 0;
                setSocket(ws);
                startHeartbeat(ws);

                // Flush any queued messages
                const queue = queuedMessages[currentConvId];
                if (queue && queue.length > 0) {
                    console.log(`Flushing ${queue.length} queued messages`);
                    flushQueue(currentConvId);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle pong response
                    if (data.type === 'pong') {
                        return;
                    }

                    // Dispatch to component handlers
                    const eventBus = new CustomEvent('websocket_message', { detail: data });
                    window.dispatchEvent(eventBus);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onclose = (e) => {
                console.log(`WebSocket closed: Code ${e.code}, Reason: ${e.reason || 'No reason'}`);
                stopHeartbeat();
                setSocket(null);
                socketRef.current = null;

                if (!shouldReconnectRef.current) {
                    console.log('Manual disconnect, not reconnecting');
                    return;
                }

                // Don't reconnect for certain codes
                if (e.code === 4001 || e.code === 4002 || e.code === 4003 || e.code === 4004) {
                    console.log('Connection rejected by server, not reconnecting');
                    return;
                }

                // Exponential backoff with jitter
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }

                const attempt = reconnectAttemptRef.current + 1;
                reconnectAttemptRef.current = attempt;
                const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                const jitter = Math.random() * 1000;
                const delay = Math.min(baseDelay + jitter, 35000);

                console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${attempt})`);
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
        } catch (err) {
            console.error('Failed to create WebSocket connection:', err);

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            const attempt = reconnectAttemptRef.current + 1;
            reconnectAttemptRef.current = attempt;
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        }
    }, [userId, setSocket, startHeartbeat, stopHeartbeat, getAuthToken, flushQueue, queuedMessages, getWebSocketUrl]);

    const disconnect = useCallback(() => {
        console.log('Manually disconnecting WebSocket');
        shouldReconnectRef.current = false;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (socketRef.current) {
            stopHeartbeat();
            socketRef.current.close();
            socketRef.current = null;
        }
        disconnectSocket();
    }, [disconnectSocket, stopHeartbeat]);

    // Initial connection
    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (socketRef.current) {
                stopHeartbeat();
                socketRef.current.close();
                socketRef.current = null;
            }
            disconnectSocket();
        };
    }, [connect, disconnectSocket, stopHeartbeat]);

    return {
        reconnect: connect,
        disconnect,
        isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    };
};