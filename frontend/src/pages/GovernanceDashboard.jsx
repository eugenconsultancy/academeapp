import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiUsers, FiActivity, FiClock, FiAlertTriangle, FiBarChart2,
    FiBell, FiHome, FiChevronRight, FiRefreshCw, FiArrowLeft,
    FiPackage, FiCheckCircle, FiFlag, FiBriefcase, FiTrendingUp,
    FiTrendingDown, FiSettings, FiEye, FiUserPlus, FiShield,
} from 'react-icons/fi';

export default function GovernanceDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expiringRoles, setExpiringRoles] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchStats(), fetchExpiringRoles(), fetchRecentActivity()]);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to load some data');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/governance/stats/');
            setStats(response.data);
        } catch (err) {
            console.error('Failed to load stats');
        }
    };

    const fetchExpiringRoles = async () => {
        try {
            const response = await apiClient.get('/governance/roles/expiring/');
            setExpiringRoles(response.data || []);
        } catch (err) {
            console.error('Failed to load expiring roles');
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const response = await apiClient.get('/governance/audit-logs/recent/', { params: { limit: 5 } });
            setRecentActivity(response.data || []);
        } catch (err) {
            console.error('Failed to load recent activity');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-5xl mx-auto"><SkeletonLoader type="page" /></div>
            </div>
        );
    }

    const statCards = [
        { label: 'Active Roles', value: stats?.active_roles || 0, icon: FiShield, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
        { label: 'Students', value: stats?.students_count || 0, icon: FiUsers, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
        { label: 'Announcements', value: stats?.announcements_count || 0, icon: FiBell, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
        { label: 'Found Items', value: stats?.found_items_count || 0, icon: FiPackage, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        { label: 'Active Claims', value: stats?.total_claims || 0, icon: FiCheckCircle, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
        { label: 'Reports', value: stats?.total_reports || 0, icon: FiFlag, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        { label: 'Opportunities', value: stats?.opportunities_count || 0, icon: FiBriefcase, color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
        { label: 'Resolved Claims', value: stats?.resolved_claims || 0, icon: FiCheckCircle, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
    ];

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .gd-root { font-family: 'Outfit', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; animation: gdIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes gdIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .gd-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .gd-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .gd-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .gd-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .gd-header h1 { color: #f8fafc; }
        .gd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .gd-btn:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .gd-btn { border-color: #334155; color: #94a3b8; }

        .gd-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 24px; }
        .gd-stat { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; backdrop-filter: blur(12px); transition: all 0.2s; }
        .gd-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .dark .gd-stat { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .gd-stat-value { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.03em; }
        .gd-stat-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; }

        .gd-alert { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 14px; margin-bottom: 20px; font-size: 0.84rem; font-weight: 600; }
        .gd-alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #d97706; }
        .gd-alert-success { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); color: #059669; }

        .gd-section { margin-bottom: 24px; }
        .gd-section-title { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .dark .gd-section-title { color: #f8fafc; }

        .gd-activity-list { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; overflow: hidden; backdrop-filter: blur(12px); }
        .dark .gd-activity-list { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .gd-activity-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 0.82rem; }
        .dark .gd-activity-item { border-color: rgba(255,255,255,0.04); }
        .gd-activity-item:last-child { border-bottom: none; }
        .gd-activity-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .gd-activity-text { flex: 1; color: #374151; }
        .dark .gd-activity-text { color: #d1d5db; }
        .gd-activity-time { font-size: 0.7rem; color: #94a3b8; flex-shrink: 0; }

        .gd-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .gd-link { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; text-decoration: none; backdrop-filter: blur(12px); transition: all 0.2s; display: flex; align-items: flex-start; gap: 12px; }
        .gd-link:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .dark .gd-link { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .gd-link-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .gd-link-title { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
        .dark .gd-link-title { color: #f8fafc; }
        .gd-link-desc { font-size: 0.72rem; color: #94a3b8; margin-top: 3px; }

        .gd-empty { text-align: center; padding: 32px; color: #94a3b8; font-size: 0.85rem; }
        .gd-updated { font-size: 0.7rem; color: #94a3b8; margin-top: 8px; }
      `}</style>

            <div className="gd-root">
                {/* Breadcrumb */}
                <nav className="gd-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    {user?.role === 'admin' && <><Link to="/admin"><FiSettings size={13} /> Admin</Link><FiChevronRight size={12} /></>}
                    <span>Governance</span>
                </nav>

                {/* Header */}
                <div className="gd-header">
                    <div>
                        <h1>Governance Dashboard</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Overview of student leadership and platform activity
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={user?.role === 'admin' ? '/admin' : '/'} className="gd-btn">
                            <FiArrowLeft size={14} /> Back
                        </Link>
                        <button onClick={fetchAll} className="gd-btn">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Last Updated */}
                {lastUpdated && (
                    <p className="gd-updated">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="gd-alert gd-alert-warning">
                        <FiAlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="gd-stats">
                    {statCards.map((card) => (
                        <div key={card.label} className="gd-stat">
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <card.icon size={16} style={{ color: card.color }} />
                            </div>
                            <div className="gd-stat-value" style={{ color: card.color }}>{card.value}</div>
                            <div className="gd-stat-label" style={{ color: '#94a3b8' }}>{card.label}</div>
                        </div>
                    ))}
                </div>

                {/* Expiring Roles */}
                <div className="gd-section">
                    <h2 className="gd-section-title"><FiAlertTriangle size={16} style={{ color: '#d97706' }} /> Expiring Roles</h2>
                    {expiringRoles.length > 0 ? (
                        <div className="gd-alert gd-alert-warning">
                            <div style={{ flex: 1 }}>
                                {expiringRoles.slice(0, 5).map((role) => (
                                    <p key={role.id} style={{ marginBottom: 4 }}>
                                        <strong>{role.user_name}</strong> — {role.role?.replace(/_/g, ' ')} expires {new Date(role.end_date).toLocaleDateString()}
                                        <span style={{ marginLeft: 8, fontSize: '0.75rem' }}>({role.days_remaining}d left)</span>
                                    </p>
                                ))}
                                {expiringRoles.length > 5 && <p style={{ fontSize: '0.75rem' }}>+{expiringRoles.length - 5} more</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="gd-alert gd-alert-success">
                            <FiCheckCircle size={16} /> All roles are current — no expiring roles.
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="gd-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 className="gd-section-title" style={{ marginBottom: 0 }}><FiActivity size={16} style={{ color: '#6366f1' }} /> Recent Activity</h2>
                        <Link to="/admin/audit-logs" className="gd-btn">View All</Link>
                    </div>
                    {recentActivity.length > 0 ? (
                        <div className="gd-activity-list">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="gd-activity-item">
                                    <div className="gd-activity-icon" style={{ background: activity.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.06)' }}>
                                        <FiActivity size={14} style={{ color: activity.severity === 'critical' ? '#ef4444' : '#6366f1' }} />
                                    </div>
                                    <span className="gd-activity-text">
                                        <strong>{activity.performed_by || 'System'}</strong> — {activity.action_display || activity.action}
                                        {activity.target_user && <> → {activity.target_user}</>}
                                    </span>
                                    <span className="gd-activity-time">
                                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="gd-empty">No recent activity</div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="gd-section">
                    <h2 className="gd-section-title"><FiEye size={16} style={{ color: '#6366f1' }} /> Quick Actions</h2>
                    <div className="gd-links">
                        <Link to="/admin/roles" className="gd-link">
                            <div className="gd-link-icon" style={{ background: 'rgba(99,102,241,0.08)' }}><FiUserPlus size={18} style={{ color: '#6366f1' }} /></div>
                            <div><div className="gd-link-title">Role Management</div><div className="gd-link-desc">Assign & revoke leadership roles</div></div>
                        </Link>
                        <Link to="/admin/audit-logs" className="gd-link">
                            <div className="gd-link-icon" style={{ background: 'rgba(16,185,129,0.08)' }}><FiActivity size={18} style={{ color: '#10b981' }} /></div>
                            <div><div className="gd-link-title">Audit Logs</div><div className="gd-link-desc">View all governance actions</div></div>
                        </Link>
                        <Link to="/governance/stats" className="gd-link">
                            <div className="gd-link-icon" style={{ background: 'rgba(139,92,246,0.08)' }}><FiBarChart2 size={18} style={{ color: '#8b5cf6' }} /></div>
                            <div><div className="gd-link-title">Platform Statistics</div><div className="gd-link-desc">Detailed metrics & trends</div></div>
                        </Link>
                        <Link to="/admin/reports" className="gd-link">
                            <div className="gd-link-icon" style={{ background: 'rgba(239,68,68,0.08)' }}><FiFlag size={18} style={{ color: '#ef4444' }} /></div>
                            <div><div className="gd-link-title">Content Reports</div><div className="gd-link-desc">Review reported content</div></div>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}