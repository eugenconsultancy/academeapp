// frontend/src/api/opportunitiesApi.js
import apiClient from './client';

/**
 * Opportunities API – safe wrappers that never throw.
 * 
 * All methods return a value (or a default) so that calling code
 * never receives an unhandled promise rejection.
 */

export const opportunitiesApi = {

    /** List active opportunities */
    list: async (params) => {
        try {
            return await apiClient.get('/opportunities/', { params });
        } catch (error) {
            console.warn('[opportunitiesApi.list]', error.message);
            return { data: [] };            // safe empty list
        }
    },

    /** Get unread count */
    getUnreadCount: async () => {
        try {
            return await apiClient.get('/opportunities/unread-count/');
        } catch (error) {
            console.warn('[opportunitiesApi.getUnreadCount]', error.message);
            return { data: { count: 0 } };  // safe zero count
        }
    },

    /** Get single opportunity detail */
    get: async (id) => {
        try {
            return await apiClient.get(`/opportunities/${id}/`);
        } catch (error) {
            console.warn(`[opportunitiesApi.get] id=${id}`, error.message);
            return { data: null };
        }
    },

    /** Create opportunity (admin only) */
    create: async (data) => {
        try {
            return await apiClient.post('/opportunities/', data);
        } catch (error) {
            console.warn('[opportunitiesApi.create]', error.message);
            return null;                     // failure to create
        }
    },

    /** Update opportunity */
    update: async (id, data) => {
        try {
            return await apiClient.put(`/opportunities/${id}/`, data);
        } catch (error) {
            console.warn(`[opportunitiesApi.update] id=${id}`, error.message);
            return null;
        }
    },

    /** Delete opportunity */
    delete: async (id) => {
        try {
            return await apiClient.delete(`/opportunities/${id}/`);
        } catch (error) {
            console.warn(`[opportunitiesApi.delete] id=${id}`, error.message);
            return null;
        }
    },

    /** Toggle like on opportunity */
    toggleLike: async (opportunityId) => {
        try {
            return await apiClient.post(`/opportunities/${opportunityId}/like/`);
        } catch (error) {
            console.warn(`[opportunitiesApi.toggleLike] id=${opportunityId}`, error.message);
            return null;
        }
    },

    /** Report inappropriate opportunity */
    report: async (opportunityId, reason, description) => {
        try {
            return await apiClient.post(`/opportunities/${opportunityId}/report/`, {
                reason,
                description,
            });
        } catch (error) {
            console.warn(`[opportunitiesApi.report] id=${opportunityId}`, error.message);
            return null;
        }
    },

    // ── Scholarship Review ────────────────────────────────────────────────

    /**
     * Upload a document for scholarship review.
     * @param {string} opportunityId - The scholarship opportunity ID
     * @param {File} file - The document to upload
     */
    submitScholarshipReview: async (opportunityId, file) => {
        try {
            const formData = new FormData();
            formData.append('document', file);
            // Backend expects opportunity_id as query parameter
            return await apiClient.post(
                `/opportunities/scholarship/submit/?opportunity_id=${opportunityId}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
        } catch (error) {
            console.warn('[opportunitiesApi.submitScholarshipReview]', error.message);
            return { data: null };
        }
    },

    /**
     * Initiate M‑Pesa payment for a scholarship review.
     * @param {string} reviewId - The review record ID
     * @param {string} phoneNumber - Phone number for STK push
     */
    payForReview: async (reviewId, phoneNumber) => {
        try {
            return await apiClient.post(`/opportunities/scholarship/${reviewId}/pay/`, {
                phone_number: phoneNumber,
            });
        } catch (error) {
            console.warn(`[opportunitiesApi.payForReview] reviewId=${reviewId}`, error.message);
            return null;
        }
    },

    /**
     * Get the status of a scholarship review.
     * @param {string} reviewId - The review record ID
     */
    getReviewStatus: async (reviewId) => {
        try {
            return await apiClient.get(`/opportunities/scholarship/${reviewId}/`);
        } catch (error) {
            console.warn(`[opportunitiesApi.getReviewStatus] reviewId=${reviewId}`, error.message);
            return { data: { status: 'unknown' } };
        }
    },
};