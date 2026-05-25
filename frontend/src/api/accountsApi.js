import apiClient from './client';

export const accountsApi = {
  // ==========================================
  // AUTHENTICATION
  // ==========================================
  signup: (data) => apiClient.post('/accounts/signup/', data),

  requestOTP: (phone) => apiClient.post('/accounts/request-otp/', { phone_number: phone }),

  verifyOTP: (phone, otp) => apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp }),

  // ==========================================
  // PASSWORD RESET
  // ==========================================
  forgotPassword: (phone) => apiClient.post('/accounts/forgot-password/', { phone_number: phone }),

  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/accounts/reset-password/', {
      phone_number: phone,
      otp: otp,
      new_password: newPassword,
    }),

  // ==========================================
  // BIOMETRIC AUTHENTICATION
  // ==========================================
  // Now sends 'image_data' (Base64 string) instead of 'face_embedding'; this is light weight for backend
  enrollBiometric: (imageData) =>
    apiClient.post('/accounts/biometric/enroll/', { image_data: imageData }),

  biometricLogin: (phone, imageData) =>
    apiClient.post('/accounts/biometric/login/', {
      phone_number: phone,
      image_data: imageData
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
  // SESSION MANAGEMENT
  // ==========================================
  listSessions: () => apiClient.get('/accounts/sessions/'),

  revokeSession: (sessionId) => apiClient.post(`/accounts/sessions/${sessionId}/revoke/`),

  revokeAllSessions: () => apiClient.post('/accounts/sessions/revoke-all/'),

  refreshToken: (refreshToken) =>
    apiClient.post('/accounts/refresh-token/', { refresh: refreshToken }),

  // ==========================================
  // TWO-FACTOR AUTHENTICATION (NEW)
  // ==========================================
  toggleTwoFactor: () => apiClient.post('/accounts/2fa/toggle/'),
};