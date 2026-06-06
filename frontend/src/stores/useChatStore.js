import { create } from 'zustand';
import { produce } from 'immer';
import { chatApi } from '../api/chatApi';

export const useChatStore = create((set, get) => ({
    conversations: [],
    messages: {},
    cursors: {},
    activeConversation: null,
    socket: null,
    isConnected: false,
    reconnectAttempts: 0,
    user: null,

    setUser: (user) => set({ user }),
    setConversations: (convs) => set({ conversations: convs }),
    setActiveConversation: (conv) => set({ activeConversation: conv }),

    addMessage: (conversationId, message) =>
        set(produce((state) => {
            if (!state.messages[conversationId]) state.messages[conversationId] = [];
            state.messages[conversationId].push(message);
        })),

    updateMessageStatus: (conversationId, tempId, updates) =>
        set(produce((state) => {
            const msgs = state.messages[conversationId];
            if (!msgs) return;
            const idx = msgs.findIndex(m => m._tempId === tempId);
            if (idx !== -1) Object.assign(msgs[idx], updates);
        })),

    setMessages: (conversationId, messages) =>
        set(produce((state) => {
            state.messages[conversationId] = messages;
        })),

    loadOlderMessages: async (convId) => {
        const state = get();
        const cursor = state.cursors?.[convId]?.oldestCursor;
        // null means no more messages; do nothing
        if (cursor === null) return;
        // Pass cursor only if it exists (it's a UUID string)
        const res = await chatApi.getMessages(convId, cursor || undefined, 30);
        const olderMsgs = res.data;
        set(produce((draft) => {
            const existing = draft.messages[convId] || [];
            const reversed = olderMsgs.reverse();
            draft.messages[convId] = [...reversed, ...existing];
            if (!draft.cursors) draft.cursors = {};
            draft.cursors[convId] = {
                oldestCursor: olderMsgs.length > 0 ? olderMsgs[0].id : null,
                hasMore: olderMsgs.length >= 30,
            };
        }));
    },

    // WebSocket connection – now guarded against undefined conversationId
    connectWebSocket: (conversationId) => {
        if (!conversationId || conversationId === 'undefined') return;

        const store = get();
        const token = localStorage.getItem('access_token');
        if (!token) return;
        if (store.socket && store.socket.readyState === WebSocket.OPEN) return;

        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        const wsUrl = `${wsBase}/ws/chat/${conversationId}/?${token}`;

        const ws = new WebSocket(wsUrl);
        ws.onopen = () => set({ isConnected: true, reconnectAttempts: 0 });
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.sender_id === store.user?.id) return;
            get().addMessage(conversationId, { ...message, _confirmed: true });
        };
        ws.onclose = () => {
            set({ isConnected: false });
            const attempts = get().reconnectAttempts + 1;
            set({ reconnectAttempts: attempts });
            setTimeout(() => {
                if (get().activeConversation?.id === conversationId) {
                    get().connectWebSocket(conversationId);
                }
            }, Math.min(1000 * 2 ** attempts, 30000));
        };
        ws.onerror = () => { };
        set({ socket: ws });
    },

    disconnectWebSocket: () => {
        const { socket } = get();
        if (socket) socket.close();
        set({ socket: null, isConnected: false });
    },
}));