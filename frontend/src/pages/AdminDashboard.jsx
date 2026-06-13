// C:\Users\GATARA-BJTU\academe\frontend\src\pages\AdminDashboard.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { accountsApi } from '../api/accountsApi';
import { classesApi } from '../api/classesApi';
import {
  FiPackage, FiCheckCircle, FiFlag, FiUsers, FiBell,
  FiBriefcase, FiActivity, FiBarChart2, FiShield,
  FiExternalLink, FiSearch,
  FiRefreshCw, FiEye, FiTrendingUp,
  FiTrash2, FiAlertTriangle, FiX, FiCheck,
  FiUserCheck, FiBook, FiClipboard, FiServer,
  FiEdit2, FiSlash, FiUserPlus, FiMessageSquare,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'items', label: 'Found Items', icon: FiPackage },
  { id: 'claims', label: 'Claims', icon: FiCheckCircle },
  { id: 'reports', label: 'Reports', icon: FiFlag },
  { id: 'announcements', label: 'Announcements', icon: FiBell },
  { id: 'opportunities', label: 'Opportunities', icon: FiBriefcase },
  { id: 'classes', label: 'Classes', icon: FiBook },
  { id: 'attendance', label: 'Attendance', icon: FiClipboard },
  { id: 'blog', label: 'Blog', icon: FiEdit2 },
  { id: 'system', label: 'System', icon: FiServer },
];

const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (val.full_name) return val.full_name;
    if (val.name) return val.name;
    if (val.title) return val.title;
    if (val.email) return val.email;
    return JSON.stringify(val);
  }
  return String(val);
};

const safeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && data.data && Array.isArray(data.data)) return data.data;
  return [];
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [classGroups, setClassGroups] = useState([]);
  const [classGroupsLoading, setClassGroupsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  // ── Queries with corrected API endpoints ──────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/governance/stats/').then(r => r.data),
    enabled: activeTab === 'overview',
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/accounts/users/').then(r => safeArray(r.data)),
    enabled: activeTab === 'users',
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/found-items/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load items:', err);
        return [];
      }
    },
    enabled: activeTab === 'items',
  });

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['admin-claims'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/found-items/claims/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load claims:', err);
        return [];
      }
    },
    enabled: activeTab === 'claims',
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => apiClient.get('/announcements/reports/').then(r => safeArray(r.data)),
    enabled: activeTab === 'reports',
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => apiClient.get('/announcements/').then(r => safeArray(r.data)),
    enabled: activeTab === 'announcements',
  });

  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['admin-opportunities'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/opportunities/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load opportunities:', err);
        return [];
      }
    },
    enabled: activeTab === 'opportunities',
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['admin-all-classes'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/classes/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load classes:', err);
        return [];
      }
    },
    enabled: activeTab === 'classes',
  });

  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['admin-attendance'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/classes/attendance/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load attendance:', err);
        return [];
      }
    },
    enabled: activeTab === 'attendance',
  });

  const { data: blogPosts, isLoading: blogLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/blog/posts/');
        return safeArray(res.data);
      } catch (err) {
        console.error('Failed to load blog posts:', err);
        return [];
      }
    },
    enabled: activeTab === 'blog',
  });

  const { data: systemHealth, isLoading: systemLoading } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => apiClient.get('/system/health/').then(r => r.data),
    enabled: activeTab === 'system',
    refetchInterval: 30000,
  });

  const isLoading = {
    overview: statsLoading,
    users: usersLoading,
    items: itemsLoading,
    claims: claimsLoading,
    reports: reportsLoading,
    announcements: announcementsLoading,
    opportunities: opportunitiesLoading,
    classes: classesLoading,
    attendance: attendanceLoading,
    blog: blogLoading,
    system: systemLoading,
  }[activeTab];

  // ── Mutations ──────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/claims/${id}/approve/`),
    onSuccess: () => {
      toast.success('Claim approved');
      queryClient.invalidateQueries({ queryKey: ['admin-claims', 'admin-stats'] });
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Failed to approve claim'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/claims/${id}/reject/`),
    onSuccess: () => {
      toast.success('Claim rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-claims', 'admin-stats'] });
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Failed to reject claim'),
  });

  const resolveReportMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/announcements/reports/${id}/resolve/`),
    onSuccess: () => {
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-reports', 'admin-stats'] });
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Failed to resolve report'),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/announcements/${id}/`),
    onSuccess: () => {
      toast.success('Announcement deleted');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['admin-announcements', 'admin-stats'] });
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Failed to delete announcement')
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => apiClient.put(`/accounts/users/${userId}/role/`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update role'),
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId) => accountsApi.deactivateUser(userId),
    onSuccess: () => {
      toast.success('User deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to deactivate user');
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/blog/posts/${id}/`),
    onSuccess: () => {
      toast.success('Blog post deleted');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete post'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: (data) => apiClient.post('/accounts/roles/assign/', data),
    onSuccess: () => {
      toast.success('Role assigned');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAssignModalOpen(false);
      setSelectedUserForRole(null);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to assign role'),
  });

  const handleDeleteClick = (item, type) => {
    setDeleteConfirm({ id: item.id, title: item.title || item.name || item.post_title || 'Item', type });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'announcement') {
      deleteAnnouncementMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'blog') {
      deleteBlogMutation.mutate(deleteConfirm.id);
    }
  };

  const loadClassGroups = async () => {
    setClassGroupsLoading(true);
    try {
      const res = await classesApi.listClassGroups();
      setClassGroups(res.data);
    } catch (err) {
      toast.error('Failed to load class groups');
    } finally {
      setClassGroupsLoading(false);
    }
  };

  const openAssignModal = (user) => {
    setSelectedUserForRole(user);
    setAssignModalOpen(true);
    loadClassGroups();
  };

  const getAuthorName = (item) => {
    if (item.author_name) return item.author_name;
    if (item.author?.full_name) return item.author.full_name;
    if (item.author?.name) return item.author.name;
    if (item.submitted_by?.full_name) return item.submitted_by.full_name;
    if (item.submitted_by_name) return item.submitted_by_name;
    if (item.user?.full_name) return item.user.full_name;
    if (item.created_by?.full_name) return item.created_by.full_name;
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage users, items, claims, reports & more</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/admin/audit-logs" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Audit Logs</Link>
            <Link to="/admin/roles" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Roles</Link>
            <Link to="/admin/tickets" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Tickets</Link>
            <Link to="/governance" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Governance</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonLoader type="list" count={5} />
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-indigo-600">{safeStr(stats?.students_count) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Users</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{safeStr(stats?.found_items_count) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Found Items</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-amber-600">{safeStr(stats?.total_claims) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Claims</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{safeStr(stats?.total_reports) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Reports</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{safeStr(stats?.active_roles) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Roles</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{safeStr(stats?.announcements_count) || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Announcements</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {TABS.filter(t => t.id !== 'overview').map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                      <tab.icon size={28} className="mx-auto text-indigo-500 mb-2" />
                      <div className="text-sm font-medium">{tab.label}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by name, email or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  {users && users.length > 0 ? (
                    users.filter(u => !search || (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.phone_number?.includes(search))).map(u => (
                      <div key={u.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{u.full_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>{u.email || 'No email'}</span>
                              <span>•</span>
                              <span>{u.phone_number || 'No phone'}</span>
                              <span>•</span>
                              <span>{u.institution || 'No institution'}</span>
                            </div>
                            {u.active_roles && u.active_roles.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {u.active_roles.map(r => (
                                  <span key={r.id} className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full">{r.role.replace('_', ' ')} – {r.scope_name || 'All'}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{u.role}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                            <select
                              className="px-2 py-1 text-xs border rounded-lg"
                              defaultValue={u.role}
                              onChange={(e) => updateUserRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                            >
                              <option value="student">Student</option>
                              <option value="class_rep">Class Rep</option>
                              <option value="student_leader">Student Leader</option>
                              <option value="faculty_rep">Faculty Rep</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => openAssignModal(u)}>Assign</button>
                            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg" onClick={() => deactivateUserMutation.mutate(u.id)}>Deactivate</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* Found Items Tab */}
            {activeTab === 'items' && (
              <div>
                <div className="mb-4">
                  <input type="text" placeholder="Search found items..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800" />
                </div>
                <div className="space-y-2">
                  {items && items.length > 0 ? (
                    items.filter(item => !search || item.title?.toLowerCase().includes(search.toLowerCase())).map(item => (
                      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold">{item.title || 'Unnamed Item'}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>{item.category || 'Uncategorized'}</span>
                              <span>•</span>
                              <span>{item.location_found || 'Unknown'}</span>
                              <span>•</span>
                              <span>{item.found_date ? new Date(item.found_date).toLocaleDateString() : 'Date unknown'}</span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Reported by: {getAuthorName(item)}</div>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${item.is_claimed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.is_claimed ? 'Claimed' : 'Available'}</span>
                            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => navigate(`/found-items/${item.id}`)}>View</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No found items available</div>
                  )}
                </div>
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && (
              <div className="space-y-2">
                {claims && claims.length > 0 ? (
                  claims.map(claim => (
                    <div key={claim.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="font-semibold">Claim for: {claim.item_title || claim.item?.title || 'Unknown Item'}</div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                            <span>Claimant: {claim.claimant_name || claim.claimant?.full_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>Phone: {claim.claimant_phone || claim.claimant?.phone_number || 'N/A'}</span>
                            <span>•</span>
                            <span>Date: {new Date(claim.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${claim.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : claim.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{claim.status || 'pending'}</span>
                          {claim.status === 'pending' && (
                            <>
                              <button className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg" onClick={() => approveMutation.mutate(claim.id)}>Approve</button>
                              <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg" onClick={() => rejectMutation.mutate(claim.id)}>Reject</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">No claims found</div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-2">
                {reports && reports.length > 0 ? (
                  reports.map(report => (
                    <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="font-semibold">{report.announcement_title || report.content_title || 'Reported Content'}</div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                            <span>Reported by: {report.reported_by_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>Reason: {report.reason}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${report.is_resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{report.is_resolved ? 'Resolved' : 'Pending'}</span>
                          {!report.is_resolved && (
                            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => resolveReportMutation.mutate(report.id)}>Resolve</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">No reports found</div>
                )}
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div>
                <div className="mb-4">
                  <input type="text" placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="space-y-2">
                  {announcements && announcements.length > 0 ? (
                    announcements.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase())).map(announcement => (
                      <div key={announcement.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold">{announcement.title}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>By: {getAuthorName(announcement)}</span>
                              <span>•</span>
                              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${announcement.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{announcement.is_active !== false ? 'Active' : 'Inactive'}</span>
                            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg" onClick={() => handleDeleteClick(announcement, 'announcement')}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No announcements found</div>
                  )}
                </div>
              </div>
            )}

            {/* Opportunities Tab */}
            {activeTab === 'opportunities' && (
              <div>
                <div className="mb-4">
                  <input type="text" placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="space-y-2">
                  {opportunities && opportunities.length > 0 ? (
                    opportunities.filter(o => !search || o.title?.toLowerCase().includes(search.toLowerCase())).map(opportunity => (
                      <div key={opportunity.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold">{opportunity.title || 'Untitled Opportunity'}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>Organization: {opportunity.organization || 'Unknown'}</span>
                              <span>•</span>
                              <span>Type: {opportunity.type || 'General'}</span>
                            </div>
                            <div className="text-sm text-gray-500">Posted by: {getAuthorName(opportunity)} • {new Date(opportunity.created_at).toLocaleDateString()}</div>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${opportunity.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{opportunity.is_active !== false ? 'Active' : 'Inactive'}</span>
                            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => navigate(`/opportunities/${opportunity.id}`)}>View</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No opportunities found</div>
                  )}
                </div>
              </div>
            )}

            {/* Classes Tab */}
            {activeTab === 'classes' && (
              <div>
                <div className="mb-4">
                  <input type="text" placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="space-y-2">
                  {classes && classes.length > 0 ? (
                    classes.filter(cls => !search || (cls.name || cls.title || '')?.toLowerCase().includes(search.toLowerCase())).map(cls => (
                      <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold">{cls.name || cls.title || 'Unnamed Class'}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>Code: {cls.class_code || cls.course_code || 'N/A'}</span>
                              <span>•</span>
                              <span>Instructor: {cls.instructor_name || cls.instructor?.full_name || 'Not Assigned'}</span>
                            </div>
                            {(cls.department || cls.faculty) && <div className="text-sm text-gray-500">Department: {cls.department || cls.faculty}</div>}
                            {(cls.semester || cls.academic_year) && <div className="text-sm text-gray-500">Semester: {cls.semester || cls.academic_year}</div>}
                            {(cls.venue || cls.location || cls.room) && <div className="text-sm text-gray-500">Venue: {cls.venue || cls.location || cls.room}</div>}
                            <div className="text-sm text-gray-500">Schedule: {cls.day_of_week || 'TBA'} {cls.time || cls.start_time ? ` at ${cls.time || cls.start_time}` : ''}{cls.end_time ? ` - ${cls.end_time}` : ''}</div>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${cls.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cls.is_active !== false ? 'Active' : 'Inactive'}</span>
                            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => navigate(`/classes/${cls.id}`)}>View</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No classes found</div>
                  )}
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-2">
                {attendanceRecords && attendanceRecords.length > 0 ? (
                  attendanceRecords.map(record => (
                    <div key={record.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="font-semibold">Student: {record.student_name || record.student?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                            <span>Class: {record.class_name || record.class_group?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>Date: {new Date(record.date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Status: <span className={`px-2 py-0.5 rounded-full text-xs ${record.status === 'present' ? 'bg-green-100 text-green-700' : record.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{record.status || 'absent'}</span>
                            <span className="mx-2">•</span>
                            Marked by: {record.marked_by_name || record.marked_by?.full_name || 'System'}
                          </div>
                        </div>
                        <div>
                          <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg" onClick={() => navigate(`/classes/attendance/${record.id}`)}>View</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">No attendance records found</div>
                )}
              </div>
            )}

            {/* Blog Tab */}
            {activeTab === 'blog' && (
              <div>
                <div className="mb-4">
                  <input type="text" placeholder="Search blog posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div className="space-y-2">
                  {blogPosts && blogPosts.length > 0 ? (
                    blogPosts.filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase())).map(post => (
                      <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold">{post.title || 'Untitled Post'}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                              <span>By: {getAuthorName(post)}</span>
                              <span>•</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            {post.tags && <div className="text-sm text-gray-500">Tags: {post.tags}</div>}
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{post.is_published ? 'Published' : 'Draft'}</span>
                            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg" onClick={() => handleDeleteClick(post, 'blog')}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No blog posts found</div>
                  )}
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">System Health</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-sm ${systemHealth?.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{systemHealth?.status === 'ok' ? 'Healthy' : 'Issues Detected'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Version:</span>
                    <span>{systemHealth?.version || '1.0.0'}</span>
                  </div>
                  {systemHealth?.services && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Services:</span>
                      <span>{Object.keys(systemHealth.services).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Role Modal */}
      {assignModalOpen && selectedUserForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAssignModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Role to {selectedUserForRole.full_name}</h3>
            <div className="space-y-4">
              <select className="w-full px-3 py-2 border rounded-lg" id="assign-role-type" defaultValue="class_rep">
                <option value="class_rep">Class Representative</option>
                <option value="student_leader">Student Leader</option>
                <option value="faculty_rep">Faculty Representative</option>
              </select>
              {classGroupsLoading ? (
                <p>Loading class groups...</p>
              ) : (
                <select className="w-full px-3 py-2 border rounded-lg" id="assign-class-group" required>
                  <option value="">Select a class group...</option>
                  {classGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.institution})</option>)}
                </select>
              )}
              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-2 border rounded-lg" onClick={() => setAssignModalOpen(false)}>Cancel</button>
                <button
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  onClick={() => {
                    const roleType = document.getElementById('assign-role-type').value;
                    const classGroupId = document.getElementById('assign-class-group').value;
                    if (!classGroupId) { toast.error('Please select a class group'); return; }
                    assignRoleMutation.mutate({
                      user_id: selectedUserForRole.id, role: roleType, scope_type: 'class', scope_id: classGroupId,
                      scope_name: classGroups.find(g => g.id === classGroupId)?.name || '',
                      start_date: new Date().toISOString(),
                      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    });
                  }}
                  disabled={assignRoleMutation.isPending}
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Delete {deleteConfirm.type === 'blog' ? 'Blog Post' : 'Announcement'}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 border rounded-lg" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg" onClick={handleConfirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}