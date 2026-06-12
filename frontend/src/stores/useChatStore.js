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
    messages: {},
    socket: null,
    isSocketConnected: false,
    loadingConversations: false,
    loadingMessages: false,
    error: null,
    typingUsers: {},

    // ─── Offline Queue ───
    queuedMessages: {},

    // ─── Auth ───
    setUserId: (userId) => set({ userId }),

    // ─── Conversation Actions ───
    fetchConversations: async (archived = false) => {
        set({ loadingConversations: true, error: null });
        try {
            const data = await chatApi.getConversations(archived);
            const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
            if (archived) {
                set({ archivedConversations: list, loadingConversations: false });
            } else {
                set({ conversations: list, loadingConversations: false });
            }
        } catch (err) {
            set({ error: err.message, loadingConversations: false });
        }
    },

    setActiveConversation: (convId) => set({ activeConversationId: convId }),

    // ─── Message Actions ───
    fetchMessages: async (convId, before = null) => {
        if (!convId) return;
        set({ loadingMessages: true, error: null });
        try {
            const data = await chatApi.getMessages(convId, before);
            const list = Array.isArray(data) ? data : (data?.results || data?.data || []);

            // Filter out any duplicate messages by ID
            const uniqueMessages = [];
            const seenIds = new Set();
            for (const msg of list) {
                if (msg.id && !seenIds.has(msg.id)) {
                    seenIds.add(msg.id);
                    uniqueMessages.push(msg);
                }
            }

            set((state) => ({
                messages: {
                    ...state.messages,
                    [convId]: before
                        ? [...uniqueMessages, ...(state.messages[convId] || [])]
                        : uniqueMessages,
                },
                loadingMessages: false,
            }));
        } catch (err) {
            set({ error: err.message, loadingMessages: false });
        }
    },

    addMessage: (conversationId, message) => {
        const state = get();
        const currentMessages = state.messages[conversationId] || [];

        // Create a unique key for the message
        const messageId = message.id || message._tempId;
        if (!messageId) {
            console.error('Message has no id or _tempId:', message);
            return;
        }

        // Check if this message already exists (by real ID)
        const existingById = currentMessages.find(m => m.id === message.id);
        if (existingById) {
            console.log(`Message ${message.id} already exists, skipping`);
            return;
        }

        let updatedMessages;

        // If this is a real message with a _tempId, replace the pending message
        if (message._tempId) {
            const pendingIndex = currentMessages.findIndex(m => m._tempId === message._tempId);
            if (pendingIndex !== -1) {
                // Replace the pending message with the real one
                updatedMessages = [...currentMessages];
                updatedMessages[pendingIndex] = {
                    ...message,
                    _pending: false,
                    id: message.id,
                    _tempId: undefined // Remove tempId
                };
                console.log(`Replaced pending message ${message._tempId} with real message ${message.id}`);
            } else {
                // No pending message found, just add normally
                updatedMessages = [...currentMessages, { ...message, _pending: false }];
            }
        } else {
            // Check for duplicate by ID (should not happen due to check above, but safe)
            const exists = currentMessages.some(m => m.id === message.id);
            if (exists) return;
            updatedMessages = [...currentMessages, message];
        }

        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: updatedMessages,
            },
        }));

        // Update conversation last message preview
        const isOwn = message.sender_id === state.userId;
        if (!isOwn && conversationId === state.activeConversationId) {
            // Don't auto-mark as read here - let visibility handler do it
        }

        // Update conversation list preview
        get().updateConversationLastMessage(conversationId, message);
    },

    addPendingMessage: (conversationId, tempId, content, msgType = 'TEXT', fileUrl = null, replyToId = null) => {
        const state = get();
        const currentMessages = state.messages[conversationId] || [];

        // Check if a pending message with this tempId already exists
        const existingPending = currentMessages.find(m => m._tempId === tempId);
        if (existingPending) {
            console.log(`Pending message ${tempId} already exists, not adding duplicate`);
            return existingPending;
        }

        const optimisticMessage = {
            id: tempId,
            _tempId: tempId,
            _pending: true,
            conversation_id: conversationId,
            sender_id: state.userId,
            content: content,
            file_url: fileUrl,
            msg_type: msgType,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            is_read: false,
            is_delivered: false,
            reply_to_id: replyToId,
            reply_preview: null,
            duration: null,
        };

        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: [...(state.messages[conversationId] || []), optimisticMessage],
            },
        }));

        return optimisticMessage;
    },

    removePendingMessage: (conversationId, tempId) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).filter(m => m._tempId !== tempId),
            },
        }));
    },

    markMessageFailed: (conversationId, tempId) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map(m =>
                    m._tempId === tempId ? { ...m, _failed: true, _pending: false } : m
                ),
            },
        }));
    },

    retryMessage: async (conversationId, tempId) => {
        const state = get();
        const messages = state.messages[conversationId] || [];
        const failedMsg = messages.find(m => m._tempId === tempId);
        if (!failedMsg || !failedMsg._failed) return false;

        // Re-queue
        get().queueMessage(conversationId, {
            content: failedMsg.content,
            msg_type: failedMsg.msg_type,
            file_url: failedMsg.file_url,
            _tempId: tempId,
            reply_to_id: failedMsg.reply_to_id,
        });

        // Attempt immediate flush if socket connected
        if (state.isSocketConnected && state.socket) {
            get().flushQueue(conversationId);
        }

        return true;
    },

    queueMessage: (conversationId, messageData) => {
        set((state) => ({
            queuedMessages: {
                ...state.queuedMessages,
                [conversationId]: [...(state.queuedMessages[conversationId] || []), messageData],
            },
        }));
    },

    flushQueue: (conversationId) => {
        const state = get();
        const queue = state.queuedMessages[conversationId] || [];
        if (!state.socket || !state.isSocketConnected || queue.length === 0) return;

        queue.forEach(msg => {
            const wsMessage = {
                type: 'chat_message',
                sender_id: state.userId,
                content: msg.content,
                msg_type: msg.msg_type,
                file_url: msg.file_url,
                reply_to_id: msg.reply_to_id,
                _tempId: msg._tempId,
                duration: msg.duration,
            };
            state.socket.send(JSON.stringify(wsMessage));
        });

        set((state) => ({
            queuedMessages: {
                ...state.queuedMessages,
                [conversationId]: [],
            },
        }));
    },

    clearQueuedMessages: (conversationId) => {
        set((state) => ({
            queuedMessages: {
                ...state.queuedMessages,
                [conversationId]: [],
            },
        }));
    },

    // ─── Block Actions ───
    fetchBlockedUsers: async () => {
        try {
            const data = await chatApi.getBlockedUsers();
            const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
            set({ blockedUserIds: list.map((b) => b.id) });
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
            const state = get();
            const conversationToArchive = state.conversations.find(c => c.id === convId);
            set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== convId),
                archivedConversations: conversationToArchive
                    ? [...state.archivedConversations, { ...conversationToArchive, is_active: false }]
                    : state.archivedConversations,
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
            const state = get();
            const conversationToUnarchive = state.archivedConversations.find(c => c.id === convId);
            set((state) => ({
                archivedConversations: state.archivedConversations.filter(
                    (c) => c.id !== convId
                ),
                conversations: conversationToUnarchive
                    ? [...state.conversations, { ...conversationToUnarchive, is_active: true }]
                    : state.conversations,
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
                messages: {
                    ...state.messages,
                    [convId]: undefined,
                },
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
    markMessagesAsRead: async (convId, readBy = null) => {
        const state = get();
        const currentUserId = state.userId;
        if (!currentUserId) return;

        // Mark OTHER user's messages as read
        set((state) => ({
            messages: {
                ...state.messages,
                [convId]: (state.messages[convId] || []).map((m) =>
                    m.sender_id !== currentUserId ? { ...m, is_read: true } : m
                ),
            },
        }));

        // Update unread count in conversation list
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === convId ? { ...c, unread_count: 0 } : c
            ),
        }));

        // Send read receipt via WebSocket if socket exists
        if (state.socket && state.isSocketConnected) {
            state.socket.send(JSON.stringify({
                type: 'mark_read',
                conversation_id: convId,
            }));
        } else {
            try {
                await chatApi.markAsRead(convId);
            } catch (err) {
                console.error('Failed to mark messages as read:', err);
            }
        }
    },

    updateConversationLastMessage: (conversationId, message) => {
        const state = get();
        const isOwn = message.sender_id === state.userId;
        const preview = message.msg_type === 'VOICE' ? '🎤 Voice message' :
            message.msg_type === 'FILE' ? '📎 File attachment' :
                message.content?.substring(0, 200) || '';

        const updateConv = (conv) =>
            conv.id === conversationId
                ? { ...conv, last_message_preview: preview, last_message_at: message.created_at || message.timestamp }
                : conv;

        set((state) => ({
            conversations: state.conversations.map(updateConv),
            archivedConversations: state.archivedConversations.map(updateConv),
        }));
    },

    updateTypingStatus: (conversationId, userId, isTyping) => {
        set((state) => ({
            typingUsers: {
                ...state.typingUsers,
                [conversationId]: {
                    ...(state.typingUsers?.[conversationId] || {}),
                    [userId]: isTyping ? Date.now() : null,
                },
            },
        }));
    },

    // ─── Clear Error ───
    clearError: () => set({ error: null }),
}));

export default useChatStore;