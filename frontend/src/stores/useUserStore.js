// frontend/src/stores/useUserStore.js
import { create } from 'zustand';
import {
    storeTokens,
    clearAuthData,
    getStoredTokens,
} from '@/api/client';

// ─── Constants for localStorage keys (must match client.js) ─────────────────
const USER_KEY = 'user';   // only used for persisting user profile (non‑auth)

const persistUser = (user) => {
    if (user === null || user === undefined) {
        localStorage.removeItem(USER_KEY);
    } else {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
};

const loadUser = () => {
    try {
        const item = localStorage.getItem(USER_KEY);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
};

const useUserStore = create((set, get) => ({
    // ── State ──────────────────────────────────────────────────────────────────
    user: loadUser(),
    token: getStoredTokens().access,   // initial token from client.js utilities

    // ── Actions ────────────────────────────────────────────────────────────────
    setUser: (user) => {
        persistUser(user);
        set({ user });
    },

    setToken: (token) => {
        // Only update the in‑memory state; do NOT touch localStorage.
        // token storage is handled by client.js (storeTokens / clearAuthData)
        set({ token });
    },

    login: async (credentials) => {
        const { default: apiClient } = await import('@/api/client');
        const res = await apiClient.post('/accounts/login/', credentials);
        const { access, refresh, user } = res.data;

        // Use the single authority for tokens
        storeTokens(access, refresh);

        // Update Zustand state
        set({ token: access, user });
        persistUser(user);
        return user;
    },

    refreshToken: async () => {
        const { default: apiClient } = await import('@/api/client');
        const { refresh } = getStoredTokens();
        if (!refresh) throw new Error('No refresh token available');

        const res = await apiClient.post('/accounts/refresh-token/', { refresh });
        const { access, refresh: newRefresh } = res.data;

        // Store new tokens via client.js (will also update localStorage)
        storeTokens(access, newRefresh || refresh);

        // Update in‑memory token
        set({ token: access });
        return access;
    },

    logout: () => {
        // Clear all auth data through the centralized function
        clearAuthData();
        // Remove user profile from localStorage
        localStorage.removeItem(USER_KEY);
        set({ user: null, token: null });
    },

    updateUser: (partial) => {
        const current = get().user;
        if (current) {
            const updated = { ...current, ...partial };
            persistUser(updated);
            set({ user: updated });
        }
    },
}));

// ══════════════════════════════════════════════════════════════════════════════
// Keep Zustand's token state in sync with client.js token refreshes
// (e.g., when the Axios interceptor refreshes the token automatically)
// ══════════════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
    window.addEventListener('token_refreshed', (event) => {
        const newToken = event.detail?.token;
        if (newToken) {
            useUserStore.getState().setToken(newToken);
        }
    });
}

export default useUserStore;