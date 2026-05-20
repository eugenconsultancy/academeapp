import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { foundItemsApi } from '../api/foundItemsApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import {
    FiPackage, FiClock, FiCheckCircle, FiXCircle, FiDollarSign,
    FiChevronRight, FiRefreshCw, FiAlertCircle, FiHome,
    FiFilter, FiSearch, FiInbox,
} from 'react-icons/fi';

const STATUS_STYLES = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    verified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    awaiting_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    payment_received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    claimed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    disputed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_ICONS = {
    pending: FiClock,
    ownership_verified: FiCheckCircle,
    security_verified: FiCheckCircle,
    payment_pending: FiDollarSign,
    payment_received: FiDollarSign,
    approved: FiCheckCircle,
    rejected: FiXCircle,
    completed: FiCheckCircle,
};

export default function ClaimListPage() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { fetchClaims(); }, []);

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await foundItemsApi.listClaims();
            setClaims(Array.isArray(data) ? data : data.data || data.results || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load claims');
        } finally {
            setLoading(false);
        }
    };

    const filteredClaims = statusFilter === 'all'
        ? claims
        : claims.filter(c => c.status === statusFilter);

    const stats = {
        total: claims.length,
        pending: claims.filter(c => ['pending', 'ownership_verified', 'security_verified'].includes(c.status)).length,
        completed: claims.filter(c => c.status === 'completed').length,
        rejected: claims.filter(c => c.status === 'rejected').length,
    };

    const getRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    if (loading) return <SkeletonLoader type="list" count={3} />;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .cl-root { font-family: 'Outfit', sans-serif; max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; animation: clIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes clIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .cl-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .cl-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .cl-header h1 { color: #f8fafc; }
        .cl-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
        .cl-btn:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .cl-btn { border-color: #334155; color: #94a3b8; }

        .cl-stats { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .cl-stat { padding: 6px 14px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.75); border: 1px solid rgba(0,0,0,0.05); color: #64748b; }
        .dark .cl-stat { background: rgba(15,23,42,0.75); border-color: rgba(255,255,255,0.05); color: #94a3b8; }

        .cl-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .cl-filter { padding: 7px 14px; border-radius: 99px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.76rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .cl-filter.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .cl-filter:hover:not(.active) { background: rgba(99,102,241,0.04); }
        .dark .cl-filter { border-color: #334155; color: #94a3b8; }

        .cl-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; margin-bottom: 8px; text-decoration: none; backdrop-filter: blur(12px); transition: all 0.2s; animation: clIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .cl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .dark .cl-card { background: rgba(12,16,24,0.85); border-color: rgba(255,255,255,0.05); }
        .cl-card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .cl-status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 99px; font-size: 0.68rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .cl-card-info { min-width: 0; }
        .cl-card-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
        .dark .cl-card-title { color: #f8fafc; }
        .cl-card-date { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }

        .cl-empty { text-align: center; padding: 64px 24px; }
        .cl-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }

        .cl-error { text-align: center; padding: 40px 20px; }
      `}</style>

            <div className="cl-root">
                {/* Header */}
                <div className="cl-header">
                    <h1>My Claims</h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={fetchClaims} className="cl-btn"><FiRefreshCw size={14} /> Refresh</button>
                        <Link to="/found-items" className="cl-btn"><FiPackage size={14} /> Browse Items</Link>
                    </div>
                </div>

                {/* Stats */}
                {claims.length > 0 && (
                    <div className="cl-stats">
                        <span className="cl-stat">📋 {stats.total} Total</span>
                        <span className="cl-stat" style={{ color: '#d97706' }}>⏳ {stats.pending} Active</span>
                        <span className="cl-stat" style={{ color: '#059669' }}>✅ {stats.completed} Done</span>
                        {stats.rejected > 0 && <span className="cl-stat" style={{ color: '#dc2626' }}>❌ {stats.rejected} Rejected</span>}
                    </div>
                )}

                {/* Filters */}
                <div className="cl-filters">
                    {['all', 'pending', 'ownership_verified', 'payment_pending', 'payment_received', 'completed', 'rejected'].map(f => (
                        <button key={f} className={`cl-filter ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
                            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="cl-error">
                        <FiAlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
                        <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>{error}</p>
                        <button onClick={fetchClaims} className="cl-btn" style={{ color: '#6366f1', borderColor: '#6366f1' }}>
                            <FiRefreshCw size={14} /> Try Again
                        </button>
                    </div>
                )}

                {/* Claims List */}
                {!error && filteredClaims.length > 0 && (
                    <div>
                        {filteredClaims.map((claim, i) => {
                            const StatusIcon = STATUS_ICONS[claim.status] || FiClock;
                            return (
                                <Link
                                    key={claim.id}
                                    to={`/found-items/${claim.item_id}/claim`}
                                    className="cl-card"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <div className="cl-card-left">
                                        <span className={`cl-status-badge ${STATUS_STYLES[claim.status] || STATUS_STYLES.pending}`}>
                                            <StatusIcon size={11} />
                                            {claim.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                        <div className="cl-card-info">
                                            <p className="cl-card-title">{claim.item_title || 'Untitled Item'}</p>
                                            <p className="cl-card-date">{getRelativeTime(claim.created_at)}</p>
                                        </div>
                                    </div>
                                    <FiChevronRight size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Empty */}
                {!error && !loading && claims.length === 0 && (
                    <div className="cl-empty">
                        <div className="cl-empty-icon">📋</div>
                        <h3 style={{ fontWeight: 700, color: '#64748b', marginBottom: 8 }}>No claims yet</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>You haven't claimed any found items yet.</p>
                        <Link to="/found-items" className="cl-btn" style={{ color: '#6366f1', borderColor: '#6366f1', display: 'inline-flex', padding: '10px 20px' }}>
                            <FiPackage size={14} /> Browse Found Items
                        </Link>
                    </div>
                )}

                {/* No results for filter */}
                {!error && claims.length > 0 && filteredClaims.length === 0 && (
                    <div className="cl-empty">
                        <div className="cl-empty-icon">🔍</div>
                        <p style={{ fontWeight: 600, color: '#64748b' }}>No claims match this filter</p>
                    </div>
                )}
            </div>
        </>
    );
}