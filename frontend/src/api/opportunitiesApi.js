import apiClient from './client';

export const opportunitiesApi = {
    // ==========================================
    // OPPORTUNITIES
    // ==========================================

    /** List active opportunities */
    list: (params) => apiClient.get('/opportunities/', { params }),

    /** Get unread count */
    getUnreadCount: () => apiClient.get('/opportunities/unread-count/'),

    /** Get single opportunity detail */
    get: (id) => apiClient.get(`/opportunities/${id}/`),

    /** Create opportunity (admin only) */
    create: (data) => apiClient.post('/opportunities/', data),

    /** Update opportunity */
    update: (id, data) => apiClient.put(`/opportunities/${id}/`, data),

    /** Delete opportunity */
    delete: (id) => apiClient.delete(`/opportunities/${id}/`),

    /** Toggle like on opportunity */
    toggleLike: (opportunityId) => apiClient.post(`/opportunities/${opportunityId}/like/`),

    /** Report inappropriate opportunity */
    report: (opportunityId, reason, description) =>
        apiClient.post(`/opportunities/${opportunityId}/report/`, { reason, description }),
};