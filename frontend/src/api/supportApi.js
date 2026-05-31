import apiClient from './client';

export const supportApi = {
    // User endpoints
    listTickets: (params) => apiClient.get('/support/', { params }),
    createTicket: (data) => apiClient.post('/support/', data),
    getTicket: (id) => apiClient.get(`/support/${id}/`),

    // Admin endpoints
    adminListTickets: (params) => apiClient.get('/support/admin/all/', { params }),
    adminGetTicket: (id) => apiClient.get(`/support/admin/${id}/`),
    adminUpdateTicket: (id, data) => apiClient.put(`/support/admin/${id}/`, data),
    adminRespond: (id, message, isInternal = false) =>
        apiClient.post(`/support/admin/${id}/respond/`, { message, is_internal: isInternal }),
};