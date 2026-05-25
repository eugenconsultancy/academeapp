import axios from 'axios';

// ═══════════════════════════════════════════════════════════════
// 1. Centralized Configuration
// ═══════════════════════════════════════════════════════════════
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const BACKEND_BASE_URL = BASE_URL;

// ═══════════════════════════════════════════════════════════════
// 2. Refresh-specific instance to avoid circular interceptor triggers
// ═══════════════════════════════════════════════════════════════
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ═══════════════════════════════════════════════════════════════
// 3. Main client instance
// ═══════════════════════════════════════════════════════════════
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ═══════════════════════════════════════════════════════════════
// 4. Request Interceptor - Attach access token
// ═══════════════════════════════════════════════════════════════
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════════
// 5. Response Interceptor with Token Refresh Queueing
// ═══════════════════════════════════════════════════════════════
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for auth endpoints themselves
    if (
      originalRequest.url?.includes('/accounts/login/') ||
      originalRequest.url?.includes('/accounts/verify-otp/') ||
      originalRequest.url?.includes('/accounts/refresh-token/') ||
      originalRequest.url?.includes('/accounts/request-otp/') ||
      originalRequest.url?.includes('/accounts/register/')
    ) {
      return Promise.reject(error);
    }

    // Handle 401 with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Start refresh process
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token available - force logout
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshApi.post('/accounts/refresh-token/', {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Process queued requests with new token
        processQueue(null, access);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear everything and redirect
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');

        // Prevent redirect loops
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('Access denied:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

export { refreshApi };
export default apiClient;