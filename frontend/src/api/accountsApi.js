import apiClient from './client';

export const accountsApi = {
  // Authentication
  signup: (data) => apiClient.post('/accounts/signup/', data),
  requestOTP: (phone) => apiClient.post('/accounts/request-otp/', { phone_number: phone }),
  verifyOTP: (phone, otp) => apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp }),
  verify2FALogin: (tempToken, code) => apiClient.post('/accounts/2fa/verify-login/', { temp_token: tempToken, code: code }),

  // Password reset (public)
  forgotPassword: (phone) => apiClient.post('/accounts/forgot-password/', { phone_number: phone }),
  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/accounts/reset-password/', { phone_number: phone, otp: otp, new_password: newPassword }),

  // Password change (authenticated)
  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/accounts/change-password/', { old_password: oldPassword, new_password: newPassword }),

  // Biometric
  enrollBiometric: (imageData) => apiClient.post('/accounts/biometric/enroll/', { image_data: imageData }),
  disableBiometric: () => apiClient.post('/accounts/biometric/disable/'),
  biometricLogin: (phone, imageData) =>
    apiClient.post('/accounts/biometric/login/', { phone_number: phone, image_data: imageData }),

  // Profile
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

  // Data export & account deletion
  exportData: (format = 'json') => apiClient.post('/accounts/export-data/', null, { params: { format } }),
  deleteAccount: () => apiClient.post('/accounts/delete-account/'),

  // Sessions
  listSessions: () => apiClient.get('/accounts/sessions/'),
  revokeSession: (sessionId) => apiClient.post(`/accounts/sessions/${sessionId}/revoke/`),
  revokeAllSessions: () => apiClient.post('/accounts/sessions/revoke-all/'),
  // refreshToken is intentionally removed – handled automatically by the interceptor

  // Two-Factor Authentication (TOTP)
  setup2FA: () => apiClient.get('/accounts/2fa/setup/'),
  verify2FASetup: (code) => apiClient.post('/accounts/2fa/verify-setup/', { code: code }),
  disable2FA: (code) => apiClient.post('/accounts/2fa/disable/', { code: code }),
  get2FAStatus: () => apiClient.get('/accounts/2fa/status/'),

  // Role Management
  listRoles: () => apiClient.get('/accounts/roles/'),
  assignRole: (data) => apiClient.post('/accounts/roles/assign/', data),
  revokeRole: (roleId, reason) => apiClient.post(`/accounts/roles/${roleId}/revoke/`, { reason }),
  listAllUsers: () => apiClient.get('/accounts/users/'),

  // Admin: User Deactivation
  deactivateUser: (userId) => apiClient.post(`/accounts/users/${userId}/deactivate/`),
};