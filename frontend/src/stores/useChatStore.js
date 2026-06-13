// src/stores/useChatStore.js
import { create } from 'zustand';
import { chatApi } from '../api/chatApi';
import { subscribeWithSelector } from 'zustand/middleware';

const useChatStore = create(
    subscribeWithSelector((set, get) => ({
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

        // ─── Fetch tracking (prevent duplicate API calls) ───
        _fetchedConversations: false,
        _fetchedBlockedUsers: false,
        _pendingFetches: new Set(),

        // ─── Auth ───
        setUserId: (userId) => {
            set({ userId });
            // Trigger re-fetch of user-specific data when userId changes
            if (userId) {
                setTimeout(() => {
                    get().fetchConversations(false);
                    get().fetchBlockedUsers();
                }, 0);
            }
        },

        // ─── Conversation Actions ───
        fetchConversations: async (archived = false) => {
            const state = get();

            // Prevent duplicate fetches for non-archived conversations
            if (!archived && state._fetchedConversations && state.conversations.length > 0) {
                return;
            }

            set({ loadingConversations: true, error: null });
            try {
                const data = await chatApi.getConversations(archived);
                // Defensive parsing - handle different response formats
                let list = [];
                if (Array.isArray(data)) {
                    list = data;
                } else if (data?.results && Array.isArray(data.results)) {
                    list = data.results;
                } else if (data?.data && Array.isArray(data.data)) {
                    list = data.data;
                } else if (data && typeof data === 'object') {
                    // Try to extract any array property
                    list = Object.values(data).find(v => Array.isArray(v)) || [];
                }

                if (archived) {
                    set({ archivedConversations: list, loadingConversations: false });
                } else {
                    set({
                        conversations: list,
                        loadingConversations: false,
                        _fetchedConversations: true
                    });
                }
            } catch (err) {
                console.error('fetchConversations error:', err);
                set({ error: err.message || 'Failed to fetch conversations', loadingConversations: false });
            }
        },

        setActiveConversation: (convId) => set({ activeConversationId: convId }),

        // ─── Message Actions ───
        fetchMessages: async (convId, before = null) => {
            if (!convId) return;

            const state = get();
            const fetchKey = `${convId}_${before || 'initial'}`;

            // Prevent duplicate concurrent fetches
            if (state._pendingFetches.has(fetchKey)) {
                return;
            }

            set({ loadingMessages: true, error: null });
            state._pendingFetches.add(fetchKey);

            try {
                const data = await chatApi.getMessages(convId, before);

                // Defensive parsing
                let list = [];
                if (Array.isArray(data)) {
                    list = data;
                } else if (data?.results && Array.isArray(data.results)) {
                    list = data.results;
                } else if (data?.data && Array.isArray(data.data)) {
                    list = data.data;
                }

                // Filter out duplicate messages by ID
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
                console.error(`fetchMessages error for ${convId}:`, err);
                set({ error: err.message || 'Failed to fetch messages', loadingMessages: false });
            } finally {
                state._pendingFetches.delete(fetchKey);
            }
        },

        // Atomic addMessage with proper duplicate prevention
        addMessage: (conversationId, message) => {
            if (!conversationId || !message) return;

            set((state) => {
                const currentMessages = state.messages[conversationId] || [];
                const messageId = message.id || message._tempId;

                if (!messageId) {
                    console.error('Message has no id or _tempId:', message);
                    return state;
                }

                // Check if message already exists by real ID or tempId
                const existingIndex = currentMessages.findIndex(m =>
                    (message.id && m.id === message.id) ||
                    (message._tempId && m._tempId === message._tempId)
                );

                let updatedMessages;

                if (existingIndex !== -1) {
                    // Update existing message (e.g., replace pending with real)
                    updatedMessages = [...currentMessages];
                    updatedMessages[existingIndex] = {
                        ...currentMessages[existingIndex],
                        ...message,
                        _pending: false,
                        _tempId: undefined,
                    };
                } else {
                    // Add new message
                    updatedMessages = [...currentMessages, message];
                }

                // Update conversation last message preview
                const preview = message.msg_type === 'VOICE' ? '🎤 Voice message' :
                    message.msg_type === 'FILE' ? '📎 File attachment' :
                        message.content?.substring(0, 200) || '';

                const updateConv = (conv) =>
                    conv.id === conversationId
                        ? { ...conv, last_message_preview: preview, last_message_at: message.created_at || message.timestamp }
                        : conv;

                return {
                    messages: {
                        ...state.messages,
                        [conversationId]: updatedMessages,
                    },
                    conversations: state.conversations.map(updateConv),
                    archivedConversations: state.archivedConversations.map(updateConv),
                };
            });
        },

        // Optimistic message with proper tempId
        addPendingMessage: (conversationId, tempId, content, msgType = 'TEXT', fileUrl = null, replyToId = null) => {
            if (!conversationId || !tempId) return null;

            const state = get();

            // Check for existing pending message with same tempId
            const currentMessages = state.messages[conversationId] || [];
            const existing = currentMessages.find(m => m._tempId === tempId);
            if (existing) return existing;

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
            if (!conversationId || !tempId) return;

            set((state) => ({
                messages: {
                    ...state.messages,
                    [conversationId]: (state.messages[conversationId] || []).filter(m => m._tempId !== tempId),
                },
            }));
        },

        markMessageFailed: (conversationId, tempId) => {
            if (!conversationId || !tempId) return;

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

            // Re-queue the message
            get().queueMessage(conversationId, {
                content: failedMsg.content,
                msg_type: failedMsg.msg_type,
                file_url: failedMsg.file_url,
                _tempId: tempId,
                reply_to_id: failedMsg.reply_to_id,
            });

            // Mark as not failed (retrying)
            set((state) => ({
                messages: {
                    ...state.messages,
                    [conversationId]: (state.messages[conversationId] || []).map(m =>
                        m._tempId === tempId ? { ...m, _failed: false, _pending: true } : m
                    ),
                },
            }));

            // Attempt immediate flush if socket connected
            if (state.isSocketConnected && state.socket) {
                get().flushQueue(conversationId);
            }

            return true;
        },

        // ─── Offline Queue Management ───
        queueMessage: (conversationId, messageData) => {
            if (!conversationId) return;

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

            if (!state.socket || state.socket.readyState !== WebSocket.OPEN || queue.length === 0) return;

            // Process queue with error handling for each message
            queue.forEach(msg => {
                try {
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

                    // Check buffer to prevent overwhelming the socket
                    if (state.socket.bufferedAmount < 1024 * 1024) { // Less than 1MB buffered
                        state.socket.send(JSON.stringify(wsMessage));
                    } else {
                        console.warn('Socket buffer full, will retry later');
                        // Keep in queue
                        return;
                    }
                } catch (err) {
                    console.error('Failed to send queued message:', err);
                    // Keep message in queue for retry
                }
            });

            // Clear queue after successful sends (only if all were sent)
            set((state) => ({
                queuedMessages: {
                    ...state.queuedMessages,
                    [conversationId]: [],
                },
            }));
        },

        clearQueuedMessages: (conversationId) => {
            if (!conversationId) return;

            set((state) => ({
                queuedMessages: {
                    ...state.queuedMessages,
                    [conversationId]: [],
                },
            }));
        },

        // ─── Block Actions ───
        fetchBlockedUsers: async () => {
            const state = get();
            if (state._fetchedBlockedUsers) return;

            try {
                const data = await chatApi.getBlockedUsers();
                let list = [];
                if (Array.isArray(data)) {
                    list = data;
                } else if (data?.results && Array.isArray(data.results)) {
                    list = data.results;
                } else if (data?.data && Array.isArray(data.data)) {
                    list = data.data;
                }

                set({
                    blockedUserIds: list.map((b) => b.id || b.blocked?.id || b),
                    _fetchedBlockedUsers: true
                });
            } catch (err) {
                console.error('Failed to fetch blocked users:', err);
            }
        },

        blockUser: async (userId) => {
            if (!userId) return false;

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
                console.error('Block user error:', err);
                set({ error: err.message });
                return false;
            }
        },

        unblockUser: async (userId) => {
            if (!userId) return false;

            try {
                await chatApi.unblockUser(userId);
                set((state) => ({
                    blockedUserIds: state.blockedUserIds.filter((id) => id !== userId),
                }));
                return true;
            } catch (err) {
                console.error('Unblock user error:', err);
                set({ error: err.message });
                return false;
            }
        },

        // ─── Mute Actions ───
        toggleMute: async (convId, currentlyMuted) => {
            if (!convId) return false;

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
                console.error('Toggle mute error:', err);
                set({ error: err.message });
                return false;
            }
        },

        // ─── Pin Actions ───
        togglePin: async (convId, currentlyPinned) => {
            if (!convId) return false;

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
                console.error('Toggle pin error:', err);
                set({ error: err.message });
                return false;
            }
        },

        // ─── Archive Actions ───
        archiveConversation: async (convId) => {
            if (!convId) return false;

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
                console.error('Archive conversation error:', err);
                set({ error: err.message });
                return false;
            }
        },

        unarchiveConversation: async (convId) => {
            if (!convId) return false;

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
                console.error('Unarchive conversation error:', err);
                set({ error: err.message });
                return false;
            }
        },

        // ─── Delete Actions ───
        deleteConversation: async (convId) => {
            if (!convId) return false;

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
                console.error('Delete conversation error:', err);
                set({ error: err.message });
                return false;
            }
        },

        // ─── Socket Actions ───
        setSocket: (socket) => set({ socket, isSocketConnected: !!socket }),

        disconnectSocket: () => {
            const { socket } = get();
            if (socket) {
                try {
                    socket.close();
                } catch (err) {
                    console.error('Error closing socket:', err);
                }
                set({ socket: null, isSocketConnected: false });
            }
        },

        // ─── Read Receipts ───
        markMessagesAsRead: async (convId, readBy = null) => {
            const state = get();
            const currentUserId = state.userId;
            if (!currentUserId || !convId) return;

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
                try {
                    state.socket.send(JSON.stringify({
                        type: 'mark_read',
                        conversation_id: convId,
                    }));
                } catch (err) {
                    console.error('Failed to send read receipt via WebSocket:', err);
                }
            } else {
                try {
                    await chatApi.markAsRead(convId);
                } catch (err) {
                    console.error('Failed to mark messages as read via API:', err);
                }
            }
        },

        updateConversationLastMessage: (conversationId, message) => {
            if (!conversationId || !message) return;

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
            if (!conversationId || !userId) return;

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

        // ─── Reset Store (for logout) ───
        resetStore: () => {
            set({
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
                queuedMessages: {},
                _fetchedConversations: false,
                _fetchedBlockedUsers: false,
                _pendingFetches: new Set(),
            });
        },
    }))
);

export default useChatStore;