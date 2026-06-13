// src/api/chatApi.js
import apiClient from './client';

// Helper for logging API errors
const logApiError = (endpoint, error, context = {}) => {
    console.error(`API Error [${endpoint}]:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        ...context
    });
};

const chatApi = {
    // ─── Conversations ───
    getConversations: (archived = false) =>
        apiClient.get('chat/conversations', { params: { archived } })
            .catch(error => {
                logApiError('getConversations', error, { archived });
                throw error;
            }),

    startConversation: (receiverId) =>
        apiClient.post('chat/conversations/start', { receiver_id: receiverId })
            .catch(error => {
                logApiError('startConversation', error, { receiverId });
                throw error;
            }),

    getMessages: (convId, before = null, limit = 50) => {
        // Validate UUID format before sending
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(convId)) {
            console.error(`Invalid conversation ID format: ${convId}`);
            return Promise.reject(new Error(`Invalid conversation ID: ${convId}`));
        }

        return apiClient.get(`chat/conversations/${convId}/messages`, {
            params: { before, limit },
        }).catch(error => {
            logApiError('getMessages', error, { convId, before, limit });
            throw error;
        });
    },

    sendMessage: (convId, data, idempotencyKey = null) => {
        const headers = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        return apiClient.post(`chat/conversations/${convId}/messages`, data, { headers })
            .catch(error => {
                logApiError('sendMessage', error, { convId, data, idempotencyKey });
                throw error;
            });
    },

    markAsRead: (convId, messageIds = null) =>
        apiClient.post(`chat/conversations/${convId}/mark-read`, {
            message_ids: messageIds || [],
        }).catch(error => {
            logApiError('markAsRead', error, { convId, messageIds });
            throw error;
        }),

    // ─── Message Edit/Delete ───
    editMessage: (convId, messageId, newContent) =>
        apiClient.put(`chat/conversations/${convId}/messages/${messageId}`, { content: newContent })
            .catch(error => {
                logApiError('editMessage', error, { convId, messageId });
                throw error;
            }),

    deleteMessage: (convId, messageId, deleteForEveryone = true) =>
        apiClient.delete(`chat/conversations/${convId}/messages/${messageId}`, {
            params: { delete_for_everyone: deleteForEveryone }
        }).catch(error => {
            logApiError('deleteMessage', error, { convId, messageId, deleteForEveryone });
            throw error;
        }),

    // ─── Archive / Unarchive / Delete ───
    archiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/archive`)
            .catch(error => {
                logApiError('archiveConversation', error, { convId });
                throw error;
            }),

    unarchiveConversation: (convId) =>
        apiClient.patch(`chat/conversations/${convId}/unarchive`)
            .catch(error => {
                logApiError('unarchiveConversation', error, { convId });
                throw error;
            }),

    deleteConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}`)
            .catch(error => {
                logApiError('deleteConversation', error, { convId });
                throw error;
            }),

    // ─── Block / Unblock ───
    blockUser: (userId) =>
        apiClient.post('chat/block', { blocked_user_id: userId })
            .catch(error => {
                logApiError('blockUser', error, { userId });
                throw error;
            }),

    unblockUser: (userId) =>
        apiClient.delete(`chat/block/${userId}`)
            .catch(error => {
                logApiError('unblockUser', error, { userId });
                throw error;
            }),

    getBlockedUsers: () =>
        apiClient.get('chat/blocked')
            .catch(error => {
                logApiError('getBlockedUsers', error);
                throw error;
            }),

    // ─── Mute / Unmute ───
    muteConversation: (convId) =>
        apiClient.post(`chat/conversations/${convId}/mute`)
            .catch(error => {
                logApiError('muteConversation', error, { convId });
                throw error;
            }),

    unmuteConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}/mute`)
            .catch(error => {
                logApiError('unmuteConversation', error, { convId });
                throw error;
            }),

    // ─── Pin / Unpin ───
    pinConversation: (convId) =>
        apiClient.post(`chat/conversations/${convId}/pin`)
            .catch(error => {
                logApiError('pinConversation', error, { convId });
                throw error;
            }),

    unpinConversation: (convId) =>
        apiClient.delete(`chat/conversations/${convId}/pin`)
            .catch(error => {
                logApiError('unpinConversation', error, { convId });
                throw error;
            }),

    // ─── Report ───
    reportUser: (reportedUserId, reason, description = '', conversationId = null) =>
        apiClient.post('chat/report', {
            reported_user_id: reportedUserId,
            reason,
            description,
            conversation_id: conversationId,
        }).catch(error => {
            logApiError('reportUser', error, { reportedUserId, reason, conversationId });
            throw error;
        }),

    // ─── File Upload ───
    getPresignedUrl: (fileName, contentType, maxFileSize = 10 * 1024 * 1024) =>
        apiClient.post('chat/presigned-url', {
            file_name: fileName,
            content_type: contentType,
            max_file_size: maxFileSize,
        }).catch(error => {
            logApiError('getPresignedUrl', error, { fileName, contentType, maxFileSize });
            throw error;
        }),
};

export { chatApi };
export default chatApi;