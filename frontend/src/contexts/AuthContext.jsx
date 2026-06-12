import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';
import { accountsApi } from '../api/accountsApi';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_BUFFER = 60;

function getStoredToken() {
    try { return localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}
function getStoredRefreshToken() {
    try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}
function storeTokens(access, refresh) {
    try {
        if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    } catch { /* ignore */ }
}
function clearTokens() {
    try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('2fa_temp_token');
        localStorage.removeItem('2fa_phone');
    } catch { /* ignore */ }
}
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        return decoded.exp < now + TOKEN_REFRESH_BUFFER;
    } catch { return true; }
}
function getStoredUser() {
    try {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}
function storeUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRefreshingToken, setIsRefreshingToken] = useState(false);
    const idleTimerRef = useRef(null);
    const logoutRef = useRef(null);

    const logout = useCallback(() => {
        clearTokens();
        setUser(null);
        setError(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        try {
            const channel = new BroadcastChannel('auth_channel');
            channel.postMessage({ type: 'LOGOUT' });
            channel.close();
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    const checkAuth = useCallback(async () => {
        const token = getStoredToken();
        if (!token) { setLoading(false); return; }
        let isCurrent = true;
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
            if (!isCurrent) return;
            setUser(response.data);
            storeUser(response.data);
        } catch (err) {
            if (err.response?.status === 401) logout();
        } finally {
            if (isCurrent) setLoading(false);
        }
        return () => { isCurrent = false; };
    }, [logout]);

    const register = useCallback(async (userData) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/signup/', userData);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Registration failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    // ✅ FIXED: Proper OTP login with 2FA handling
    const login = useCallback(async (phone, otp) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp });
            const data = response.data;
            if (data.require_2fa) {
                localStorage.setItem('2fa_temp_token', data.temp_token);
                localStorage.setItem('2fa_phone', phone);
                return { require_2fa: true, temp_token: data.temp_token };
            }
            const { access, refresh, user: userData } = data;
            if (access) {
                storeTokens(access, refresh);
                storeUser(userData);
                setUser(userData);
            } else {
                throw new Error('Login succeeded but no token received.');
            }
            return userData;
        } catch (err) {
            const message = err.response?.data?.error || err.response?.data?.message || 'Login failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    // ✅ FIXED: Biometric login with proper token handling
    const biometricLogin = useCallback(async (phone, imageData) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/accounts/biometric/login/', {
                phone_number: phone,
                image_data: imageData
            });
            const data = response.data;

            // Handle 2FA challenge
            if (data.require_2fa) {
                localStorage.setItem('2fa_temp_token', data.temp_token);
                localStorage.setItem('2fa_phone', phone);
                return { require_2fa: true, temp_token: data.temp_token };
            }

            // Handle successful biometric login
            const { access, refresh, user: userData } = data;
            if (access) {
                storeTokens(access, refresh);
                storeUser(userData);
                setUser(userData);
                return userData;
            } else {
                throw new Error('Biometric login succeeded but no token received.');
            }
        } catch (err) {
            const message = err.response?.data?.error || 'Biometric login failed.';
            setError(message);
            throw new Error(message);
        } finally {
            setLoginLoading(false);
        }
    }, []);

    const verify2FALogin = useCallback(async (tempToken, code) => {
        setLoginLoading(true);
        try {
            const response = await apiClient.post('/accounts/2fa/verify-login/', { temp_token: tempToken, code: code });
            const { access, refresh, user: userData } = response.data;
            storeTokens(access, refresh);
            storeUser(userData);
            setUser(userData);
            localStorage.removeItem('2fa_temp_token');
            localStorage.removeItem('2fa_phone');
            return userData;
        } catch (err) {
            throw new Error(err.response?.data?.error || '2FA verification failed');
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

    const forgotPassword = useCallback(async (phone) => {
        try {
            const response = await apiClient.post('/accounts/forgot-password/', { phone_number: phone });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to send reset OTP.';
            throw new Error(message);
        }
    }, []);

    const resetPassword = useCallback(async (phone, otp, newPassword) => {
        try {
            const response = await apiClient.post('/accounts/reset-password/', {
                phone_number: phone,
                otp: otp,
                new_password: newPassword,
            });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to reset password.';
            throw new Error(message);
        }
    }, []);

    const changePassword = useCallback(async (oldPassword, newPassword) => {
        try {
            const response = await apiClient.post('/accounts/change-password/', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to change password.';
            throw new Error(message);
        }
    }, []);

    const updateProfile = useCallback(async (profileData) => {
        try {
            const response = await apiClient.put('/accounts/profile/', profileData);
            const updatedUser = response.data;
            setUser(updatedUser);
            storeUser(updatedUser);
            return updatedUser;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update profile.';
            throw new Error(message);
        }
    }, []);

    const updateUser = useCallback((newUserData) => {
        setUser((prev) => {
            const updated = { ...prev, ...newUserData };
            storeUser(updated);
            return updated;
        });
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

    // ✅ FIXED: Biometric enrollment with proper response handling
    const enrollBiometric = useCallback(async (imageData) => {
        try {
            const response = await apiClient.post('/accounts/biometric/enroll/', { image_data: imageData });
            updateUser({ biometric_enabled: true, face_data: imageData });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to enroll biometric.';
            throw new Error(message);
        }
    }, [updateUser]);

    // ✅ FIXED: Biometric disable with proper cleanup
    const disableBiometric = useCallback(async () => {
        try {
            const response = await apiClient.post('/accounts/biometric/disable/');
            updateUser({ biometric_enabled: false, face_data: '' });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to disable biometric.';
            throw new Error(message);
        }
    }, [updateUser]);

    const setup2FA = useCallback(async () => {
        const response = await accountsApi.setup2FA();
        return response.data;
    }, []);

    const verify2FASetup = useCallback(async (code) => {
        const response = await accountsApi.verify2FASetup(code);
        updateUser({ two_factor_enabled: true });
        return response.data;
    }, [updateUser]);

    const disable2FA = useCallback(async (code) => {
        const response = await accountsApi.disable2FA(code);
        updateUser({ two_factor_enabled: false });
        return response.data;
    }, [updateUser]);

    const get2FAStatus = useCallback(async () => {
        const response = await accountsApi.get2FAStatus();
        return response.data;
    }, []);

    // ✅ FIXED: Regenerate backup codes
    const regenerateBackupCodes = useCallback(async () => {
        const response = await apiClient.post('/accounts/2fa/regenerate-backup-codes/');
        return response.data;
    }, []);

    const isAdmin = user?.role === 'admin' || user?.is_superuser;
    const isTeacher = user?.role === 'teacher' || user?.role === 'faculty';
    const isStudent = user?.role === 'student';
    const isStudentLeader = user?.role === 'student_leader' || user?.role === 'faculty_rep';
    const isClassRep = user?.role === 'class_rep';

    const hasRole = useCallback((...roles) => {
        if (!user) return false;
        if (isAdmin) return true;
        return roles.includes(user?.role);
    }, [user, isAdmin]);

    const hasPermission = useCallback((action, resource) => {
        if (!user) return false;
        if (isAdmin) return true;
        const permissions = user?.permissions || [];
        return permissions.some(p => (p.action === action || p.action === '*') && (p.resource === resource || p.resource === '*'));
    }, [user, isAdmin]);

    // Restore session on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Idle session timeout
    useEffect(() => {
        if (!user) return;
        const resetIdleTimer = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => logout(), SESSION_TIMEOUT);
        };
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(ev => window.addEventListener(ev, resetIdleTimer));
        resetIdleTimer();
        let channel;
        try {
            channel = new BroadcastChannel('auth_channel');
            channel.onmessage = (event) => {
                if (event.data.type === 'LOGOUT') logout();
                else if (event.data.type === 'LOGIN') checkAuth();
            };
        } catch { /* ignore */ }
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
            if (channel) channel.close();
        };
    }, [user, logout, checkAuth]);

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
        disableBiometric,
        biometricLogin,
        changePassword,
        setup2FA,
        verify2FALogin,
        verify2FASetup,
        disable2FA,
        get2FAStatus,
        regenerateBackupCodes,
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