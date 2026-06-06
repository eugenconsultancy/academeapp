import apiClient from './client';

export const chatApi = {
    startConversation: (receiverId) =>
        apiClient.post('chat/conversations/start', { receiver_id: receiverId }),

    getConversations: () =>
        apiClient.get('chat/conversations'),

    getMessages: (convId, before = null, limit = 30) => {
        const params = { limit };
        // Only include 'before' if it's truthy (not null, undefined, or empty string)
        if (before) {
            params.before = before;
        }
        return apiClient.get(`chat/conversations/${convId}/messages`, { params });
    },

    sendMessage: (convId, data) =>
        apiClient.post(`chat/conversations/${convId}/messages`, data),

    getPresignedUrl: (fileName, contentType) =>
        apiClient.post('chat/presigned-url', { file_name: fileName, content_type: contentType }),
};