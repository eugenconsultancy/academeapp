import apiClient from './client';

export const foundItemsApi = {
  // ==========================================
  // ITEMS
  // ==========================================

  /** List all active found items */
  listItems: (params) => apiClient.get('/found-items/items/', { params }),

  /** Get single item details */
  getItem: (id) => apiClient.get(`/found-items/items/${id}/`),

  /** Post a new found item */
  createItem: (data) => apiClient.post('/found-items/items/', data),

  /** Report an inappropriate found item */
  reportItem: (itemId, reason) =>
    apiClient.post(`/found-items/items/${itemId}/report/`, { reason }),

  // ==========================================
  // CLAIMS & ESCROW CORES
  // ==========================================

  /** HARD GATE: Verify ownership via admission number match */
  verifyOwnership: (itemId) => apiClient.post(`/found-items/items/${itemId}/verify-ownership/`),

  /** Claim a found item */
  claimItem: (itemId) => apiClient.post(`/found-items/items/${itemId}/claim/`),

  /** Submit evidence for a claim – now sends FormData */
  submitEvidence: (claimId, formData) =>
    apiClient.post(`/found-items/claims/${claimId}/submit-evidence/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Answer security question for a claim */
  answerSecurity: (claimId, answer) =>
    apiClient.post(`/found-items/claims/${claimId}/answer-security/`, { answer }),

  /** Initiate Live IntaSend M-Pesa STK Push checkout sequence */
  initiatePayment: (claimId) => apiClient.post(`/found-items/claims/${claimId}/initiate-payment/`),

  /** Verify local payment transaction record state status */
  confirmPayment: (claimId) => apiClient.post(`/found-items/claims/${claimId}/confirm-payment/`),

  /** Confirm receipt of item (Closes escrow and triggers B2C payout to locator) */
  confirmReceipt: (claimId) => apiClient.post(`/found-items/claims/${claimId}/confirm-receipt/`),

  /** List user's claims */
  listClaims: () => apiClient.get('/found-items/claims/'),

  /** Get claim details */
  getClaim: (claimId) => apiClient.get(`/found-items/claims/${claimId}/`),

  /** Cancel a claim */
  cancelClaim: (claimId) => apiClient.post(`/found-items/claims/${claimId}/cancel/`),

  /** Check payment status (polling) */
  checkPaymentStatus: (claimId) => apiClient.get(`/found-items/claims/${claimId}/payment-status/`),

  // ==========================================
  // TIPS
  // ==========================================

  /** Send a tip about item ownership */
  sendTip: (itemId, message) => apiClient.post(`/found-items/items/${itemId}/tip/`, { message }),

  // ==========================================
  // RECEIPT
  // ==========================================

  /** Generate or fetch tracking receipt metadata details for an individual claim */
  generateReceipt: (itemId) => apiClient.get(`/found-items/items/${itemId}/receipt/`),

  // ==========================================
  // ADMIN CONTROL PANEL
  // ==========================================

  /** Admin: View all items */
  adminItems: () => apiClient.get('/found-items/admin/items/'),

  /** Admin: View all claims */
  adminClaims: () => apiClient.get('/found-items/admin/claims/'),

  /** Admin: Approve a claim */
  approveClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/approve/`),

  /** Admin: Reject a claim */
  rejectClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/reject/`),

  // ==========================================
  // MY LISTINGS
  // ==========================================

  /** Get items posted by the current user */
  getMyItems: () => apiClient.get('/found-items/my-items/'),

  /** Delete a found item (owner or admin) */
  deleteItem: (id) => apiClient.delete(`/found-items/items/${id}/`),
};