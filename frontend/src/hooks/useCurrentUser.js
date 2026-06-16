// frontend/src/hooks/useCurrentUser.js
/**
 * Hooks for accessing the current authenticated user.
 * 
 * Provides:
 * - useCurrentUser: Full user object
 * - useCurrentUserId: Just the user ID
 * - useIsAuthenticated: Boolean auth status
 * - useAuthToken: Current access token
 * - useLogout: Logout function
 * 
 * All hooks are thin wrappers around useUserStore for consistent access.
 * Token storage is handled exclusively by @/api/client.js; these hooks
 * never touch localStorage directly.
 */

import { useCallback } from 'react';
import useUserStore from '@/stores/useUserStore';

/**
 * Get the full current user object.
 * @returns {object|null} User object or null if not authenticated
 */
export const useCurrentUser = () => {
    return useUserStore((state) => state.user);
};

/**
 * Get the current user's ID (UUID).
 * @returns {string|null} User UUID or null if not authenticated
 */
export const useCurrentUserId = () => {
    return useUserStore((state) => state.user?.id ?? null);
};

/**
 * Check if a user is currently authenticated.
 * Defensive: requires both user object and token to be truthy,
 * preventing false positives when tokens have been wiped but
 * Zustand hasn't re-rendered.
 * @returns {boolean} True if user is logged in
 */
export const useIsAuthenticated = () => {
    return useUserStore((state) => !!state.user && !!state.token);
};

/**
 * Get the current access token for API/WebSocket calls.
 * @returns {string|null} JWT access token or null
 */
export const useAuthToken = () => {
    return useUserStore((state) => state.token);
};

/**
 * Get the logout function.
 * Relies on the centralized logout in useUserStore, which calls
 * clearAuthData() from @/api/client.js – no manual localStorage
 * manipulation.
 * @returns {function} Logout function that clears auth state
 */
export const useLogout = () => {
    const logout = useUserStore((state) => state.logout);
    return useCallback(() => {
        // The store's logout already clears tokens and user data
        // via clearAuthData(), and resets state.
        logout();
    }, [logout]);
};

/**
 * Get user profile info for display.
 * @returns {object} { fullName, avatarUrl, class_name, isOnline }
 */
export const useUserProfile = () => {
    return useUserStore((state) => ({
        fullName: state.user?.full_name || state.user?.username || 'Unknown',
        avatarUrl: state.user?.profile_pic || null,
        className: state.user?.class_name || null,
        isOnline: state.user?.is_online || false,
    }));
};

/**
 * Check if the current user owns a specific resource.
 * @param {string} ownerId - ID of the resource owner
 * @returns {boolean} True if current user is the owner
 */
export const useIsOwner = (ownerId) => {
    const currentUserId = useCurrentUserId();
    return currentUserId === ownerId;
};