import apiClient from './client';

export const supportApi = {
    listTickets: (params) => apiClient.get('/support/', { params }),
    createTicket: (data) => apiClient.post('/support/', data),
    getTicket: (id) => apiClient.get(`/support/${id}/`),
    respondToTicket: (id, message, isInternal = false) =>
        apiClient.post(`/support/${id}/respond/`, { message, is_internal: isInternal }),
    adminListTickets: (params) => apiClient.get('/support/admin/all/', { params }),
    adminUpdateTicket: (id, status, resolution) =>
        apiClient.put(`/support/admin/${id}/`, null, { params: { status, resolution } }),
};