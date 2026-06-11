// C:\Users\GATARA-BJTU\academe\frontend\src\api\chatApi.js

import apiClient from './client';

export const chatApi = {
    // ── Conversations ─────────────────────────────────────
    startConversation: (receiverId) =>
        apiClient.post('chat/conversations/start', { receiver_id: receiverId }),

    getConversations: (archived = false) =>
        apiClient.get('chat/conversations', { params: { archived } }),

    archiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/archive`),

    unarchiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/unarchive`),

    deleteConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}`),

    // ── Messages ──────────────────────────────────────────
    getMessages: (convId, before = null, limit = 30) => {
        const params = { limit };
        if (before) {
            params.before = before;
        }
        return apiClient.get(`chat/conversations/${convId}/messages`, { params });
    },

    sendMessage: (convId, data) =>
        apiClient.post(`chat/conversations/${convId}/messages`, data),

    markAsRead: (convId, messageIds = []) =>
        apiClient.post(`chat/conversations/${convId}/mark-read`, { message_ids: messageIds }),

    // ── Blocking ──────────────────────────────────────────
    blockUser: (userId) =>
        apiClient.post('chat/block', { blocked_user_id: userId }),

    unblockUser: (userId) =>
        apiClient.delete(`chat/block/${userId}`),

    getBlockedUsers: () =>
        apiClient.get('chat/blocked'),

    // ── File Upload ───────────────────────────────────────
    getPresignedUrl: (fileName, contentType) =>
        apiClient.post('chat/presigned-url', { file_name: fileName, content_type: contentType }),
};