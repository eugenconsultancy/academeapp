// frontend/src/api/supportApi.js
import apiClient from './client';

export const supportApi = {
    // ─────────────────────────────────────────────────────────────
    // USER ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    // List tickets for the authenticated user
    // GET /api/support/
    listTickets: (params) => apiClient.get('/support/', { params }),

    // Create a new support ticket
    // POST /api/support/
    createTicket: (data) => apiClient.post('/support/', data),

    // Get a single ticket by ID (user view)
    // GET /api/support/{id}/
    getTicket: (id) => apiClient.get(`/support/${id}/`),

    // Send a reply to a ticket (user side)
    // POST /api/support/{id}/respond/
    sendReply: (id, message) => apiClient.post(`/support/${id}/respond/`, { message }),

    // Alias for sendReply (for consistency)
    replyToTicket: (id, message) => apiClient.post(`/support/${id}/respond/`, { message }),

    // ─────────────────────────────────────────────────────────────
    // ADMIN ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    // List all tickets (admin only)
    // GET /api/support/admin/all/
    adminListTickets: (params) => apiClient.get('/support/admin/all/', { params }),

    // Get a single ticket by ID (admin view)
    // GET /api/support/admin/{id}/
    adminGetTicket: (id) => apiClient.get(`/support/admin/${id}/`),

    // Update a ticket (status, assignment, resolution)
    // PUT /api/support/admin/{id}/
    adminUpdateTicket: (id, data) => apiClient.put(`/support/admin/${id}/`, data),

    // Respond to a ticket as admin
    // POST /api/support/admin/{id}/respond/
    adminRespond: (id, message, isInternal = false) =>
        apiClient.post(`/support/admin/${id}/respond/`, { message, is_internal: isInternal }),
};