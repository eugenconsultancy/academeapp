import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiUserPlus, FiClock, FiAlertTriangle, FiCheckCircle,
    FiXCircle, FiSearch, FiHome, FiChevronRight, FiSettings,
    FiRefreshCw, FiUsers, FiShield, FiCalendar,
    FiX, FiTrash2, FiBookOpen,
} from 'react-icons/fi';

export default function AdminRolesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roles, setRoles] = useState([]);
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
    const [classSearchResults, setClassSearchResults] = useState([]);
    const [classSearching, setClassSearching] = useState(false);

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/'); return; }
        fetchRoles();
    }, [activeTab, searchUser, roleFilter]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/accounts/roles/');
            let data = [];
            if (activeTab === 'active') {
                data = res.data.active_roles || [];
            } else {
                data = res.data.past_roles || [];
            }
            if (roleFilter !== 'all') {
                data = data.filter(r => r.role === roleFilter);
            }
            if (searchUser) {
                data = data.filter(r =>
                    (r.user_name || r.user?.full_name || '').toLowerCase().includes(searchUser.toLowerCase())
                );
            }
            setRoles(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load roles. Please try again.');
            setRoles([]);
        } finally {
            setLoading(false);
        }
    };

    // Search users for assignment
    const handleUserSearch = async (query) => {
        setAssignForm({ ...assignForm, user_id: query });
        if (query.length < 2) { setUserSearchResults([]); return; }
        setUserSearching(true);
        try {
            const response = await accountsApi.searchStudents(query);
            const data = response.data || response;
            setUserSearchResults(data);
        } catch {
            setUserSearchResults([]);
        } finally {
            setUserSearching(false);
        }
    };

    const selectUser = (u) => {
        setAssignForm({
            ...assignForm,
            user_id: u.id,
        });
        setUserSearchResults([]);
    };

    // NEW: Search classes by name
    const handleClassSearch = async (query) => {
        setAssignForm({ ...assignForm, scope_name: query, scope_id: '' });
        if (query.length < 2) { setClassSearchResults([]); return; }
        setClassSearching(true);
        try {
            // Assuming there is an endpoint to search classes – adjust URL as needed
            const response = await apiClient.get('/classes/search/', { params: { q: query } });
            const data = response.data || response;
            setClassSearchResults(data);
        } catch (err) {
            console.warn('Class search failed', err);
            setClassSearchResults([]);
        } finally {
            setClassSearching(false);
        }
    };

    const selectClass = (cls) => {
        setAssignForm({
            ...assignForm,
            scope_id: cls.id,          // UUID of the class
            scope_name: cls.name,      // Human-readable class name
        });
        setClassSearchResults([]);
    };

    const handleAssignRole = async () => {
        if (!assignForm.user_id || !assignForm.scope_id || !assignForm.start_date || !assignForm.end_date) {
            toast.error('Please fill all required fields (student, class, dates)');
            return;
        }
        setAssigning(true);
        try {
            const payload = {
                user_id: assignForm.user_id,
                role: assignForm.role,
                scope_type: assignForm.scope_type,
                scope_id: assignForm.scope_id,
                scope_name: assignForm.scope_name,
                start_date: new Date(assignForm.start_date).toISOString(),
                end_date: new Date(assignForm.end_date).toISOString(),
            };
            await apiClient.post('/accounts/roles/assign/', payload);
            toast.success('Role assigned successfully!');
            setShowAssignModal(false);
            setAssignForm({
                user_id: '', role: 'class_rep', scope_id: '', scope_name: '',
                scope_type: 'class', start_date: '', end_date: '',
            });
            fetchRoles();
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
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to revoke role');
        }
    };

    const activeCount = roles.filter(r => !r.is_expired && r.is_expired !== undefined).length;
    const expiringCount = roles.filter(r => r.days_remaining > 0 && r.days_remaining <= 7).length;

    if (loading) return <SkeletonLoader type="list" count={5} />;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 font-outfit">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Link to="/" className="hover:text-indigo-600"><FiHome /> Home</Link>
                <FiChevronRight size={12} />
                <Link to="/admin" className="hover:text-indigo-600">Admin</Link>
                <FiChevronRight size={12} />
                <span className="text-gray-900 dark:text-white font-semibold">Roles</span>
            </nav>

            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Role Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage student leadership roles and assignments</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchRoles} className="px-4 py-2 border rounded-xl text-sm font-semibold flex items-center gap-2">
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md">
                        <FiUserPlus size={14} /> Assign Role
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mb-6">
                <span className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <FiUsers className="inline mr-1" size={12} /> {activeCount} Active
                </span>
                {expiringCount > 0 && (
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                        <FiAlertTriangle className="inline mr-1" size={12} /> {expiringCount} Expiring Soon
                    </span>
                )}
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        value={searchUser}
                        onChange={e => setSearchUser(e.target.value)}
                        placeholder="Search by user name..."
                        className="w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 text-sm"
                >
                    <option value="all">All Roles</option>
                    <option value="class_rep">Class Rep</option>
                    <option value="student_leader">Student Leader</option>
                    <option value="faculty_rep">Faculty Rep</option>
                </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 border-b pb-2">
                {['active', 'past'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        {tab === 'active' ? 'Active Roles' : 'Past Roles'}
                    </button>
                ))}
            </div>

            {/* Roles List */}
            {roles.length > 0 ? (
                <div className="space-y-3">
                    {roles.map(role => {
                        const userName = role.user_name || role.user?.full_name || 'Unknown User';
                        const isExpired = role.is_expired === true;
                        const daysRemaining = role.days_remaining || 0;
                        const startDate = role.start_date || role.effective_from;
                        const endDate = role.end_date || role.effective_to;
                        return (
                            <div key={role.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start gap-3 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-900 dark:text-white">{userName}</span>
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                                                {role.role?.replace(/_/g, ' ') || 'Student'}
                                            </span>
                                            {!isExpired && daysRemaining > 0 && daysRemaining <= 7 && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                                                    <FiAlertTriangle className="inline mr-1" size={10} /> {daysRemaining} days left
                                                </span>
                                            )}
                                            {isExpired && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                                    Expired
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">{role.scope_name || 'No scope'}</div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                                            <FiCalendar size={12} />
                                            {startDate ? new Date(startDate).toLocaleDateString() : '?'} → {endDate ? new Date(endDate).toLocaleDateString() : '?'}
                                        </div>
                                    </div>
                                    {activeTab === 'active' && !isExpired && (
                                        <button
                                            onClick={() => setShowRevokeConfirm(role.id)}
                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                        >
                                            <FiXCircle className="inline mr-1" size={12} /> Revoke
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <FiUsers size={40} className="mx-auto opacity-40 mb-3" />
                    <p>No roles found</p>
                </div>
            )}

            {/* Assign Role Modal with class name search */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-5 border-b">
                            <h2 className="text-xl font-bold">Assign Leadership Role</h2>
                            <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-full hover:bg-gray-100"><FiX size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Student Search */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Student *</label>
                                <input
                                    type="text"
                                    value={assignForm.user_id ? (userSearchResults.find(u => u.id === assignForm.user_id)?.full_name || '') : ''}
                                    onChange={e => handleUserSearch(e.target.value)}
                                    placeholder="Search by name..."
                                    className="w-full p-2 border rounded-lg"
                                />
                                {userSearchResults.length > 0 && (
                                    <div className="mt-1 border rounded-lg max-h-40 overflow-auto">
                                        {userSearchResults.map(u => (
                                            <div key={u.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectUser(u)}>
                                                {u.full_name} ({u.class_name})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Role *</label>
                                <select
                                    value={assignForm.role}
                                    onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="class_rep">Class Representative</option>
                                    <option value="student_leader">Student Leader</option>
                                    <option value="faculty_rep">Faculty Representative</option>
                                </select>
                            </div>

                            {/* Class Name Search (replaces UUID input) */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Class *</label>
                                <div className="relative">
                                    <FiBookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={assignForm.scope_name}
                                        onChange={e => handleClassSearch(e.target.value)}
                                        placeholder="Type class name (e.g., '3rd Year Microbiology')"
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                    />
                                </div>
                                {classSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                                {classSearchResults.length > 0 && (
                                    <div className="mt-1 border rounded-lg max-h-40 overflow-auto">
                                        {classSearchResults.map(cls => (
                                            <div key={cls.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectClass(cls)}>
                                                {cls.name} ({cls.code || 'No code'})
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {assignForm.scope_id && (
                                    <p className="text-xs text-green-600 mt-1">✓ Class selected: {assignForm.scope_name}</p>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                                    <input
                                        type="date"
                                        value={assignForm.start_date}
                                        onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date *</label>
                                    <input
                                        type="date"
                                        value={assignForm.end_date}
                                        onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 pt-0">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-2 border rounded-xl">Cancel</button>
                            <button onClick={handleAssignRole} disabled={assigning} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                                {assigning ? 'Assigning...' : 'Assign Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke Confirmation Modal */}
            {showRevokeConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-5">
                        <h3 className="text-lg font-bold mb-2">Revoke Role</h3>
                        <p className="text-gray-600 mb-4">Are you sure you want to revoke this role? The user will revert to student status.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRevokeConfirm(null)} className="flex-1 py-2 border rounded-xl">Cancel</button>
                            <button onClick={() => handleRevokeRole(showRevokeConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-xl">Revoke</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}