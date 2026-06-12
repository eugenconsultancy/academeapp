// src/stores/useChatStore.js
import { create } from 'zustand';
import { chatApi } from '../api/chatApi';

const useChatStore = create((set, get) => ({
    // ─── State ───
    userId: null,
    conversations: [],
    archivedConversations: [],
    blockedUserIds: [],
    activeConversationId: null,
    messages: [],
    socket: null,
    isSocketConnected: false,
    loadingConversations: false,
    loadingMessages: false,
    error: null,

    // ─── Auth ───
    setUserId: (userId) => set({ userId }),

    // ─── Conversation Actions ───
    fetchConversations: async (archived = false) => {
        set({ loadingConversations: true, error: null });
        try {
            const data = await chatApi.getConversations(archived);
            if (archived) {
                set({ archivedConversations: data, loadingConversations: false });
            } else {
                set({ conversations: data, loadingConversations: false });
            }
        } catch (err) {
            set({ error: err.message, loadingConversations: false });
        }
    },

    setActiveConversation: (convId) => set({ activeConversationId: convId }),

    // ─── Message Actions ───
    fetchMessages: async (convId, before = null) => {
        set({ loadingMessages: true, error: null });
        try {
            const data = await chatApi.getMessages(convId, before);
            set((state) => ({
                messages: before
                    ? [...data, ...state.messages]
                    : data,
                loadingMessages: false,
            }));
        } catch (err) {
            set({ error: err.message, loadingMessages: false });
        }
    },

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
        })),

    // ─── Block Actions ───
    fetchBlockedUsers: async () => {
        try {
            const data = await chatApi.getBlockedUsers();
            set({ blockedUserIds: data.map((b) => b.id) });
        } catch (err) {
            console.error('Failed to fetch blocked users:', err);
        }
    },

    blockUser: async (userId) => {
        try {
            await chatApi.blockUser(userId);
            set((state) => ({
                blockedUserIds: [...state.blockedUserIds, userId],
                conversations: state.conversations.filter(
                    (c) => c.participant?.id !== userId
                ),
                archivedConversations: state.archivedConversations.filter(
                    (c) => c.participant?.id !== userId
                ),
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    unblockUser: async (userId) => {
        try {
            await chatApi.unblockUser(userId);
            set((state) => ({
                blockedUserIds: state.blockedUserIds.filter((id) => id !== userId),
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    // ─── Mute Actions ───
    toggleMute: async (convId, currentlyMuted) => {
        try {
            if (currentlyMuted) {
                await chatApi.unmuteConversation(convId);
            } else {
                await chatApi.muteConversation(convId);
            }
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === convId ? { ...c, is_muted: !currentlyMuted } : c
                ),
                archivedConversations: state.archivedConversations.map((c) =>
                    c.id === convId ? { ...c, is_muted: !currentlyMuted } : c
                ),
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    // ─── Pin Actions ───
    togglePin: async (convId, currentlyPinned) => {
        try {
            if (currentlyPinned) {
                await chatApi.unpinConversation(convId);
            } else {
                await chatApi.pinConversation(convId);
            }
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === convId ? { ...c, is_pinned: !currentlyPinned } : c
                ),
                archivedConversations: state.archivedConversations.map((c) =>
                    c.id === convId ? { ...c, is_pinned: !currentlyPinned } : c
                ),
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    // ─── Archive Actions ───
    archiveConversation: async (convId) => {
        try {
            await chatApi.archiveConversation(convId);
            set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== convId),
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    unarchiveConversation: async (convId) => {
        try {
            await chatApi.unarchiveConversation(convId);
            set((state) => ({
                archivedConversations: state.archivedConversations.filter(
                    (c) => c.id !== convId
                ),
            }));
            await get().fetchConversations(false);
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    // ─── Delete Actions ───
    deleteConversation: async (convId) => {
        try {
            await chatApi.deleteConversation(convId);
            set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== convId),
                archivedConversations: state.archivedConversations.filter(
                    (c) => c.id !== convId
                ),
                messages: state.activeConversationId === convId ? [] : state.messages,
            }));
            return true;
        } catch (err) {
            set({ error: err.message });
            return false;
        }
    },

    // ─── Socket Actions ───
    setSocket: (socket) => set({ socket, isSocketConnected: !!socket }),

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.close();
            set({ socket: null, isSocketConnected: false });
        }
    },

    // ─── Read Receipts ───
    markMessagesAsRead: (convId, readBy) => {
        const currentUserId = get().userId;
        if (!currentUserId) return;

        set((state) => ({
            messages: state.messages.map((m) =>
                m.sender_id === currentUserId ? { ...m, is_read: true } : m
            ),
        }));
    },

    // ─── Clear Error ───
    clearError: () => set({ error: null }),
}));

export { useChatStore };
export default useChatStore;