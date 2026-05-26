import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiSmartphone, FiMonitor, FiTablet, FiX, FiShield,
    FiLogOut, FiHome, FiChevronRight, FiUser,
    FiRefreshCw, FiAlertCircle, FiClock, FiMapPin,
    FiCheckCircle, FiSearch, FiDownload, FiChevronDown,
    FiChevronUp, FiStar
} from 'react-icons/fi';

const DEVICE_ICONS = {
    mobile: FiSmartphone,
    desktop: FiMonitor,
    tablet: FiTablet,
};

export default function SessionsPage() {
    const { user } = useAuth();                 // from context (may be stale)
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revokingAll, setRevokingAll] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);
    const [trustedDevices, setTrustedDevices] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('trusted_devices') || '[]');
        } catch {
            return [];
        }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    // Fetch current 2FA status from backend on mount
    useEffect(() => {
        (async () => {
            try {
                setProfileLoading(true);
                const response = await accountsApi.getProfile();
                const profile = response.data || response;
                setTwoFactorEnabled(profile.two_factor_enabled || false);
            } catch (err) {
                toast.error('Could not load security settings');
            } finally {
                setProfileLoading(false);
            }
        })();
    }, []);

    // Fetch sessions
    useEffect(() => { fetchSessions(); }, []);

    const fetchSessions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await accountsApi.listSessions();
            const data = Array.isArray(response) ? response : response?.data || response?.results || [];
            setSessions(data);
        } catch (err) {
            setError('Failed to load sessions. The endpoint may not be available yet.');
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        setRevokingId(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        try {
            await accountsApi.revokeSession(sessionId);
            toast.success('Session revoked');
        } catch (err) {
            fetchSessions();
            toast.error('Failed to revoke session');
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAll = async () => {
        setRevokingAll(true);
        setSessions(prev => prev.filter(s => s.is_current));
        try {
            const result = await accountsApi.revokeAllSessions();
            toast.success(result?.message || result?.data?.message || 'All other sessions revoked');
            setShowRevokeAllModal(false);
        } catch (err) {
            fetchSessions();
            toast.error('Failed to revoke sessions');
        } finally {
            setRevokingAll(false);
        }
    };

    const getDeviceIcon = (deviceInfo) => {
        const type = deviceInfo?.device_type ||
            (deviceInfo?.os?.toLowerCase().includes('android') || deviceInfo?.os?.toLowerCase().includes('ios') ? 'mobile' : 'desktop');
        return DEVICE_ICONS[type] || FiMonitor;
    };

    const toggleSessionDetails = (sessionId) => {
        setExpandedSession(expandedSession === sessionId ? null : sessionId);
    };

    const toggleTrustedDevice = (sessionId) => {
        setTrustedDevices(prev => {
            const updated = prev.includes(sessionId)
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId];
            localStorage.setItem('trusted_devices', JSON.stringify(updated));
            return updated;
        });
    };

    const isSuspiciousSession = (session) => {
        if (session.is_current) return false;
        if (!session.created_at) return false;
        const hoursSinceCreation = (Date.now() - new Date(session.created_at).getTime()) / 3600000;
        return hoursSinceCreation < 1;
    };

    const relativeTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return dateStr;
        }
    };

    const exportSessions = () => {
        const data = sessions.map(s => ({
            id: s.id,
            browser: s.browser || s.device_info?.browser,
            os: s.os || s.device_info?.os,
            ip_address: s.ip_address,
            city: s.city,
            country: s.country,
            user_agent: s.user_agent?.substring(0, 100),
            created_at: s.created_at,
            last_used_at: s.last_used_at,
            expires_at: s.expires_at,
            is_current: s.is_current,
            trusted: trustedDevices.includes(s.id),
            suspicious: isSuspiciousSession(s),
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sessions-export.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Sessions exported');
    };

    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        const query = searchQuery.toLowerCase();
        return sessions.filter(s =>
            (s.browser || s.device_info?.browser || '').toLowerCase().includes(query) ||
            (s.os || s.device_info?.os || '').toLowerCase().includes(query) ||
            (s.ip_address || '').toLowerCase().includes(query) ||
            (s.city || '').toLowerCase().includes(query) ||
            (s.country || '').toLowerCase().includes(query)
        );
    }, [sessions, searchQuery]);

    const currentSessionCount = sessions.filter(s => s.is_current).length;
    const otherSessionCount = sessions.filter(s => !s.is_current).length;

    if (loading || profileLoading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <SkeletonLoader type="list" count={3} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8 animate-fadeIn">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500 mb-6 flex-wrap" aria-label="Breadcrumb">
                <Link to="/" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1.5">
                    <FiHome size={14} /> Home
                </Link>
                <FiChevronRight size={14} />
                <Link to="/profile" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1.5">
                    <FiUser size={14} /> Profile
                </Link>
                <FiChevronRight size={14} />
                <span className="text-gray-900 dark:text-white">Sessions</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                        Active Sessions
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Manage devices signed into your account
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSessions}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Refresh sessions"
                    >
                        <FiRefreshCw size={16} /> Refresh
                    </button>
                    <button
                        onClick={exportSessions}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Export session data"
                    >
                        <FiDownload size={16} /> Export
                    </button>
                </div>
            </div>

            {/* Stats */}
            {sessions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                        📱 {sessions.length} Active
                    </span>
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                        ✅ {currentSessionCount} This Device
                    </span>
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                        🔒 {otherSessionCount} Other
                    </span>
                </div>
            )}

            {/* 2FA Status Section – now accurate and linked correctly */}
            <div className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {twoFactorEnabled ? 'Enabled – Your account is more secure' : 'Add an extra layer of security'}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/profile/2fa"
                        className="px-4 py-2 text-sm font-semibold border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {twoFactorEnabled ? 'Manage' : 'Enable'}
                    </Link>
                </div>
            </div>

            {/* Rest of the component (search, list, modals) remains unchanged */}
            {/* Search */}
            {sessions.length > 1 && (
                <div className="relative mb-6">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by browser, OS, IP or location…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                        aria-label="Search sessions"
                    />
                </div>
            )}

            {/* Info Alert */}
            <div className="flex items-center gap-3 p-4 mb-6 bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                <FiShield size={18} className="flex-shrink-0" />
                <span>Your current session is highlighted. Revoke any unrecognized sessions immediately.</span>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50/70 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400">
                    <FiAlertCircle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={fetchSessions}
                        className="ml-auto text-red-700 dark:text-red-400 font-bold underline hover:no-underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Sessions List */}
            {filteredSessions.length > 0 ? (
                <ul className="space-y-3" role="list">
                    {filteredSessions.map((session) => {
                        const DeviceIcon = getDeviceIcon(session.device_info);
                        const isCurrent = session.is_current;
                        const isTrusted = trustedDevices.includes(session.id);
                        const suspicious = isSuspiciousSession(session);
                        const isExpanded = expandedSession === session.id;

                        return (
                            <li
                                key={session.id}
                                className={`group bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-200 ${isCurrent
                                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'
                                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                                    }`}
                            >
                                {/* Session content same as original */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent
                                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                }`}
                                            aria-hidden="true"
                                        >
                                            <DeviceIcon size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                                    {session.browser || session.device_info?.browser || 'Unknown Browser'}
                                                </span>
                                                {isCurrent && (
                                                    <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                                                        Current
                                                    </span>
                                                )}
                                                {suspicious && (
                                                    <span
                                                        className="px-2 py-0.5 text-[0.65rem] font-bold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center gap-1"
                                                        title="New sign-in detected"
                                                    >
                                                        <FiAlertCircle size={10} /> New
                                                    </span>
                                                )}
                                                {isTrusted && (
                                                    <span className="text-emerald-500 dark:text-emerald-400" title="Trusted device">
                                                        <FiStar size={14} className="fill-current" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {session.os || session.device_info?.os || 'Unknown OS'}
                                                {session.ip_address && (
                                                    <>
                                                        {' • '}
                                                        {session.ip_address}
                                                        {(session.city || session.country) && (
                                                            <span className="ml-1">
                                                                ({[session.city, session.country].filter(Boolean).join(', ')})
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                <FiClock size={11} />
                                                {session.last_used_at
                                                    ? `Active ${relativeTime(session.last_used_at)}`
                                                    : session.created_at
                                                        ? `Created ${relativeTime(session.created_at)}`
                                                        : 'Unknown'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {!isCurrent && (
                                            <button
                                                onClick={() => toggleTrustedDevice(session.id)}
                                                className={`p-2 rounded-lg text-sm transition-colors ${isTrusted
                                                    ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-500'
                                                    }`}
                                                aria-label={isTrusted ? 'Remove from trusted devices' : 'Mark as trusted device'}
                                                title={isTrusted ? 'Trusted' : 'Trust this device'}
                                            >
                                                <FiStar size={16} className={isTrusted ? 'fill-current' : ''} />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => toggleSessionDetails(session.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            aria-expanded={isExpanded}
                                            aria-label="Toggle session details"
                                        >
                                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                        </button>

                                        {!isCurrent && (
                                            <button
                                                onClick={() => handleRevokeSession(session.id)}
                                                disabled={revokingId === session.id}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                aria-label="Revoke session"
                                            >
                                                {revokingId === session.id ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <FiX size={16} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">IP Address</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">{session.ip_address || 'N/A'}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">Location</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">
                                                    {session.city && session.country
                                                        ? `${session.city}, ${session.country}`
                                                        : session.city || session.country || 'Unknown'}
                                                </dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">User Agent</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5 break-all">
                                                    {session.user_agent?.substring(0, 100) || 'N/A'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">Created</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">
                                                    {session.created_at ? new Date(session.created_at).toLocaleString() : 'N/A'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">Last Active</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">
                                                    {session.last_used_at ? new Date(session.last_used_at).toLocaleString() : 'N/A'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">Expires</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">
                                                    {session.expires_at ? new Date(session.expires_at).toLocaleString() : 'Session-based'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold text-gray-500 dark:text-gray-400">Trusted</dt>
                                                <dd className="text-gray-900 dark:text-white mt-0.5">
                                                    {isTrusted ? 'Yes' : 'No'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-16 px-4">
                    <FiMonitor className="mx-auto text-gray-300 dark:text-gray-600" size={48} />
                    <h3 className="mt-4 text-lg font-bold text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No matching sessions found' : 'No active sessions'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                        {searchQuery
                            ? 'Try a different search term.'
                            : 'Sessions from other devices will appear here once you sign in.'}
                    </p>
                </div>
            )}

            {/* Revoke All */}
            {otherSessionCount > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowRevokeAllModal(true)}
                        disabled={revokingAll}
                        className="w-full py-3.5 px-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiLogOut size={18} />
                        {revokingAll
                            ? 'Revoking…'
                            : `Sign Out Everywhere Else (${otherSessionCount} device${otherSessionCount > 1 ? 's' : ''})`}
                    </button>
                </div>
            )}

            {/* Revoke All Modal */}
            {showRevokeAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowRevokeAllModal(false)}
                    />
                    <div className="relative z-50 w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-2xl animate-scaleIn">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Sign Out Everywhere Else</h2>
                            <button
                                onClick={() => setShowRevokeAllModal(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                aria-label="Close modal"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                This will sign you out of <strong>{otherSessionCount} other device{otherSessionCount > 1 ? 's' : ''}</strong>. Your current session will remain active.
                            </p>
                        </div>
                        <div className="flex gap-3 p-5 pt-0">
                            <button
                                onClick={() => setShowRevokeAllModal(false)}
                                className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRevokeAll}
                                disabled={revokingAll}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                {revokingAll ? 'Revoking…' : 'Sign Out All Others'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}