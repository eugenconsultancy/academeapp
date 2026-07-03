// frontend/src/stores/useChatStore.js
import { create } from 'zustand';
import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import chatApi from '@/api/chatApi';
import useUserStore from './useUserStore';

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
const dbPromise = openDB('academe-chat', 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('offlineQueue')) {
            db.createObjectStore('offlineQueue', { keyPath: 'client_msg_id' });
        }
    },
});

const offlineQueueStore = {
    async getAll() {
        const db = await dbPromise;
        return db.getAll('offlineQueue');
    },
    async add(msg) {
        const db = await dbPromise;
        await db.put('offlineQueue', msg);
    },
    async delete(clientMsgId) {
        const db = await dbPromise;
        await db.delete('offlineQueue', clientMsgId);
    },
    async clear() {
        const db = await dbPromise;
        await db.clear('offlineQueue');
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sortConversations = (convs) =>
    [...convs].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
    });

const mergeMessages = (existing, incoming) => {
    const map = new Map();
    for (const msg of existing) {
        const key = msg.client_msg_id || msg.id;
        if (key) map.set(key, msg);
    }
    for (const msg of incoming) {
        const key = msg.client_msg_id || msg.id;
        if (key) {
            map.set(key, msg);
        }
    }
    return Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
};

// ─── Store ───────────────────────────────────────────────────────────────────
const useChatStore = create((set, get) => ({
    // State
    conversations: [],
    activeConversationId: null,
    messagesByConversation: {},
    cursors: {},
    lastReadTimestamps: {},
    unreadCounts: {},
    presence: {},
    drafts: {},
    offlineQueue: [],
    isOnline: navigator.onLine,
    syncing: false,
    typingUsers: {},
    rateLimit: {
        used: 0,
        limit: 60,
        remaining: 60,
        reset_at: null,
    },

    // Actions
    setOnline: (online) => set({ isOnline: online }),
    setActiveConversation: (convId) => {
        const now = new Date().toISOString();
        set((state) => ({
            activeConversationId: convId,
            lastReadTimestamps: { ...state.lastReadTimestamps, [convId]: now },
        }));
    },

    setConversations: (conversations) =>
        set({ conversations: sortConversations(conversations) }),

    addOrUpdateConversation: (conv) =>
        set((state) => {
            const index = state.conversations.findIndex((c) => c.id === conv.id);
            const updated = [...state.conversations];
            if (index >= 0) {
                updated[index] = { ...updated[index], ...conv };
            } else {
                updated.push(conv);
            }
            return { conversations: sortConversations(updated) };
        }),

    createConversation: async (participantIds) => {
        try {
            const response = await chatApi.createConversation(participantIds);
            const newConv = response.data;
            if (!newConv || !newConv.id) return null;

            set((state) => ({
                conversations: sortConversations([
                    ...state.conversations,
                    newConv,
                ]),
                activeConversationId: newConv.id,
            }));
            return newConv;
        } catch (err) {
            console.error('Failed to create conversation:', err);
            return null;
        }
    },

    // ── Messages ─────────────────────────────────────────────────────────────
    setMessages: (convId, messages, appendOlder = false) => {
        set((state) => {
            const existing = state.messagesByConversation[convId] || [];
            const merged = appendOlder
                ? mergeMessages(messages, existing)
                : mergeMessages(existing, messages);
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [convId]: merged,
                },
            };
        });
    },

    upsertMessage: (convId, message) => {
        set((state) => {
            const existing = state.messagesByConversation[convId] || [];
            const merged = mergeMessages(existing, [message]);
            const updatedConvs = state.conversations.map((c) =>
                c.id === convId
                    ? {
                        ...c,
                        last_message_content:
                            message.content || message.file_name || message.msg_type,
                        last_message_at: message.created_at,
                        last_message_sender_id: message.sender_id,
                    }
                    : c
            );
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [convId]: merged,
                },
                conversations: sortConversations(updatedConvs),
            };
        });
    },

    updateMessageStatus: (convId, messageId, status) => {
        set((state) => {
            const msgs = state.messagesByConversation[convId] || [];
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [convId]: msgs.map((m) =>
                        m.id === messageId ? { ...m, status } : m
                    ),
                },
            };
        });
    },

    markMessageEdited: (convId, messageId, newContent, editedAt) => {
        set((state) => {
            const msgs = state.messagesByConversation[convId] || [];
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [convId]: msgs.map((m) =>
                        m.id === messageId
                            ? { ...m, content: newContent, is_edited: true, edited_at: editedAt }
                            : m
                    ),
                },
            };
        });
    },

    deleteMessageLocally: (convId, messageId, mode = 'self') => {
        set((state) => {
            const msgs = state.messagesByConversation[convId] || [];
            let newMsgs;
            if (mode === 'everyone') {
                newMsgs = msgs.map((m) =>
                    m.id === messageId
                        ? { ...m, content: '', deleted_for_everyone: true, file_url: '' }
                        : m
                );
            } else {
                newMsgs = msgs.filter(
                    (m) => !(m.id === messageId && m.deleted_for_self)
                );
            }
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [convId]: newMsgs,
                },
            };
        });
    },

    // ── Cursors ───────────────────────────────────────────────────────────────
    setCursor: (convId, cursor) =>
        set((state) => ({
            cursors: { ...state.cursors, [convId]: cursor },
        })),

    // ── Unread ────────────────────────────────────────────────────────────────
    setUnreadCount: (convId, count) =>
        set((state) => ({
            unreadCounts: { ...state.unreadCounts, [convId]: count },
        })),

    // ── Rate limit management ────────────────────────────────────────────────
    setRateLimit: (used, limit = 60, reset_at = null) => {
        const remaining = Math.max(0, limit - used);
        set({ rateLimit: { used, limit, remaining, reset_at } });
    },

    fetchRateLimit: async () => {
        try {
            const res = await chatApi.getRateLimit();
            const { used, limit, remaining, reset_at } = res.data;
            set({ rateLimit: { used, limit, remaining, reset_at } });
        } catch (e) {
            // keep current
        }
    },

    decrementRateLimit: () => {
        set((state) => {
            const { used, limit, remaining } = state.rateLimit;
            if (remaining <= 0) return state; // no decrement if exhausted
            return {
                rateLimit: {
                    ...state.rateLimit,
                    used: used + 1,
                    remaining: remaining - 1,
                },
            };
        });
    },

    syncRateLimitFromServer: async () => {
        try {
            const res = await chatApi.getRateLimit();
            const { used, limit, remaining, reset_at } = res.data;
            set({ rateLimit: { used, limit, remaining, reset_at } });
        } catch {
            // silently ignore
        }
    },

    // ── Offline queue ─────────────────────────────────────────────────────────
    loadOfflineQueue: async () => {
        const items = await offlineQueueStore.getAll();
        set({ offlineQueue: items });
    },

    addToOfflineQueue: async (message) => {
        await offlineQueueStore.add(message);
        set((state) => ({ offlineQueue: [...state.offlineQueue, message] }));
    },

    removeFromOfflineQueue: async (clientMsgId) => {
        await offlineQueueStore.delete(clientMsgId);
        set((state) => ({
            offlineQueue: state.offlineQueue.filter(
                (m) => m.client_msg_id !== clientMsgId
            ),
        }));
    },

    syncOfflineQueue: async () => {
        const { offlineQueue, isOnline } = get();
        if (!isOnline || offlineQueue.length === 0) return;
        set({ syncing: true });

        const byConversation = {};
        for (const item of offlineQueue) {
            const cid = item.conversation_id;
            if (!byConversation[cid]) byConversation[cid] = [];
            byConversation[cid].push({
                content: item.payload?.content || item.content || '',
                msg_type: item.payload?.msg_type || item.msg_type || 'TEXT',
                client_msg_id: item.client_msg_id,
                file_url: item.payload?.file_url || item.file_url || '',
            });
        }

        for (const [convId, messages] of Object.entries(byConversation)) {
            try {
                await chatApi.bulkSendMessages(convId, messages);
                for (const item of messages) {
                    await offlineQueueStore.delete(item.client_msg_id);
                }
                set((state) => ({
                    offlineQueue: state.offlineQueue.filter(
                        (m) => !messages.find((s) => s.client_msg_id === m.client_msg_id)
                    ),
                }));
            } catch (err) {
                console.error('Batch sync failed for', convId, err);
                break;
            }
        }
        set({ syncing: false });
    },

    // ── Drafts ────────────────────────────────────────────────────────────────
    setDraft: (convId, text) => {
        set((state) => ({ drafts: { ...state.drafts, [convId]: text } }));
        localStorage.setItem(`draft_${convId}`, text);
    },

    loadDrafts: () => {
        const drafts = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('draft_')) {
                const convId = key.substring(6);
                drafts[convId] = localStorage.getItem(key) || '';
            }
        }
        set({ drafts });
    },

    // ── Presence ──────────────────────────────────────────────────────────────
    updatePresence: (userId, data) => {
        set((state) => ({
            presence: { ...state.presence, [userId]: { ...state.presence[userId], ...data } },
        }));
    },

    // ── Typing ────────────────────────────────────────────────────────────────
    setTyping: (userId, typing) =>
        set((state) => ({
            typingUsers: { ...state.typingUsers, [userId]: typing },
        })),

    // ── Conversation lifecycle ──────────────────────────────────────────────
    toggleMuteLocal: (convId) => {
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === convId ? { ...c, is_muted: !c.is_muted } : c
            ),
        }));
    },

    removeConversation: (convId) => {
        set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== convId),
        }));
    },

    updateConversation: (convId, updates) => {
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === convId ? { ...c, ...updates } : c
            ),
        }));
    },

    // ── Utility ───────────────────────────────────────────────────────────────
    getCurrentUserId: () => {
        return useUserStore.getState().user?.id;
    },

    // ── Optimistic send message (new action) ────────────────────────────────
    sendMessage: async (convId, payload) => {
        const state = get();
        const userId = state.getCurrentUserId();
        if (!userId) return null;

        // Optimistic decrement
        get().decrementRateLimit();

        // Construct temporary message
        const tempMsg = {
            id: `temp-${uuidv4()}`,
            conversation_id: convId,
            sender_id: userId,
            content: payload.content || '',
            msg_type: payload.msg_type || 'TEXT',
            status: 'pending',
            is_edited: false,
            created_at: new Date().toISOString(),
            client_msg_id: payload.client_msg_id,
            reply_to_id: payload.reply_to_id || null,
        };

        // Update messages optimistically
        get().upsertMessage(convId, tempMsg);

        try {
            const res = await chatApi.sendMessage(convId, payload);
            const serverMsg = res.data?.message || res.data;
            if (serverMsg) {
                get().upsertMessage(convId, serverMsg);
                // Update rate limit from server response
                if (res.data?.rate_limit) {
                    const rl = res.data.rate_limit;
                    set({ rateLimit: { used: rl.used, limit: rl.limit, remaining: rl.remaining, reset_at: rl.reset_at } });
                }
                return serverMsg;
            }
            // Fallback: mark as sent?
            get().updateMessageStatus(convId, tempMsg.id, 'sent');
            return tempMsg;
        } catch (err) {
            // Restore rate limit on failure? refresh from server
            get().syncRateLimitFromServer();
            throw err;
        }
    },
}));

// ─── Helper: Derive display name from conversation ──────────────────────────
export function getConversationDisplayName(conv) {
    if (conv.other_participant?.full_name) return conv.other_participant.full_name;
    if (conv.group_name) return conv.group_name;
    // Fallback to participant names
    if (conv.participants && conv.participants.length) {
        const names = conv.participants.map(p => p.full_name || p.username || p).filter(Boolean);
        if (names.length) return names.join(', ');
    }
    return 'Chat';
}

export default useChatStore;