import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

// ── Constants ──────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_BUFFER = 60; // Refresh 60 seconds before expiry

// ── Token Helpers ──────────────────────────────────────────────────
function getStoredToken() {
    try { return localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}

function getStoredRefreshToken() {
    try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}

function storeTokens(access, refresh) {
    try {
        localStorage.setItem(ACCESS_TOKEN_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    } catch { console.error('Failed to store tokens'); }
}

function clearTokens() {
    try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    } catch { /* Ignore */ }
}

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        return decoded.exp < now + TOKEN_REFRESH_BUFFER;
    } catch { return true; }
}

// ── Safe JSON parsing with corrupted data cleanup ──────────────
function getStoredUser() {
    try {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        // Corrupted data – remove it to avoid crash on boot
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

function storeUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* Ignore */ }
}

// ── Axios Interceptors Setup ───────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    failedQueue = [];
}

/**
 * Setup Axios interceptors with a mutable reference to the logout callback.
 * This prevents recreating interceptors on every state change (memory leak).
 */
function setupAxiosInterceptors(logoutRef) {
    const requestInterceptor = apiClient.interceptors.request.use(
        (config) => {
            const token = getStoredToken();
            if (token && !isTokenExpired(token)) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const responseInterceptor = apiClient.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // Avoid intercepting login/refresh endpoints themselves
            if (
                originalRequest.url?.includes('/accounts/login/') ||
                originalRequest.url?.includes('/accounts/verify-otp/') ||
                originalRequest.url?.includes('/accounts/refresh-token/') ||
                originalRequest.url?.includes('/accounts/request-otp/')
            ) {
                return Promise.reject(error);
            }

            if (error.response?.status === 401 && !originalRequest._retry) {
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

                originalRequest._retry = true;
                isRefreshing = true;

                const refreshToken = getStoredRefreshToken();
                if (!refreshToken) {
                    isRefreshing = false;
                    // Use the ref to call the current logout
                    logoutRef.current?.();
                    return Promise.reject(error);
                }

                try {
                    const response = await apiClient.post('/accounts/refresh-token/', {
                        refresh: refreshToken,
                    });
                    const { access } = response.data;
                    storeTokens(access, response.data.refresh || refreshToken);
                    processQueue(null, access);
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    // Use the mutable ref to avoid infinite loops on refresh failure
                    logoutRef.current?.();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            if (error.response?.status === 403) {
                console.warn('Access denied:', error.response?.data);
            }

            return Promise.reject(error);
        }
    );

    // Return a cleanup function that ejects both interceptors
    return () => {
        apiClient.interceptors.request.eject(requestInterceptor);
        apiClient.interceptors.response.eject(responseInterceptor);
    };
}

// ═══════════════════════════════════════════════════════════════
// AUTH PROVIDER
// ═══════════════════════════════════════════════════════════════
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRefreshingToken, setIsRefreshingToken] = useState(false);

    const idleTimerRef = useRef(null);
    const cleanupInterceptorsRef = useRef(null);
    const logoutRef = useRef(null); // Mutable reference to the latest logout

    // ── Logout ──────────────────────────────────────────────────
    const logout = useCallback(() => {
        clearTokens();
        setUser(null);
        setError(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        try {
            const channel = new BroadcastChannel('auth_channel');
            channel.postMessage({ type: 'LOGOUT' });
            channel.close();
        } catch { /* Ignore */ }
    }, []);

    // Keep logoutRef synced with the latest logout
    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    // ── Check Auth (with race condition guard) ─────────────────
    const checkAuth = useCallback(async () => {
        const token = getStoredToken();
        if (!token) { setLoading(false); return; }

        let isCurrentRequest = true; // Local flag to prevent stale updates

        if (isTokenExpired(token)) {
            const refreshToken = getStoredRefreshToken();
            if (refreshToken) {
                try {
                    setIsRefreshingToken(true);
                    const response = await apiClient.post('/accounts/refresh-token/', { refresh: refreshToken });
                    storeTokens(response.data.access, response.data.refresh || refreshToken);
                } catch {
                    logout();
                    setLoading(false);
                    return;
                } finally {
                    setIsRefreshingToken(false);
                }
            } else {
                logout();
                setLoading(false);
                return;
            }
        }

        try {
            const response = await apiClient.get('/accounts/profile/');
            // Only update state if this request is the latest one
            if (!isCurrentRequest) return;
            const userData = response.data;
            setUser(userData);
            storeUser(userData);
        } catch (err) {
            console.error('Auth check failed:', err);
            if (err.response?.status === 401) logout();
        } finally {
            // Only set loading to false if this is the current request
            if (isCurrentRequest) setLoading(false);
        }

        // Cleanup: if component unmounts or a new checkAuth is called, cancel this one
        return () => { isCurrentRequest = false; };
    }, [logout]);

    // ── Auth Actions (unchanged except rely on updated helpers) ─
    const login = useCallback(async (phone, otp) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp });
            const { access, refresh, user: userData } = response.data;
            storeTokens(access, refresh);
            storeUser(userData);
            setUser(userData);
            try {
                const channel = new BroadcastChannel('auth_channel');
                channel.postMessage({ type: 'LOGIN' });
                channel.close();
            } catch { /* Ignore */ }
            return userData;
        } catch (err) {
            const message = err.response?.data?.error || err.response?.data?.message || 'Login failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    const requestOTP = useCallback(async (phone) => {
        setError(null);
        try {
            const response = await apiClient.post('/accounts/request-otp/', { phone_number: phone });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to send OTP.';
            setError(message);
            throw new Error(message);
        }
    }, []);

    const register = useCallback(async (userData) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/register/', userData);
            const { access, refresh, user: newUser } = response.data;
            if (access) {
                storeTokens(access, refresh);
                storeUser(newUser);
                setUser(newUser);
            }
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Registration failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (profileData) => {
        try {
            const response = await apiClient.patch('/accounts/profile/', profileData);
            const updatedUser = { ...user, ...response.data };
            setUser(updatedUser);
            storeUser(updatedUser);
            return updatedUser;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update profile.';
            throw new Error(message);
        }
    }, [user]);

    const updateUser = useCallback((newUserData) => {
        setUser((prevUser) => {
            const updated = { ...prevUser, ...newUserData };
            storeUser(updated);
            return updated;
        });
    }, []);

    const forgotPassword = useCallback(async (email) => {
        try {
            const response = await apiClient.post('/accounts/forgot-password/', { email });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to send reset email.';
            throw new Error(message);
        }
    }, []);

    const resetPassword = useCallback(async (token, newPassword) => {
        try {
            const response = await apiClient.post('/accounts/reset-password/', { token, password: newPassword });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to reset password.';
            throw new Error(message);
        }
    }, []);

    const enrollBiometric = useCallback(async (imageData) => {
        try {
            const response = await apiClient.post('/accounts/biometric/enroll/', { image_data: imageData });
            try {
                const { offlineStorage } = await import('../utils/storage');
                await offlineStorage.saveBiometricStatus({ enrolled: true });
            } catch (e) { console.error("Offline storage access failed:", e); }
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to enroll biometric data.';
            throw new Error(message);
        }
    }, []);

    const biometricLogin = useCallback(async (phone, imageData) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/biometric/login/', {
                phone_number: phone,
                image_data: imageData
            });
            const { access, refresh, user: userData } = response.data;
            storeTokens(access, refresh);
            storeUser(userData);
            setUser(userData);
            return userData;
        } catch (err) {
            const message = err.response?.data?.error || 'Biometric login failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    const refreshAuth = useCallback(async () => {
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');
        try {
            const response = await apiClient.post('/accounts/refresh-token/', { refresh: refreshToken });
            storeTokens(response.data.access, response.data.refresh || refreshToken);
            return response.data;
        } catch (err) {
            logout();
            throw err;
        }
    }, [logout]);

    // ── Role Helpers ────────────────────────────────────────────
    const isAdmin = user?.role === 'admin' || user?.is_superuser;
    const isTeacher = user?.role === 'teacher' || user?.role === 'faculty';
    const isStudent = user?.role === 'student';
    const isStudentLeader = user?.role === 'student_leader' || user?.role === 'faculty_rep';
    const isClassRep = user?.role === 'class_rep';

    const hasRole = useCallback(
        (...roles) => {
            if (!user) return false;
            if (isAdmin) return true;
            return roles.includes(user?.role);
        },
        [user, isAdmin]
    );

    const hasPermission = useCallback(
        (action, resource) => {
            if (!user) return false;
            if (isAdmin) return true;
            const permissions = user?.permissions || [];
            return permissions.some(
                (p) =>
                    (p.action === action || p.action === '*') &&
                    (p.resource === resource || p.resource === '*')
            );
        },
        [user, isAdmin]
    );

    // ── Initialize Auth (run once on mount) ────────────────────
    useEffect(() => {
        // Set up Axios interceptors with the mutable logout ref
        cleanupInterceptorsRef.current = setupAxiosInterceptors(logoutRef);
        // Run the initial authentication check
        checkAuth();

        return () => {
            if (cleanupInterceptorsRef.current) {
                cleanupInterceptorsRef.current();
            }
        };
    }, []); // empty dependencies → runs only on mount/unmount

    // ── Activity timer & broadcast channel (user‑aware) ─────────
    useEffect(() => {
        if (!user) return; // don't run timer for guests

        const resetIdleTimer = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                console.log('Session timed out due to inactivity');
                logout();
            }, SESSION_TIMEOUT);
        };

        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => window.addEventListener(event, resetIdleTimer));
        resetIdleTimer(); // start the timer immediately

        // BroadcastChannel for cross‑tab logout/login
        let authChannel;
        try {
            authChannel = new BroadcastChannel('auth_channel');
            authChannel.onmessage = (event) => {
                if (event.data.type === 'LOGOUT') logout();
                else if (event.data.type === 'LOGIN') checkAuth();
            };
        } catch { /* BroadcastChannel not supported */ }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            activityEvents.forEach(event =>
                window.removeEventListener(event, resetIdleTimer)
            );
            if (authChannel) authChannel.close();
        };
    }, [user, logout, checkAuth]); // re‑bind when user/logout/checkAuth change

    // ── Context Value ───────────────────────────────────────────
    const value = {
        user,
        loading,
        loginLoading,
        error,
        isRefreshingToken,
        isAuthenticated: !!user,
        isAdmin,
        isTeacher,
        isStudent,
        isStudentLeader,
        isClassRep,
        login,
        logout,
        requestOTP,
        register,
        updateProfile,
        updateUser,
        forgotPassword,
        resetPassword,
        refreshAuth,
        checkAuth,
        enrollBiometric,
        biometricLogin,
        hasRole,
        hasPermission,
        clearError: () => setError(null),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export default AuthContext;