// src/api/client.js
/**
 * Axios API client with automatic JWT token refresh.
 * 
 * Features:
 * - Automatic Bearer token attachment
 * - Proactive token refresh on expiry (before request)
 * - Queue for concurrent requests during refresh
 * - WebSocket token refresh event dispatch
 * - Rate limit detection
 * - Ngrok header support
 */

import axios from 'axios';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || '';
export const BACKEND_BASE_URL = BASE_URL;

// All API requests automatically get the /api prefix
const API_BASE = `${BASE_URL}/api`;

// Event name for WebSocket token refresh
export const TOKEN_REFRESHED_EVENT = 'token_refreshed';

// Auth-related localStorage keys (for selective cleanup)
const AUTH_KEYS = [
  'access_token',
  'refresh_token',
  'auth_user',
];


// ─── Token Utilities ─────────────────────────────────────────────────────────

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    // Add 30-second buffer to refresh before actual expiry
    return payload.exp ? (payload.exp - 30) <= now : false;
  } catch {
    return true;
  }
}

function clearAuthData() {
  AUTH_KEYS.forEach(key => localStorage.removeItem(key));
}

function getStoredTokens() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  };
}

function storeTokens(access, refresh = null) {
  localStorage.setItem('access_token', access);
  if (refresh) {
    localStorage.setItem('refresh_token', refresh);
  }
}


// ─── API Instances ───────────────────────────────────────────────────────────

const refreshApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});


// ─── Token Refresh State ─────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

function dispatchTokenRefreshEvent(newToken) {
  try {
    window.dispatchEvent(
      new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token: newToken } })
    );
  } catch (e) { /* non-critical */ }
}

async function refreshAccessToken() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const { refresh } = getStoredTokens();

    if (!refresh) {
      clearAuthData();
      window.location.href = '/login';
      return Promise.reject(new Error('No refresh token available'));
    }

    try {
      const response = await refreshApi.post('/accounts/refresh-token/', {
        refresh,
      });

      if (!response.data?.access) {
        throw new Error('No access token in refresh response');
      }

      const { access } = response.data;
      const newRefreshToken = response.data.refresh || refresh;

      storeTokens(access, newRefreshToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      dispatchTokenRefreshEvent(access);
      return access;
    } catch (error) {
      clearAuthData();
      window.location.href = '/login';
      throw error;
    }
  })();

  refreshPromise.finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}


// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config) => {
    // NO trailing slash removal – Django expects trailing slashes
    // and our API modules already append them correctly.

    let { access } = getStoredTokens();

    // Proactive token refresh if expired and not a refresh request itself
    if (
      access &&
      isTokenExpired(access) &&
      !config.url?.includes('/accounts/refresh-token')
    ) {
      try {
        access = await refreshAccessToken();
      } catch {
        // If proactive refresh fails, the redirect already happened;
        // let the request continue with the old token – the 401 handler
        // will catch it and redirect again if needed.
      }
    }

    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);


// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  async (response) => {
    // Sync server time offset if available
    const serverDate = response.headers['date'];
    if (serverDate) {
      try {
        const { setTimeOffset } = await import('../utils/time');
        setTimeOffset(serverDate);
      } catch {
        // Time utility not critical
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    if (originalRequest._retryCount > 3) {
      clearAuthData();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const authEndpoints = [
      '/accounts/login',
      '/accounts/verify-otp',
      '/accounts/refresh-token',
      '/accounts/request-otp',
      '/accounts/register',
      '/accounts/signup',
      '/accounts/biometric/login',
    ];

    if (authEndpoints.some(ep => originalRequest.url?.includes(ep))) {
      return Promise.reject(error);
    }

    if (originalRequest._syncRequest && error.response?.status === 401) {
      return Promise.reject(error);
    }

    // ── 401 – Token Refresh ────────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest._retryCount += 1;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Other error logging ─────────────────────────────────────────────────
    if (error.response?.status === 403) {
      console.warn('[403] Access denied:', error.response?.data?.detail || error.response?.data);
    }
    if (error.response?.status === 429) {
      console.warn(`[429] Rate limited. Retry after: ${error.response?.headers?.['retry-after'] || 'unknown'}s`);
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.warn('[Network] Connection failed.');
    }
    if (error.response?.status >= 500) {
      console.error(`[${error.response.status}] Server error:`, error.response?.data);
    }

    return Promise.reject(error);
  },
);


export { refreshApi, clearAuthData, getStoredTokens, storeTokens };
export default apiClient;