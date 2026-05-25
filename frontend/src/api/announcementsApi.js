import apiClient from './client';

export const announcementsApi = {
    // ==========================================
    // ANNOUNCEMENTS
    // ==========================================

    /** List visible announcements */
    list: (params) => apiClient.get('/announcements/', { params }),

    /** Get cached announcement feed */
    getFeed: () => apiClient.get('/announcements/feed/'),

    /** Get single announcement detail */
    get: (id) => apiClient.get(`/announcements/${id}/`),

    /** Create announcement (admin/leaders) */
    create: (data) => apiClient.post('/announcements/', data),

    /** Update announcement */
    update: (id, data) => apiClient.put(`/announcements/${id}/`, data),

    /** Delete announcement */
    delete: (id) => apiClient.delete(`/announcements/${id}/`),

    /** Report inappropriate announcement */
    report: (id, data) => apiClient.post(`/announcements/${id}/report/`, data),

    // ==========================================
    // ANNOUNCEMENT REQUESTS
    // ==========================================

    /** Create announcement request (students) */
    createRequest: (data) => apiClient.post('/announcements/requests/', data),

    /** List announcement requests */
    listRequests: (params) => apiClient.get('/announcements/requests/', { params }),

    /** Approve announcement request */
    approveRequest: (id, note) =>
        apiClient.post(`/announcements/requests/${id}/approve/`, { response_note: note }),

    /** Reject announcement request */
    rejectRequest: (id, note) =>
        apiClient.post(`/announcements/requests/${id}/reject/`, { response_note: note }),
};