// frontend/src/stores/useUserStore.js
import { create } from 'zustand';
import apiClient from '@/api/client';  // ✅ static import – no more mixed import warning
import {
    storeTokens,
    clearAuthData,
    getStoredTokens,
} from '@/api/client';

// ─── Constants for localStorage keys (must match client.js) ─────────────────
const USER_KEY = 'user';

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
    token: getStoredTokens().access,

    // ── Actions ────────────────────────────────────────────────────────────────
    setUser: (user) => {
        persistUser(user);
        set({ user });
    },

    setToken: (token) => {
        set({ token });
    },

    login: async (credentials) => {
        const res = await apiClient.post('/accounts/login/', credentials);
        const { access, refresh, user } = res.data;

        storeTokens(access, refresh);
        set({ token: access, user });
        persistUser(user);
        return user;
    },

    refreshToken: async () => {
        const { refresh } = getStoredTokens();
        if (!refresh) throw new Error('No refresh token available');

        const res = await apiClient.post('/accounts/refresh-token/', { refresh });
        const { access, refresh: newRefresh } = res.data;

        storeTokens(access, newRefresh || refresh);
        set({ token: access });
        return access;
    },

    logout: () => {
        clearAuthData();
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

// Keep Zustand token in sync with Axios interceptor refreshes
if (typeof window !== 'undefined') {
    window.addEventListener('token_refreshed', (event) => {
        const newToken = event.detail?.token;
        if (newToken) {
            useUserStore.getState().setToken(newToken);
        }
    });
}

export default useUserStore;