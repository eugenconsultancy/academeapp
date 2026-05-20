import apiClient from './client';

export const accountsApi = {
  // ==========================================
  // AUTHENTICATION
  // ==========================================
  signup: (data) => apiClient.post('/accounts/signup/', data),

  requestOTP: (phone) => apiClient.post('/accounts/request-otp/', { phone_number: phone }),

  verifyOTP: (phone, otp) => apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp }),

  // ==========================================
  // PASSWORD RESET (NEW - Self-Serve)
  // ==========================================

  /** Step 1: Request password reset OTP */
  forgotPassword: (phone) => apiClient.post('/accounts/forgot-password/', { phone_number: phone }),

  /** Step 2: Verify OTP and set new password */
  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/accounts/reset-password/', {
      phone_number: phone,
      otp: otp,
      new_password: newPassword,
    }),

  // ==========================================
  // PROFILE
  // ==========================================
  getProfile: () => apiClient.get('/accounts/profile/'),

  updateProfile: (data) => apiClient.put('/accounts/profile/', data),

  uploadProfilePic: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/accounts/profile/upload-pic/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  searchStudents: (query) => apiClient.get('/accounts/students/search/', { params: { q: query } }),

  exportData: () => apiClient.post('/accounts/export-data/'),

  deleteAccount: () => apiClient.post('/accounts/delete-account/'),

  // ==========================================
  // SESSION MANAGEMENT (NEW)
  // ==========================================

  /** List all active sessions for current user */
  listSessions: () => apiClient.get('/accounts/sessions/'),

  /** Revoke a specific session by ID */
  revokeSession: (sessionId) => apiClient.post(`/accounts/sessions/${sessionId}/revoke/`),

  /** Revoke all sessions except current one */
  revokeAllSessions: () => apiClient.post('/accounts/sessions/revoke-all/'),

  /** Refresh JWT access token */
  refreshToken: (refreshToken) =>
    apiClient.post('/accounts/refresh-token/', { refresh: refreshToken }),
};