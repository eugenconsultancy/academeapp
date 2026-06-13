// src/api/client.js
import axios from 'axios';
import { setTimeOffset } from '../utils/time';

const BASE_URL = import.meta.env.VITE_API_URL || '';
export const BACKEND_BASE_URL = BASE_URL;

// All API requests now automatically get the /api prefix
const API_BASE = `${BASE_URL}/api`;

// Event for WebSocket token refresh
export const TOKEN_REFRESHED_EVENT = 'token_refreshed';

const refreshApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

// Request interceptor – attach token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request for debugging (remove in production)
    if (import.meta.env.DEV) {
      console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Helper to dispatch token refresh event for WebSocket
const dispatchTokenRefreshEvent = (newToken) => {
  const event = new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token: newToken } });
  window.dispatchEvent(event);
  console.log('🔔 Dispatched token refresh event for WebSocket');
};

apiClient.interceptors.response.use(
  (response) => {
    const serverDate = response.headers['date'];
    if (serverDate) {
      setTimeOffset(serverDate);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops
    if (originalRequest._retryCount && originalRequest._retryCount > 3) {
      console.error('Max retry attempts reached, redirecting to login');
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Set initial retry count
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    // Match authentication endpoints - don't attempt refresh for these
    const authEndpoints = [
      '/accounts/login/', '/accounts/verify-otp/', '/accounts/refresh-token/',
      '/accounts/request-otp/', '/accounts/register/', '/accounts/signup/',
      '/accounts/biometric/login/', '/accounts/2fa/verify-login/'
    ];

    if (authEndpoints.some(ep => originalRequest.url?.includes(ep))) {
      return Promise.reject(error);
    }

    // Handle sync requests differently
    if (originalRequest._syncRequest && error.response?.status === 401) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      console.log(`🔄 Attempting token refresh. Refresh token present: ${!!refreshToken}`);

      if (!refreshToken) {
        console.warn('No refresh token available, redirecting to login');
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshApi.post('/accounts/refresh-token/', {
          refresh: refreshToken,
        });

        if (!response.data || !response.data.access) {
          throw new Error('No access token in refresh response');
        }

        const { access } = response.data;
        const newRefreshToken = response.data.refresh || refreshToken;

        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', newRefreshToken);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        // Dispatch event for WebSocket reconnection
        dispatchTokenRefreshEvent(access);

        console.log('✅ Token refresh successful');

        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;

        // Increment retry count
        originalRequest._retryCount += 1;

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('Access denied:', error.response?.data);
      // Could trigger logout or notification
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded, retry after:', error.response?.headers['retry-after']);
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      console.warn('Network error - check your connection');
    }

    return Promise.reject(error);
  }
);

export { refreshApi };
export default apiClient;