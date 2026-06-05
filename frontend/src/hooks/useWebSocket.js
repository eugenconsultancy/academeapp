import { useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';

export const useWebSocket = (conversationId) => {
    const connectWebSocket = useChatStore((s) => s.connectWebSocket);
    const disconnectWebSocket = useChatStore((s) => s.disconnectWebSocket);

    useEffect(() => {
        if (!conversationId) return;
        connectWebSocket(conversationId);
        return () => disconnectWebSocket();
    }, [conversationId, connectWebSocket, disconnectWebSocket]);
};