import apiClient from './client';

export const foundItemsApi = {
  // ── Public Items ────────────────────────────────
  listItems: (params) => apiClient.get('/found-items/items/', { params }),
  getItem: (id) => apiClient.get(`/found-items/items/${id}/`),
  createItem: (formData) =>
    apiClient.post('/found-items/items/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteItem: (id) => apiClient.delete(`/found-items/items/${id}/`),

  // ── My Items (items posted by the logged‑in user) ─
  getMyItems: () => apiClient.get('/found-items/my-items/'),

  // ── Ownership ────────────────────────────────────
  verifyOwnership: (itemId) => apiClient.post(`/found-items/items/${itemId}/verify-ownership/`),

  // ── Claim Flow ───────────────────────────────────
  getClaimStatus: (itemId) => apiClient.get(`/found-items/items/${itemId}/claim-status/`),
  claimItem: (itemId) => apiClient.post(`/found-items/items/${itemId}/claim/`),
  getClaim: (claimId) => apiClient.get(`/found-items/claims/${claimId}/`),
  answerSecurity: (claimId, answer) =>
    apiClient.post(`/found-items/claims/${claimId}/answer-security/`, { answer }),
  submitEvidence: (claimId, formData) =>
    apiClient.post(`/found-items/claims/${claimId}/submit-evidence/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  initiatePayment: (claimId) => apiClient.post(`/found-items/claims/${claimId}/initiate-payment/`),
  checkPaymentStatus: (claimId) => apiClient.get(`/found-items/claims/${claimId}/payment-status/`),
  confirmReceipt: (claimId) => apiClient.post(`/found-items/claims/${claimId}/confirm-receipt/`),
  cancelClaim: (claimId) => apiClient.post(`/found-items/claims/${claimId}/cancel/`),

  // ── Tips & Reports ──────────────────────────────
  sendTip: (itemId, message) => apiClient.post(`/found-items/items/${itemId}/tip/`, { message }),
  reportItem: (itemId, reason) => apiClient.post(`/found-items/items/${itemId}/report/`, { reason }),

  // ── User Claims ──────────────────────────────────
  listClaims: () => apiClient.get('/found-items/claims/'),

  // ── Admin ────────────────────────────────────────
  adminItems: () => apiClient.get('/found-items/admin/items/'),
  adminClaims: () => apiClient.get('/found-items/admin/claims/'),
  approveClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/approve/`),
  rejectClaim: (claimId) => apiClient.post(`/found-items/admin/claims/${claimId}/reject/`),
};