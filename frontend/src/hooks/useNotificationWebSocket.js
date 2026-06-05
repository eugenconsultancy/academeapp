import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function useNotificationWebSocket(onNewNotification) {
    const { user } = useAuth();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const onNewNotificationRef = useRef(onNewNotification);
    onNewNotificationRef.current = onNewNotification;

    const connect = useCallback(() => {
        if (!user || !user.access_token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        const url = `${protocol}://${host}/ws/notifications/?token=${user.access_token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Notification WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const notification = JSON.parse(event.data);
                if (onNewNotificationRef.current) {
                    onNewNotificationRef.current(notification);
                }
            } catch (e) {
                console.error('Failed to parse notification', e);
            }
        };

        ws.onclose = (e) => {
            console.log('Notification WebSocket disconnected, attempting reconnect...');
            wsRef.current = null;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
                if (user) connect();
            }, 5000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error', err);
            ws.close();
        };
    }, [user]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    return {
        disconnect: () => {
            if (wsRef.current) wsRef.current.close();
        },
    };
}