// frontend/src/hooks/useWebSocket.js
/**
 * WebSocket hook for real-time chat communication.
 * 
 * Features:
 * - Waits for a valid, non-expired JWT token before connecting
 * - Automatic reconnection with exponential backoff
 * - Stops reconnecting on auth failure close codes (4001/4003)
 * - Heartbeat ping/pong for connection health
 * - Token-based authentication via URL query parameter
 * - Missed message sync on reconnect
 * - Token refresh handling
 * - Message deduplication
 */

import { useEffect, useRef, useCallback } from 'react';
import useChatStore from '@/stores/useChatStore';
import { TOKEN_REFRESHED_EVENT } from '@/api/client';

const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 25000;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_CONNECT_DELAY = 800; // short delay to let token settle

// Auth failure close codes sent by the backend middleware/consumer
const AUTH_FAILURE_CODES = new Set([4001, 4003]);

/**
 * Quick local check: is the JWT token expired?
 * (Can be replaced by a shared utility from client.js if exported.)
 */
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp ? (payload.exp - 10) <= now : false; // 10s buffer
    } catch {
        return true;
    }
}

const useWebSocket = (conversationId) => {
    const wsRef = useRef(null);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef(null);
    const heartbeatTimer = useRef(null);
    const isManuallyClosed = useRef(false);
    const currentTokenRef = useRef(null);
    const initialConnectTimer = useRef(null);

    const storeRef = useRef(useChatStore.getState());

    useEffect(() => {
        storeRef.current = useChatStore.getState();
    });

    useEffect(() => {
        currentTokenRef.current = localStorage.getItem('access_token');
    });

    const clearTimers = useCallback(() => {
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }
        if (heartbeatTimer.current) {
            clearInterval(heartbeatTimer.current);
            heartbeatTimer.current = null;
        }
        if (initialConnectTimer.current) {
            clearTimeout(initialConnectTimer.current);
            initialConnectTimer.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (isManuallyClosed.current) return;
        if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('Max reconnect attempts reached');
            return;
        }
        const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt.current) + Math.random() * 1000,
            MAX_RECONNECT_DELAY
        );
        reconnectAttempt.current += 1;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current})`);
        reconnectTimer.current = setTimeout(() => {
            connect();
        }, delay);
    }, []);

    const startHeartbeat = useCallback(() => {
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, HEARTBEAT_INTERVAL);
    }, []);

    const getLastMessageTimestamp = useCallback(() => {
        const state = storeRef.current;
        const messages = state.messagesByConversation[conversationId] || [];
        if (messages.length > 0) {
            return messages[messages.length - 1].created_at;
        }
        return null;
    }, [conversationId]);

    // ✅ All store actions now match useChatStore API
    const handleServerEvent = useCallback((data) => {
        const state = storeRef.current;
        const { type } = data;
        switch (type) {
            case 'message.new': {
                const msg = data.message;
                const messages = state.messagesByConversation[conversationId] || [];
                const exists = messages.some(
                    (m) => m.id === msg.id ||
                        (msg.client_msg_id && m.client_msg_id === msg.client_msg_id)
                );
                if (!exists) {
                    state.upsertMessage(conversationId, msg);
                }
                break;
            }
            case 'message.sent': {
                const msg = data.message;
                state.upsertMessage(conversationId, msg);
                break;
            }
            case 'message.status': {
                state.updateMessageStatus(conversationId, data.message_id, data.status);
                break;
            }
            case 'message.deleted': {
                const mode = data.mode || 'everyone';
                state.deleteMessageLocally(conversationId, data.message_id, mode);
                break;
            }
            case 'message.edited': {
                state.markMessageEdited(
                    conversationId, data.message_id, data.content, data.edited_at
                );
                break;
            }
            case 'message.sync': {
                const msgs = data.messages || [];
                if (msgs.length > 0) {
                    state.setMessages(conversationId, msgs, true);  // append older
                }
                break;
            }
            case 'presence': {
                state.updatePresence(data.user_id, {
                    online: data.online,
                    lastSeen: data.last_seen,
                });
                break;
            }
            case 'typing':
            case 'pong':
            case 'error':
                // handled elsewhere
                break;
            default:
                break;
        }
    }, [conversationId]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const token = currentTokenRef.current;
        // Do NOT connect if no token exists, or if the token is expired
        if (!token || isTokenExpired(token)) {
            console.warn('No valid token available – WebSocket connection delayed');
            reconnectTimer.current = setTimeout(() => connect(), 2000);
            return;
        }

        // Build WebSocket URL with fallback
        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            storeRef.current.setOnline(true);
            reconnectAttempt.current = 0;
            startHeartbeat();
            const lastTimestamp = getLastMessageTimestamp();
            if (lastTimestamp) {
                ws.send(JSON.stringify({
                    action: 'message.sync',
                    last_message_at: lastTimestamp,
                }));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerEvent(data);
            } catch (err) {
                console.error('WebSocket parse error:', err);
            }
        };

        ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            storeRef.current.setOnline(false);
            clearTimers();

            // 🔑 If the server explicitly closed the connection due to
            // authentication failure, do NOT reconnect.
            if (AUTH_FAILURE_CODES.has(event.code)) {
                console.warn('Auth failure detected – will not reconnect');
                return;
            }

            if (!event.wasClean && !isManuallyClosed.current) {
                scheduleReconnect();
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [conversationId, clearTimers, scheduleReconnect, startHeartbeat, getLastMessageTimestamp, handleServerEvent]);

    const disconnect = useCallback(() => {
        isManuallyClosed.current = true;
        clearTimers();
        reconnectAttempt.current = 0;
        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }
    }, [clearTimers]);

    // Token refresh event – reconnect with new token
    useEffect(() => {
        const handleTokenRefresh = (event) => {
            const newToken = event.detail?.token;
            if (newToken) {
                currentTokenRef.current = newToken;
                disconnect();
                isManuallyClosed.current = false;
                setTimeout(() => connect(), 500);
            }
        };
        window.addEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefresh);
        return () => window.removeEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefresh);
    }, [connect, disconnect]);

    // Main connect effect – triggered when conversationId changes
    useEffect(() => {
        isManuallyClosed.current = false;
        reconnectAttempt.current = 0;

        // Delayed initial connection to allow token to be written
        initialConnectTimer.current = setTimeout(() => {
            connect();
        }, INITIAL_CONNECT_DELAY);

        return () => {
            isManuallyClosed.current = true;
            clearTimers();
            if (wsRef.current) {
                wsRef.current.close(1000, 'Conversation changed');
                wsRef.current = null;
            }
        };
    }, [conversationId, connect, clearTimers]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            isManuallyClosed.current = true;
            clearTimers();
            wsRef.current?.close(1000, 'Component unmounted');
            wsRef.current = null;
        };
    }, [clearTimers]);

    const sendMessage = useCallback((payload) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'message.send', payload }));
            return true;
        }
        return false;
    }, []);

    const sendTyping = useCallback((typing) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: typing ? 'typing.start' : 'typing.stop',
            }));
        }
    }, []);

    return { sendMessage, sendTyping, disconnect, isConnected: !!wsRef.current };
};

export default useWebSocket;