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
  reportItem: (itemId, reason, description) =>
    apiClient.post(`/found-items/items/${itemId}/report/`, { reason, description }),

  // ==========================================
  // CLAIMS
  // ==========================================

  /** HARD GATE: Verify ownership via admission number match */
  verifyOwnership: (itemId) => apiClient.post(`/found-items/items/${itemId}/verify-ownership/`),

  /** Claim a found item */
  claimItem: (itemId) => apiClient.post(`/found-items/items/${itemId}/claim/`),

  /** Submit evidence for a claim */
  submitEvidence: (claimId) => apiClient.post(`/found-items/claims/${claimId}/submit-evidence/`),

  /** Answer security question for a claim */
  answerSecurity: (claimId, answer) =>
    apiClient.post(`/found-items/claims/${claimId}/answer-security/`, { answer }),

  /** Initiate M-Pesa payment */
  initiatePayment: (claimId) => apiClient.post(`/found-items/claims/${claimId}/initiate-payment/`),

  /** Confirm payment received */
  confirmPayment: (claimId) => apiClient.post(`/found-items/claims/${claimId}/confirm-payment/`),

  /** Confirm receipt of item */
  confirmReceipt: (claimId) => apiClient.post(`/found-items/claims/${claimId}/confirm-receipt/`),

  /** List user's claims */
  listClaims: () => apiClient.get('/found-items/claims/'),

  /** Get claim details */
  getClaim: (claimId) => apiClient.get(`/found-items/claims/${claimId}/`),

  // ==========================================
  // TIPS
  // ==========================================

  /** Send a tip about item ownership */
  sendTip: (itemId, message) => apiClient.post(`/found-items/items/${itemId}/tip/`, { message }),

  // ==========================================
  // RECEIPT
  // ==========================================

  /** Generate receipt for a claim */
  generateReceipt: (itemId) => apiClient.get(`/found-items/items/${itemId}/receipt/`),

  // ==========================================
  // M-PESA (NEW)
  // ==========================================

  /** M-Pesa callback webhook (server-side only) */
  mpesaCallback: (data) => apiClient.post('/found-items/mpesa/callback/', data),

  // ==========================================
  // ADMIN
  // ==========================================

  /** Admin: View all items */
  adminItems: () => apiClient.get('/found-items/admin/items/'),

  /** Admin: View all claims */
  adminClaims: () => apiClient.get('/found-items/admin/claims/'),

  /** Admin: Approve a claim */
  approveClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/approve/`),

  /** Admin: Reject a claim */
  rejectClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/reject/`),
};