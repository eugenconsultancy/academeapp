import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiUserPlus, FiClock, FiAlertTriangle, FiCheckCircle,
    FiXCircle, FiSearch, FiHome, FiChevronRight, FiSettings,
    FiRefreshCw, FiArrowLeft, FiUsers, FiShield, FiCalendar,
    FiFilter, FiX, FiEye, FiTrash2,
} from 'react-icons/fi';

export default function AdminRolesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roles, setRoles] = useState([]);
    const [expiringRoles, setExpiringRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const [searchUser, setSearchUser] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(null);
    const [assignForm, setAssignForm] = useState({
        user_id: '', role: 'class_rep', scope_id: '', scope_name: '',
        scope_type: 'class', start_date: '', end_date: '',
    });
    const [assigning, setAssigning] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [userSearching, setUserSearching] = useState(false);

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/'); return; }
        fetchRoles();
        fetchExpiringRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/governance/roles/history/', {
                params: { status: activeTab, search: searchUser || undefined }
            });
            let data = response.data.results || response.data || [];
            if (roleFilter !== 'all') data = data.filter(r => r.role === roleFilter);
            setRoles(data);
        } catch (err) {
            toast.error('Failed to load roles');
        } finally {
            setLoading(false);
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

    useEffect(() => { fetchRoles(); }, [activeTab, searchUser, roleFilter]);

    // Search users for assignment
    const handleUserSearch = async (query) => {
        setAssignForm({ ...assignForm, user_id: query });
        if (query.length < 2) { setUserSearchResults([]); return; }
        setUserSearching(true);
        try {
            const res = await apiClient.get('/accounts/students/search/', { params: { q: query } });
            setUserSearchResults(res.data || []);
        } catch { setUserSearchResults([]); }
        finally { setUserSearching(false); }
    };

    const selectUser = (u) => {
        setAssignForm({ ...assignForm, user_id: u.id, scope_name: u.full_name });
        setUserSearchResults([]);
    };

    const handleAssignRole = async () => {
        if (!assignForm.user_id || !assignForm.scope_id || !assignForm.start_date || !assignForm.end_date) {
            toast.error('Please fill all required fields');
            return;
        }
        setAssigning(true);
        try {
            await apiClient.post('/accounts/roles/assign/', assignForm);
            toast.success('Role assigned successfully!');
            setShowAssignModal(false);
            setAssignForm({ user_id: '', role: 'class_rep', scope_id: '', scope_name: '', scope_type: 'class', start_date: '', end_date: '' });
            fetchRoles();
            fetchExpiringRoles();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign role');
        } finally {
            setAssigning(false);
        }
    };

    const handleRevokeRole = async (roleId) => {
        try {
            await apiClient.post(`/accounts/roles/${roleId}/revoke/`, { reason: 'Manually revoked by admin' });
            toast.success('Role revoked');
            setShowRevokeConfirm(null);
            fetchRoles();
            fetchExpiringRoles();
        } catch (err) {
            toast.error('Failed to revoke role');
        }
    };

    const stats = {
        active: roles.filter(r => r.is_active !== false).length,
        expiring: expiringRoles.length,
        total: roles.length,
    };

    if (loading) return <SkeletonLoader type="list" count={5} />;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .ar-root { font-family: 'Outfit', sans-serif; max-width: 900px; margin: 0 auto; padding: 28px 20px 80px; animation: arIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes arIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .ar-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .ar-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .ar-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .ar-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .ar-header h1 { color: #f8fafc; }
        .ar-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .ar-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .ar-btn-primary:hover { background: #4f46e5; }
        .ar-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .ar-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .ar-btn-outline { border-color: #334155; color: #94a3b8; }

        .ar-stats { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .ar-stat { padding: 8px 16px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.75); border: 1px solid rgba(0,0,0,0.05); color: #64748b; }
        .dark .ar-stat { background: rgba(15,23,42,0.75); border-color: rgba(255,255,255,0.05); color: #94a3b8; }

        .ar-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; margin-bottom: 16px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #d97706; font-size: 0.84rem; font-weight: 600; }
        .dark .ar-alert { background: rgba(245,158,11,0.12); }

        .ar-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .ar-search { flex: 1; min-width: 180px; padding: 9px 14px 9px 36px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; outline: none; }
        .ar-search:focus { border-color: #6366f1; }
        .dark .ar-search { background: rgba(15,23,42,0.8); border-color: #334155; color: #f8fafc; }
        .ar-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .ar-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .ar-select { padding: 9px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .ar-select { background: rgba(15,23,42,0.8); border-color: #334155; color: #94a3b8; }

        .ar-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
        .ar-tab { padding: 8px 16px; border-radius: 99px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .ar-tab.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .ar-tab:hover:not(.active) { background: rgba(99,102,241,0.04); }
        .dark .ar-tab { border-color: #334155; color: #94a3b8; }

        .ar-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 16px; margin-bottom: 8px; backdrop-filter: blur(12px); transition: all 0.2s; }
        .ar-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .dark .ar-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .ar-card-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ar-card-info { flex: 1; min-width: 0; }
        .ar-card-name { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
        .dark .ar-card-name { color: #f8fafc; }
        .ar-card-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
        .ar-card-dates { font-size: 0.7rem; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .ar-badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 700; margin-right: 6px; }
        .ar-badge-blue { background: rgba(99,102,241,0.1); color: #6366f1; }
        .ar-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .ar-dot-green { background: #10b981; }
        .ar-dot-red { background: #ef4444; }

        .ar-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ar-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .ar-modal { position: relative; z-index: 61; width: 100%; max-width: 500px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: arIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .ar-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .ar-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .ar-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .ar-modal-title { color: #f8fafc; }
        .ar-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .ar-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
        .ar-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .ar-input { width: 100%; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.87rem; outline: none; }
        .ar-input:focus { border-color: #6366f1; }
        .dark .ar-input { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }
        .ar-user-dropdown { max-height: 150px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 4px; }
        .ar-user-item { padding: 8px 12px; cursor: pointer; font-size: 0.82rem; }
        .ar-user-item:hover { background: rgba(99,102,241,0.06); }
        .ar-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
      `}</style>

            <div className="ar-root">
                {/* Breadcrumb */}
                <nav className="ar-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/admin"><FiSettings size={13} /> Admin</Link>
                    <FiChevronRight size={12} />
                    <span>Roles</span>
                </nav>

                {/* Header */}
                <div className="ar-header">
                    <div>
                        <h1>Role Management</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Manage student leadership roles and assignments
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { fetchRoles(); fetchExpiringRoles(); }} className="ar-btn ar-btn-outline">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                        <button onClick={() => setShowAssignModal(true)} className="ar-btn ar-btn-primary">
                            <FiUserPlus size={15} /> Assign Role
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="ar-stats">
                    <span className="ar-stat"><FiShield size={12} /> {stats.active} Active</span>
                    <span className="ar-stat" style={{ color: '#d97706' }}><FiAlertTriangle size={12} /> {stats.expiring} Expiring Soon</span>
                    <span className="ar-stat"><FiUsers size={12} /> {stats.total} Total</span>
                </div>

                {/* Expiring Alert */}
                {expiringRoles.length > 0 && (
                    <div className="ar-alert">
                        <FiAlertTriangle size={18} />
                        <span>{expiringRoles.length} role{expiringRoles.length > 1 ? 's' : ''} expiring within 7 days</span>
                    </div>
                )}

                {/* Search & Filter Bar */}
                <div className="ar-bar">
                    <div className="ar-search-wrap">
                        <FiSearch size={14} className="ar-search-icon" />
                        <input type="text" value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search by user name..." className="ar-search" />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="ar-select">
                        <option value="all">All Roles</option>
                        <option value="class_rep">Class Rep</option>
                        <option value="student_leader">Student Leader</option>
                        <option value="faculty_rep">Faculty Rep</option>
                    </select>
                </div>

                {/* Tabs */}
                <div className="ar-tabs">
                    {['active', 'expired', 'all'].map(tab => (
                        <button key={tab} className={`ar-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Roles List */}
                {roles.length > 0 ? (
                    <div>
                        {roles.map(role => (
                            <div key={role.id} className="ar-card">
                                <div className="ar-card-row">
                                    <div className="ar-card-info">
                                        <div className="ar-card-name">
                                            <span className={`ar-dot ${role.is_active !== false ? 'ar-dot-green' : 'ar-dot-red'}`} style={{ display: 'inline-block', marginRight: 8 }} />
                                            {role.user_name}
                                        </div>
                                        <div className="ar-card-meta">
                                            <span className="ar-badge ar-badge-blue">{role.role?.replace(/_/g, ' ')}</span>
                                            {role.scope_name}
                                        </div>
                                        <div className="ar-card-dates">
                                            <FiCalendar size={11} />
                                            {new Date(role.effective_from || role.start_date).toLocaleDateString()} — {new Date(role.effective_to || role.end_date).toLocaleDateString()}
                                            {role.is_active === false && <span style={{ color: '#ef4444', marginLeft: 8 }}>Expired</span>}
                                        </div>
                                    </div>
                                    {role.is_active !== false && (
                                        <button onClick={() => setShowRevokeConfirm(role.id)} className="ar-btn ar-btn-outline" style={{ color: '#ef4444', borderColor: '#fecaca' }}>
                                            <FiXCircle size={14} /> Revoke
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="ar-empty">
                        <FiUsers size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ fontWeight: 600 }}>No roles found</p>
                        <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Try a different filter or assign a new role.</p>
                    </div>
                )}
            </div>

            {/* Assign Role Modal */}
            {showAssignModal && (
                <div className="ar-modal-overlay">
                    <div className="ar-modal-backdrop" onClick={() => setShowAssignModal(false)} />
                    <div className="ar-modal">
                        <div className="ar-modal-header">
                            <span className="ar-modal-title">Assign Leadership Role</span>
                            <button className="ar-modal-close" onClick={() => setShowAssignModal(false)}><FiX size={16} /></button>
                        </div>
                        <div className="ar-modal-body">
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>User *</label>
                                <input type="text" value={assignForm.scope_name} onChange={e => handleUserSearch(e.target.value)} placeholder="Search student..." className="ar-input" />
                                {userSearchResults.length > 0 && (
                                    <div className="ar-user-dropdown">
                                        {userSearchResults.map(u => (
                                            <div key={u.id} className="ar-user-item" onClick={() => selectUser(u)}>{u.full_name} ({u.class_name})</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>Role *</label>
                                <select value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })} className="ar-input">
                                    <option value="class_rep">Class Representative</option>
                                    <option value="student_leader">Student Leader</option>
                                    <option value="faculty_rep">Faculty Representative</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>Scope ID *</label>
                                <input type="text" value={assignForm.scope_id} onChange={e => setAssignForm({ ...assignForm, scope_id: e.target.value })} placeholder="UUID of class/department/faculty" className="ar-input" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>Start Date *</label><input type="date" value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} className="ar-input" /></div>
                                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>End Date *</label><input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} className="ar-input" /></div>
                            </div>
                        </div>
                        <div className="ar-modal-footer">
                            <button onClick={() => setShowAssignModal(false)} className="ar-btn ar-btn-outline" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleAssignRole} disabled={assigning} className="ar-btn ar-btn-primary" style={{ flex: 1 }}>
                                {assigning ? 'Assigning...' : 'Assign Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke Confirmation */}
            {showRevokeConfirm && (
                <div className="ar-modal-overlay">
                    <div className="ar-modal-backdrop" onClick={() => setShowRevokeConfirm(null)} />
                    <div className="ar-modal" style={{ maxWidth: 400 }}>
                        <div className="ar-modal-header">
                            <span className="ar-modal-title">Revoke Role</span>
                            <button className="ar-modal-close" onClick={() => setShowRevokeConfirm(null)}><FiX size={16} /></button>
                        </div>
                        <div className="ar-modal-body">
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Are you sure you want to revoke this role? The user will revert to student status.</p>
                        </div>
                        <div className="ar-modal-footer">
                            <button onClick={() => setShowRevokeConfirm(null)} className="ar-btn ar-btn-outline" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={() => handleRevokeRole(showRevokeConfirm)} className="ar-btn" style={{ flex: 1, background: '#ef4444', color: '#fff' }}>
                                <FiTrash2 size={14} /> Revoke
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}