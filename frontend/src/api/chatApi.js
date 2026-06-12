// src/api/chatApi.js
import apiClient from './client';

const chatApi = {
    // ─── Conversations ───
    getConversations: (archived = false) =>
        apiClient.get('chat/conversations', { params: { archived } }),

    startConversation: (receiverId) =>
        apiClient.post('chat/conversations/start', { receiver_id: receiverId }),

    getMessages: (convId, before = null, limit = 50) =>
        apiClient.get(`chat/conversations/${convId}/messages`, {
            params: { before, limit },
        }),

    sendMessage: (convId, data, idempotencyKey = null) => {
        const headers = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        return apiClient.post(`chat/conversations/${convId}/messages`, data, { headers });
    },

    markAsRead: (convId, messageIds = null) =>
        apiClient.post(`chat/conversations/${convId}/mark-read`, {
            message_ids: messageIds || [],
        }),

    // ─── Message Edit/Delete ───
    editMessage: (convId, messageId, newContent) =>
        apiClient.put(`chat/conversations/${convId}/messages/${messageId}`, { content: newContent }),

    deleteMessage: (convId, messageId, deleteForEveryone = true) =>
        apiClient.delete(`chat/conversations/${convId}/messages/${messageId}`, {
            params: { delete_for_everyone: deleteForEveryone }
        }),

    // ─── Archive / Unarchive / Delete ───
    archiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/archive`),

    unarchiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/unarchive`),

    deleteConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}`),

    // ─── Block / Unblock ───
    blockUser: (userId) =>
        apiClient.post('chat/block', { blocked_user_id: userId }),

    unblockUser: (userId) =>
        apiClient.delete(`chat/block/${userId}`),

    getBlockedUsers: () =>
        apiClient.get('chat/blocked'),

    // ─── Mute / Unmute ───
    muteConversation: (convId) =>
        apiClient.post(`chat/conversations/${convId}/mute`),

    unmuteConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}/mute`),

    // ─── Pin / Unpin ───
    pinConversation: (convId) =>
        apiClient.post(`chat/conversations/${convId}/pin`),

    unpinConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}/pin`),

    // ─── Report ───
    reportUser: (reportedUserId, reason, description = '', conversationId = null) =>
        apiClient.post('chat/report', {
            reported_user_id: reportedUserId,
            reason,
            description,
            conversation_id: conversationId,
        }),

    // ─── File Upload ───
    getPresignedUrl: (fileName, contentType, maxFileSize = 10 * 1024 * 1024) =>
        apiClient.post('chat/presigned-url', {
            file_name: fileName,
            content_type: contentType,
            max_file_size: maxFileSize,
        }),
};

export { chatApi };
export default chatApi;