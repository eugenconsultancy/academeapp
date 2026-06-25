// frontend/src/api/chatApi.js
/**
 * Chat API client for Academe.
 * 
 * The base URL is already /api (set in client.js), so all paths here
 * start with /chat/...  → resulting in /api/chat/...
 *
 * Trailing slashes are included EXACTLY as the backend expects them.
 * The backend defines some routes with a trailing slash and some
 * without; this file must match each one precisely.
 *
 * Every method returns a safe fallback on error:
 * - list endpoints → { data: [] }
 * - single items   → { data: null }
 * - mutating calls → null (caller should check)
 * 
 * Token refresh is handled globally by client.js; this module never
 * touches tokens or localStorage.
 */
import client from './client'; // pre-configured axios instance
import useChatStore from '@/stores/useChatStore';

// ─── Error Logger (never throws) ────────────────────────────────────────────

function handleApiError(error, context = 'API request') {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.error || error.message;

    switch (status) {
        case 429: {
            const data = error.response?.data;
            const limit = data?.limit;
            const resetAt = data?.reset_at;
            // Update rate-limit state directly from the error payload
            useChatStore.getState()?.setRateLimit?.(limit ?? 60, limit ?? 60, resetAt ?? null);
            console.warn(`[RateLimit] ${context}: ${detail}`);
            break;
        }
        case 403:
            console.warn(`[Forbidden] ${context}: ${detail}`);
            break;
        case 404:
            console.warn(`[Not Found] ${context}: ${detail}`);
            break;
        case 401:
            console.warn(`[Unauthorized] ${context}: ${detail}`);
            break;
        default:
            console.error(`[Error ${status}] ${context}: ${detail}`);
            break;
    }
}

// ─── API Methods ─────────────────────────────────────────────────────────────

const chatApi = {
    // ── Conversations ────────────────────────────────────────────────────

    async getConversations(filter = 'all', cursor = null) {
        try {
            const params = { filter, limit: 50 };
            if (cursor) params.cursor = cursor;
            return await client.get('/chat/conversations', { params });
        } catch (error) {
            handleApiError(error, 'getConversations');
            return { data: [] };
        }
    },

    async createConversation(participantIds) {
        try {
            return await client.post('/chat/conversations', {
                participant_ids: participantIds,
            });
        } catch (error) {
            handleApiError(error, 'createConversation');
            return { data: null };
        }
    },

    async togglePin(convId) {
        try {
            return await client.post(`/chat/conversations/${convId}/pin`);
        } catch (error) {
            handleApiError(error, 'togglePin');
            return null;
        }
    },

    async toggleArchive(convId) {
        try {
            return await client.post(`/chat/conversations/${convId}/archive`);
        } catch (error) {
            handleApiError(error, 'toggleArchive');
            return null;
        }
    },

    async toggleMute(convId) {
        try {
            return await client.post(`/chat/conversations/${convId}/mute`);
        } catch (error) {
            handleApiError(error, 'toggleMute');
            return null;
        }
    },

    async leaveConversation(convId) {
        try {
            return await client.post(`/chat/conversations/${convId}/leave`);
        } catch (error) {
            handleApiError(error, 'leaveConversation');
            return null;
        }
    },

    // ── Messages ─────────────────────────────────────────────────────────

    async getMessages(convId, cursor = null) {
        try {
            const params = { limit: 50 };
            if (cursor) params.cursor = cursor;
            return await client.get(`/chat/conversations/${convId}/messages`, { params });
        } catch (error) {
            handleApiError(error, 'getMessages');
            return { data: { items: [], next_cursor: null } };
        }
    },

    async sendMessage(convId, payload) {
        try {
            const response = await client.post(
                `/chat/conversations/${convId}/messages`,
                payload,
            );

            // The backend now returns a SendMessageResponse with rate_limit
            if (response.data?.rate_limit) {
                const { used, limit, reset_at } = response.data.rate_limit;
                useChatStore.getState()?.setRateLimit?.(used, limit, reset_at);
            }

            return response;
        } catch (error) {
            if (error.response?.status === 429) {
                const data = error.response.data;
                // Set used = limit to indicate fully exhausted
                useChatStore.getState()?.setRateLimit?.(
                    data.limit ?? 60,
                    data.limit ?? 60,
                    data.reset_at ?? null,
                );
            }
            handleApiError(error, 'sendMessage');
            return { data: null };
        }
    },

    async editMessage(messageId, content) {
        try {
            return await client.patch(`/chat/messages/${messageId}`, null, {
                params: { content },
            });
        } catch (error) {
            handleApiError(error, 'editMessage');
            return null;
        }
    },

    async deleteMessage(messageId, mode = 'self') {
        try {
            return await client.delete(`/chat/messages/${messageId}`, {
                params: { mode },
            });
        } catch (error) {
            handleApiError(error, 'deleteMessage');
            return null;
        }
    },

    async forwardMessage(messageId, targetConvIds) {
        try {
            return await client.post(`/chat/messages/${messageId}/forward`, {
                target_conversation_ids: targetConvIds,
            });
        } catch (error) {
            handleApiError(error, 'forwardMessage');
            return null;
        }
    },

    async bulkSendMessages(convId, messages) {
        try {
            return await client.post(`/chat/conversations/${convId}/bulk-send`, {
                messages,
            });
        } catch (error) {
            handleApiError(error, 'bulkSendMessages');
            return { data: [] };
        } finally {
            // Always refresh the rate limit after a bulk sync attempt
            // because the server may have succeeded partially or fully.
            try {
                const rateLimitRes = await client.get('/chat/rate-limit');
                if (rateLimitRes.data) {
                    const { used, limit, reset_at } = rateLimitRes.data;
                    useChatStore.getState()?.setRateLimit?.(used, limit, reset_at);
                }
            } catch {
                // silent – non‑critical
            }
        }
    },

    // ── Blocking ─────────────────────────────────────────────────────────

    async blockUser(userId) {
        try {
            return await client.post(`/chat/users/${userId}/block`);
        } catch (error) {
            handleApiError(error, 'blockUser');
            return null;
        }
    },

    async unblockUser(userId) {
        try {
            return await client.delete(`/chat/users/${userId}/unblock`);
        } catch (error) {
            handleApiError(error, 'unblockUser');
            return null;
        }
    },

    async listBlocked() {
        try {
            return await client.get('/chat/blocked');
        } catch (error) {
            handleApiError(error, 'listBlocked');
            return { data: [] };
        }
    },

    // ── Reporting ────────────────────────────────────────────────────────

    async submitReport(payload) {
        try {
            return await client.post('/chat/reports', payload);
        } catch (error) {
            handleApiError(error, 'submitReport');
            return null;
        }
    },

    // ── Search ───────────────────────────────────────────────────────────

    async searchMessages(q, conversationId = null) {
        try {
            const params = { q, limit: 20 };
            if (conversationId) params.conversation_id = conversationId;
            return await client.get('/chat/messages/search', { params });
        } catch (error) {
            handleApiError(error, 'searchMessages');
            return { data: [] };
        }
    },

    async searchUsers(q) {
        try {
            return await client.get('/chat/users/search/', {
                params: { q, limit: 10 },
            });
        } catch (error) {
            handleApiError(error, 'searchUsers');
            return { data: [] };
        }
    },

    // ── Rate Limit ───────────────────────────────────────────────────────

    async getRateLimit() {
        try {
            const response = await client.get('/chat/rate-limit');
            if (response.data) {
                const { used, limit, reset_at } = response.data;
                useChatStore.getState()?.setRateLimit?.(used, limit, reset_at);
            }
            return response;
        } catch (error) {
            handleApiError(error, 'getRateLimit');
            return { data: { used: 0, limit: 60, remaining: 60, reset_at: null } };
        }
    },

    // ── Draft ────────────────────────────────────────────────────────────

    async saveDraft(convId, draft) {
        try {
            return await client.patch(`/chat/conversations/${convId}/draft`, { draft });
        } catch (error) {
            console.warn('Failed to save draft:', error.message);
            return null;
        }
    },

    // ── File Upload (Presigned URL) ──────────────────────────────────────

    async uploadFile(file) {
        try {
            const { data } = await client.post('/chat/upload/presigned-url', {
                file_name: file.name,
                content_type: file.type || 'application/octet-stream',
            });

            const formData = new FormData();
            if (data.fields) {
                Object.entries(data.fields).forEach(([key, value]) => {
                    formData.append(key, value);
                });
            }
            formData.append('file', file);

            const uploadResponse = await fetch(data.url, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${errorText}`);
            }

            return {
                file_url: data.file_url,
                file_name: file.name,
                file_size: file.size,
                file_mime_type: file.type || 'application/octet-stream',
            };
        } catch (error) {
            handleApiError(error, 'uploadFile');
            return null;
        }
    },
};

export default chatApi;