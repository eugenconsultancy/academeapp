import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiSmartphone, FiMonitor, FiTablet, FiX, FiShield,
    FiLogOut, FiHome, FiChevronRight, FiUser, FiSettings,
    FiRefreshCw, FiAlertCircle, FiClock, FiMapPin,
    FiCheckCircle, FiArrowLeft,
} from 'react-icons/fi';

const DEVICE_ICONS = {
    mobile: FiSmartphone,
    desktop: FiMonitor,
    tablet: FiTablet,
};

function getRelativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function SessionsPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revokingAll, setRevokingAll] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

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
        try {
            await accountsApi.revokeSession(sessionId);
            toast.success('Session revoked');
            fetchSessions();
        } catch (err) {
            toast.error('Failed to revoke session');
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAll = async () => {
        setRevokingAll(true);
        try {
            const result = await accountsApi.revokeAllSessions();
            toast.success(result?.message || result?.data?.message || 'All other sessions revoked');
            setShowRevokeAllModal(false);
            fetchSessions();
        } catch (err) {
            toast.error('Failed to revoke sessions');
        } finally {
            setRevokingAll(false);
        }
    };

    const getDeviceIcon = (deviceInfo) => {
        const type = deviceInfo?.device_type || (deviceInfo?.os?.toLowerCase().includes('android') || deviceInfo?.os?.toLowerCase().includes('ios') ? 'mobile' : 'desktop');
        return DEVICE_ICONS[type] || FiMonitor;
    };

    const currentSessionCount = sessions.filter(s => s.is_current).length;
    const otherSessionCount = sessions.filter(s => !s.is_current).length;

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto"><SkeletonLoader type="list" count={3} /></div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .ss-root { font-family: 'Outfit', sans-serif; max-width: 680px; margin: 0 auto; padding: 28px 20px 80px; animation: ssIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ssIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .ss-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .ss-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }

        .ss-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .ss-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .ss-header h1 { color: #f8fafc; }
        .ss-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .ss-btn:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .ss-btn { border-color: #334155; color: #94a3b8; }

        .ss-stats { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .ss-stat { padding: 6px 14px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.75); border: 1px solid rgba(0,0,0,0.05); color: #64748b; }
        .dark .ss-stat { background: rgba(15,23,42,0.75); border-color: rgba(255,255,255,0.05); color: #94a3b8; }

        .ss-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.82rem; font-weight: 600; }
        .ss-alert-info { background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.12); color: #6366f1; }
        .ss-alert-error { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.12); color: #dc2626; }

        .ss-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; margin-bottom: 8px; backdrop-filter: blur(12px); transition: all 0.2s; animation: ssIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .ss-card.current { border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.03); }
        .dark .ss-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .dark .ss-card.current { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.06); }
        .ss-card-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .ss-card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .ss-device-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ss-device-icon.current { background: rgba(99,102,241,0.1); color: #6366f1; }
        .ss-device-icon.other { background: rgba(0,0,0,0.04); color: #64748b; }
        .dark .ss-device-icon.other { background: rgba(255,255,255,0.05); color: #94a3b8; }
        .ss-card-info { min-width: 0; }
        .ss-card-name { font-size: 0.9rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px; }
        .dark .ss-card-name { color: #f8fafc; }
        .ss-card-badge { font-size: 0.6rem; padding: 2px 8px; border-radius: 99px; background: rgba(99,102,241,0.1); color: #6366f1; font-weight: 700; }
        .ss-card-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
        .ss-card-time { font-size: 0.7rem; color: #94a3b8; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
        .ss-revoke-btn { width: 34px; height: 34px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.15s; flex-shrink: 0; }
        .ss-revoke-btn:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .ss-revoke-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ss-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
        .ss-danger-zone { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.06); }
        .dark .ss-danger-zone { border-color: rgba(255,255,255,0.06); }
        .ss-btn-danger { background: #ef4444; color: #fff; border: none; width: 100%; padding: 14px; border-radius: 14px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .ss-btn-danger:hover { background: #dc2626; }
        .ss-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal */
        .ss-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ss-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .ss-modal { position: relative; z-index: 61; width: 100%; max-width: 400px; background: rgba(255,255,255,0.96); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: ssIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .ss-modal { background: rgba(12,16,24,0.96); }
        .ss-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .ss-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .ss-modal-title { color: #f8fafc; }
        .ss-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .ss-modal-body { padding: 20px 22px; font-size: 0.9rem; color: #64748b; }
        .ss-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .ss-modal-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; }
        .ss-modal-confirm { flex: 1; padding: 11px; border-radius: 12px; border: none; background: #ef4444; color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; }
      `}</style>

            <div className="ss-root">
                {/* Breadcrumb */}
                <nav className="ss-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/profile"><FiUser size={13} /> Profile</Link>
                    <FiChevronRight size={12} />
                    <span>Sessions</span>
                </nav>

                {/* Header */}
                <div className="ss-header">
                    <div>
                        <h1>Active Sessions</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Manage devices signed into your account
                        </p>
                    </div>
                    <button onClick={fetchSessions} className="ss-btn">
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                </div>

                {/* Stats */}
                {sessions.length > 0 && (
                    <div className="ss-stats">
                        <span className="ss-stat">📱 {sessions.length} Active</span>
                        <span className="ss-stat" style={{ color: '#6366f1' }}>✅ {currentSessionCount} This Device</span>
                        <span className="ss-stat" style={{ color: '#d97706' }}>🔒 {otherSessionCount} Other</span>
                    </div>
                )}

                {/* Current Session Info */}
                <div className="ss-alert ss-alert-info">
                    <FiShield size={16} />
                    <span>Your current session is highlighted below. Revoke any unrecognized sessions.</span>
                </div>

                {/* Error */}
                {error && (
                    <div className="ss-alert ss-alert-error">
                        <FiAlertCircle size={16} />
                        <span>{error}</span>
                        <button onClick={fetchSessions} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                            Retry
                        </button>
                    </div>
                )}

                {/* Sessions List */}
                {sessions.length > 0 ? (
                    <div>
                        {sessions.map((session, i) => {
                            const DeviceIcon = getDeviceIcon(session.device_info);
                            const isCurrent = session.is_current;
                            return (
                                <div key={session.id} className={`ss-card ${isCurrent ? 'current' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                                    <div className="ss-card-row">
                                        <div className="ss-card-left">
                                            <div className={`ss-device-icon ${isCurrent ? 'current' : 'other'}`}>
                                                <DeviceIcon size={20} />
                                            </div>
                                            <div className="ss-card-info">
                                                <div className="ss-card-name">
                                                    {session.browser || session.device_info?.browser || 'Unknown Browser'}
                                                    {isCurrent && <span className="ss-card-badge">Current</span>}
                                                </div>
                                                <div className="ss-card-meta">
                                                    {session.os || session.device_info?.os || 'Unknown OS'}
                                                    {session.ip_address && <> • {session.ip_address}</>}
                                                </div>
                                                <div className="ss-card-time">
                                                    <FiClock size={10} />
                                                    {session.last_used_at
                                                        ? `Active ${getRelativeTime(session.last_used_at)}`
                                                        : session.created_at
                                                            ? `Created ${getRelativeTime(session.created_at)}`
                                                            : 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                        {!isCurrent && (
                                            <button
                                                onClick={() => handleRevokeSession(session.id)}
                                                disabled={revokingId === session.id}
                                                className="ss-revoke-btn"
                                                title="Revoke session"
                                            >
                                                {revokingId === session.id ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <FiX size={16} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : !error ? (
                    <div className="ss-empty">
                        <FiMonitor size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ fontWeight: 600 }}>No active sessions found</p>
                        <p style={{ fontSize: '0.8rem', marginTop: 4 }}>This feature requires the sessions endpoint to be deployed.</p>
                    </div>
                ) : null}

                {/* Revoke All */}
                {otherSessionCount > 0 && (
                    <div className="ss-danger-zone">
                        <button
                            onClick={() => setShowRevokeAllModal(true)}
                            disabled={revokingAll}
                            className="ss-btn-danger"
                        >
                            <FiLogOut size={18} />
                            {revokingAll ? 'Revoking...' : `Sign Out Everywhere Else (${otherSessionCount} device${otherSessionCount > 1 ? 's' : ''})`}
                        </button>
                    </div>
                )}
            </div>

            {/* Revoke All Confirmation Modal */}
            {showRevokeAllModal && (
                <div className="ss-modal-overlay">
                    <div className="ss-modal-backdrop" onClick={() => setShowRevokeAllModal(false)} />
                    <div className="ss-modal">
                        <div className="ss-modal-header">
                            <span className="ss-modal-title">Sign Out Everywhere Else</span>
                            <button className="ss-modal-close" onClick={() => setShowRevokeAllModal(false)}><FiX size={16} /></button>
                        </div>
                        <div className="ss-modal-body">
                            <p>This will sign you out of <strong>{otherSessionCount} other device{otherSessionCount > 1 ? 's' : ''}</strong>. Your current session will remain active.</p>
                        </div>
                        <div className="ss-modal-footer">
                            <button className="ss-modal-cancel" onClick={() => setShowRevokeAllModal(false)}>Cancel</button>
                            <button className="ss-modal-confirm" onClick={handleRevokeAll} disabled={revokingAll}>
                                {revokingAll ? 'Revoking...' : 'Sign Out All Others'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}