import axios from 'axios';
import { setTimeOffset } from '../utils/time';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const BACKEND_BASE_URL = BASE_URL;

const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor – attach token from localStorage and skip ngrok interstitial
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // ✅ Bypass the ngrok browser‑warning page for API requests
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => Promise.reject(error)
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

apiClient.interceptors.response.use(
  (response) => {
    // Synchronize time with server on every response
    const serverDate = response.headers['date'];
    if (serverDate) {
      setTimeOffset(serverDate);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for auth endpoints
    const authEndpoints = [
      '/accounts/login/', '/accounts/verify-otp/', '/accounts/refresh-token/',
      '/accounts/request-otp/', '/accounts/register/', '/accounts/signup/'
    ];
    if (authEndpoints.some(ep => originalRequest.url?.includes(ep))) {
      return Promise.reject(error);
    }

    // Skip refresh logic for background sync requests – they should just fail
    if (originalRequest._syncRequest && error.response?.status === 401) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
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
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshApi.post('/accounts/refresh-token/', {
          refresh: refreshToken,
        });

        // Validate response content
        if (!response.data || !response.data.access) {
          throw new Error('No access token in refresh response');
        }

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) console.warn('Access denied:', error.response?.data);
    return Promise.reject(error);
  }
);

export { refreshApi };
export default apiClient;