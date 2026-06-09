import apiClient from './client';

export const accountsApi = {
  signup: (data) => apiClient.post('/accounts/signup/', data),
  requestOTP: (phone) => apiClient.post('/accounts/request-otp/', { phone_number: phone }),
  verifyOTP: (phone, otp) => apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp }),
  verify2FALogin: (tempToken, code) => apiClient.post('/accounts/2fa/verify-login/', { temp_token: tempToken, code: code }),

  forgotPassword: (phone) => apiClient.post('/accounts/forgot-password/', { phone_number: phone }),
  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/accounts/reset-password/', { phone_number: phone, otp: otp, new_password: newPassword }),

  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/accounts/change-password/', { old_password: oldPassword, new_password: newPassword }),

  enrollBiometric: (imageData) => apiClient.post('/accounts/biometric/enroll/', { image_data: imageData }),
  disableBiometric: () => apiClient.post('/accounts/biometric/disable/'),
  biometricLogin: (phone, imageData) =>
    apiClient.post('/accounts/biometric/login/', { phone_number: phone, image_data: imageData }),

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

  exportData: (format = 'json') => apiClient.post('/accounts/export-data/', null, { params: { format } }),
  deleteAccount: () => apiClient.post('/accounts/delete-account/'),

  listSessions: () => apiClient.get('/accounts/sessions/'),
  revokeSession: (sessionId) => apiClient.post(`/accounts/sessions/${sessionId}/revoke/`),
  revokeAllSessions: () => apiClient.post('/accounts/sessions/revoke-all/'),

  setup2FA: () => apiClient.get('/accounts/2fa/setup/'),
  verify2FASetup: (code) => apiClient.post('/accounts/2fa/verify-setup/', { code: code }),
  disable2FA: (code) => apiClient.post('/accounts/2fa/disable/', { code: code }),
  get2FAStatus: () => apiClient.get('/accounts/2fa/status/'),

  listRoles: () => apiClient.get('/accounts/roles/'),
  assignRole: (data) => apiClient.post('/accounts/roles/assign/', data),
  revokeRole: (roleId, reason) => apiClient.post(`/accounts/roles/${roleId}/revoke/`, { reason }),
  listAllUsers: () => apiClient.get('/accounts/users/'),

  deactivateUser: (userId) => apiClient.post(`/accounts/users/${userId}/deactivate/`),

  // Admin: Ticket Management
  listTickets: () => apiClient.get('/support/admin/all/'),
  getTicket: (id) => apiClient.get(`/support/admin/${id}/`),
  updateTicket: (id, data) => apiClient.put(`/support/admin/${id}/`, data),
  respondToTicket: (id, message, isInternal) =>
    apiClient.post(`/support/admin/${id}/respond/`, { message, is_internal: isInternal }),
};