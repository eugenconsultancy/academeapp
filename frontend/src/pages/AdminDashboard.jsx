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
  FiHome, FiChevronRight, FiExternalLink, FiSearch,
  FiRefreshCw, FiEye, FiXCircle, FiTrendingUp,
  FiTrash2, FiAlertTriangle, FiX, FiCheck,
  FiUserCheck, FiBook, FiClipboard, FiServer,
  FiEdit2, FiSlash, FiEyeOff, FiEye as FiEyeShow,
  FiUserPlus, FiLayers,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'items', label: 'Items', icon: FiPackage },
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

  // ── Queries ──────────────────────────────────────────
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
    queryFn: () => apiClient.get('/found-items/admin/items/').then(r => safeArray(r.data)),
    enabled: activeTab === 'items',
  });

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['admin-claims'],
    queryFn: () => apiClient.get('/found-items/admin/claims/').then(r => safeArray(r.data)),
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
    queryFn: () => apiClient.get('/opportunities/').then(r => safeArray(r.data)),
    enabled: activeTab === 'opportunities',
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['admin-all-classes'],
    queryFn: () => apiClient.get('/classes/admin/timetable/').then(r => safeArray(r.data)),
    enabled: activeTab === 'classes',
  });

  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['admin-attendance'],
    queryFn: () => apiClient.get('/classes/attendance/').then(r => safeArray(r.data)),
    enabled: activeTab === 'attendance',
  });

  const { data: blogPosts, isLoading: blogLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: () => apiClient.get('/blog/posts/').then(r => safeArray(r.data)),
    enabled: activeTab === 'blog',
  });

  const { data: systemHealth, isLoading: systemLoading } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => apiClient.get('/governance/system-health/').then(r => r.data),
    enabled: activeTab === 'system',
    refetchInterval: 15000,
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
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/approve/`),
    onSuccess: () => {
      toast.success('Claim approved');
      queryClient.invalidateQueries({ queryKey: ['admin-claims', 'admin-stats'] });
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Failed to approve claim'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/reject/`),
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

  const hideBlogMutation = useMutation({
    mutationFn: (slug) => apiClient.put(`/blog/posts/slug/${slug}/hide/`),
    onSuccess: () => {
      toast.success('Post visibility updated');
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update post'),
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/blog/posts/${id}/delete/`),
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
    setDeleteConfirm({ id: item.id, title: item.title || item.name, type });
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .ad-root { font-family: 'Outfit', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; animation: adIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes adIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .ad-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .ad-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; background: linear-gradient(135deg, #0f172a 0%, #334155 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .dark .ad-header h1 { background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .ad-header p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; margin-top: 4px; }
        .ad-header-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .ad-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.6); font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s; backdrop-filter: blur(12px); }
        .ad-link:hover { background: rgba(99,102,241,0.08); border-color: #6366f1; color: #6366f1; transform: translateY(-1px); }
        .ad-link-green { border-color: #10b981; color: #10b981; }
        .ad-link-green:hover { background: rgba(16,185,129,0.08); }
        .dark .ad-link { border-color: #334155; color: #94a3b8; background: rgba(15,23,42,0.6); }

        .ad-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 4px; backdrop-filter: blur(12px); }
        .dark .ad-tabs { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.05); }
        .ad-tab { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; border: none; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .ad-tab:hover { color: #0f172a; background: rgba(99,102,241,0.04); }
        .ad-tab.active { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.3); transform: scale(1.02); }
        .dark .ad-tab { color: #94a3b8; }
        .dark .ad-tab:hover { color: #f8fafc; }

        .ad-search { display: flex; gap: 8px; margin-bottom: 16px; }
        .ad-search input { width: 100%; padding: 9px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; outline: none; transition: all 0.2s; backdrop-filter: blur(12px); }
        .ad-search input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .dark .ad-search input { background: rgba(15,23,42,0.8); border-color: #334155; color: #f8fafc; }

        .ad-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 24px; }
        .ad-stat { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 20px 16px; text-align: center; backdrop-filter: blur(12px); transition: all 0.2s; }
        .ad-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .dark .ad-stat { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .ad-stat-value { font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .ad-stat-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

        .ad-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 16px; margin-bottom: 8px; backdrop-filter: blur(12px); transition: all 0.2s; animation: slideIn 0.3s ease both; }
        .ad-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .dark .ad-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .ad-card-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ad-card-info { flex: 1; min-width: 0; }
        .ad-card-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .dark .ad-card-title { color: #f8fafc; }
        .ad-card-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap; }
        .ad-card-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }

        .ad-badge { display: inline-flex; align-items: center; gap: 3px; padding: 4px 10px; border-radius: 99px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.01em; }
        .ad-badge-green { background: rgba(16,185,129,0.12); color: #059669; }
        .ad-badge-yellow { background: rgba(245,158,11,0.12); color: #d97706; }
        .ad-badge-red { background: rgba(239,68,68,0.12); color: #dc2626; }
        .ad-badge-blue { background: rgba(99,102,241,0.12); color: #6366f1; }
        .ad-badge-gray { background: rgba(107,114,128,0.12); color: #6b7280; }

        .ad-btn-sm { padding: 7px 14px; border-radius: 8px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.73rem; font-weight: 700; cursor: pointer; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); color: #fff; display: inline-flex; align-items: center; gap: 4px; }
        .ad-btn-sm:hover { transform: translateY(-1px); }
        .ad-btn-sm:active { transform: scale(0.97); }
        .ad-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ad-btn-approve { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.25); }
        .ad-btn-reject { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(239,68,68,0.25); }
        .ad-btn-resolve { background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
        .ad-btn-delete { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(239,68,68,0.25); }
        .ad-btn-view { background: rgba(255,255,255,0.6); border: 1.5px solid #e2e8f0; color: #64748b; backdrop-filter: blur(12px); }
        .ad-btn-view:hover { background: rgba(99,102,241,0.08); border-color: #6366f1; color: #6366f1; }
        .dark .ad-btn-view { background: rgba(15,23,42,0.6); border-color: #334155; color: #94a3b8; }
        .ad-btn-assign { background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }

        .role-select { padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.8rem; color: #0f172a; margin-right: 6px; }
        .dark .role-select { background: #1e293b; border-color: #334155; color: #f8fafc; }

        .ad-modal-overlay { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); animation: fadeIn 0.2s ease; }
        .ad-modal { position: relative; z-index: 71; width: 100%; max-width: 420px; background: rgba(255,255,255,0.98); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1); overflow: hidden; }
        .dark .ad-modal { background: rgba(15,23,42,0.98); border-color: rgba(255,255,255,0.07); }
        .ad-modal-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .ad-modal-icon { width: 44px; height: 44px; border-radius: 14px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; color: #6366f1; flex-shrink: 0; }
        .ad-modal-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
        .dark .ad-modal-title { color: #f8fafc; }
        .ad-modal-body { padding: 20px 24px; }
        .ad-modal-body p { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin-bottom: 12px; }
        .dark .ad-modal-body p { color: #94a3b8; }
        .ad-modal-footer { padding: 16px 24px 20px; display: flex; gap: 10px; border-top: 1px solid rgba(0,0,0,0.06); }
        .dark .ad-modal-footer { border-top-color: rgba(255,255,255,0.06); }
        .ad-modal-btn { flex: 1; padding: 11px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .ad-modal-cancel { border: 1.5px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.5); color: #64748b; }
        .ad-modal-cancel:hover { background: rgba(0,0,0,0.03); }
        .dark .ad-modal-cancel { background: rgba(15,23,42,0.5); border-color: rgba(255,255,255,0.1); color: #94a3b8; }
        .ad-modal-delete { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; box-shadow: 0 6px 16px rgba(239,68,68,0.3); }
        .ad-modal-delete:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(239,68,68,0.4); }
        .ad-modal-delete:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ad-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
        .ad-empty-icon { font-size: 2.5rem; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }

        .role-scope-list { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
        .role-scope-item { background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15); border-radius: 6px; padding: 2px 8px; font-size: 0.7rem; font-weight: 600; color: #6366f1; }
      `}</style>

      <div className="ad-root">
        <div className="ad-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage users, items, claims, reports & more</p>
          </div>
          <div className="ad-header-links">
            <Link to="/admin/audit-logs" className="ad-link"><FiActivity size={14} /> Audit Logs</Link>
            <Link to="/admin/roles" className="ad-link"><FiUsers size={14} /> Roles</Link>
            <Link to="/governance" className="ad-link"><FiTrendingUp size={14} /> Governance</Link>
            <a href="http://localhost:8000/admin/" target="_blank" rel="noopener noreferrer" className="ad-link ad-link-green"><FiExternalLink size={14} /> Django Admin</a>
          </div>
        </div>

        <div className="ad-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`ad-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonLoader type="list" count={5} />
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <div className="ad-stats">
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.students_count) || '0'}</div><div className="ad-stat-label">Users</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.found_items_count) || '0'}</div><div className="ad-stat-label">Items</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.total_claims) || '0'}</div><div className="ad-stat-label">Claims</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.total_reports) || '0'}</div><div className="ad-stat-label">Reports</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.active_roles) || '0'}</div><div className="ad-stat-label">Roles</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{safeStr(stats?.announcements_count) || '0'}</div><div className="ad-stat-label">Announcements</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {TABS.filter(t => t.id !== 'overview').map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="ad-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      <tab.icon size={28} style={{ color: '#6366f1', marginBottom: 8 }} />
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{tab.label}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="ad-search">
                  <input placeholder="Search users by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {users && users.length > 0 ? (
                  users.filter(u => !search ||
                    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    u.email?.toLowerCase().includes(search.toLowerCase()) ||
                    u.phone_number?.includes(search)
                  ).map(u => (
                    <div key={u.id} className="ad-card">
                      <div className="ad-card-row">
                        <div className="ad-card-info">
                          <div className="ad-card-title">{u.full_name || 'N/A'}</div>
                          <div className="ad-card-meta">
                            {u.email || 'No email'} · {u.phone_number || 'No phone'} · {u.institution || 'No institution'} · {u.class_name || 'No class'}
                          </div>
                          {u.active_roles && u.active_roles.length > 0 && (
                            <div className="role-scope-list" style={{ marginTop: 6 }}>
                              {u.active_roles.map(r => (
                                <span key={r.id} className="role-scope-item" title={r.scope_name}>
                                  {r.role.replace('_', ' ')} – {r.scope_name || 'All'}
                                </span>
                              ))}
                            </div>
                          )}
                          {u.past_roles_count > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                              +{u.past_roles_count} past role(s)
                            </div>
                          )}
                        </div>
                        <div className="ad-card-actions">
                          <span className="ad-badge ad-badge-blue">{u.role}</span>
                          <span className={`ad-badge ${u.is_active ? 'ad-badge-green' : 'ad-badge-red'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <select
                            className="role-select"
                            defaultValue={u.role}
                            onChange={(e) => updateUserRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                            disabled={updateUserRoleMutation.isPending}
                          >
                            <option value="student">Student</option>
                            <option value="class_rep">Class Rep</option>
                            <option value="student_leader">Student Leader</option>
                            <option value="faculty_rep">Faculty Rep</option>
                            <option value="faculty_officer">Faculty Officer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            className="ad-btn-sm ad-btn-assign"
                            onClick={() => openAssignModal(u)}
                            disabled={assignRoleMutation.isPending}
                            title="Assign scoped role"
                          >
                            <FiUserPlus size={12} /> Assign
                          </button>
                          <button
                            className="ad-btn-sm ad-btn-delete"
                            onClick={() => deactivateUserMutation.mutate(u.id)}
                            disabled={deactivateUserMutation.isPending}
                            title="Deactivate user"
                          >
                            <FiSlash size={12} /> Deactivate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ad-empty"><FiUsers size={32} style={{ opacity: 0.4 }} /><p>No users found</p></div>
                )}
              </div>
            )}

            {/* Assign Role Modal */}
            {assignModalOpen && selectedUserForRole && (
              <div className="ad-modal-overlay">
                <div className="ad-modal-backdrop" onClick={() => setAssignModalOpen(false)} />
                <div className="ad-modal" style={{ maxWidth: 480 }}>
                  <div className="ad-modal-header">
                    <div className="ad-modal-icon"><FiUserCheck size={20} /></div>
                    <div className="ad-modal-title">Assign Role to {selectedUserForRole.full_name}</div>
                  </div>
                  <div className="ad-modal-body">
                    <p>Choose the role and the class group (scope) for this user.</p>
                    <select
                      className="role-select"
                      style={{ width: '100%', marginBottom: 12 }}
                      id="assign-role-type"
                      defaultValue="class_rep"
                    >
                      <option value="class_rep">Class Representative</option>
                      <option value="student_leader">Student Leader</option>
                      <option value="faculty_rep">Faculty Representative</option>
                    </select>
                    {classGroupsLoading ? (
                      <p>Loading class groups...</p>
                    ) : (
                      <select
                        className="role-select"
                        style={{ width: '100%' }}
                        id="assign-class-group"
                        required
                      >
                        <option value="">Select a class group...</option>
                        {classGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.institution})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="ad-modal-footer">
                    <button className="ad-modal-btn ad-modal-cancel" onClick={() => setAssignModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      className="ad-modal-btn ad-modal-delete"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                      onClick={() => {
                        const roleType = document.getElementById('assign-role-type').value;
                        const classGroupId = document.getElementById('assign-class-group').value;
                        if (!classGroupId) {
                          toast.error('Please select a class group');
                          return;
                        }
                        assignRoleMutation.mutate({
                          user_id: selectedUserForRole.id,
                          role: roleType,
                          scope_type: 'class',
                          scope_id: classGroupId,
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
            )}

            {activeTab === 'items' && (
              <>
                <div className="ad-search"><input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                {items && items.length > 0 ? items.filter(item => !search || item.title?.toLowerCase().includes(search.toLowerCase())).map(item => (
                  <div key={item.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(item.title)}</div>
                        <div className="ad-card-meta">
                          <span>{safeStr(item.category)}</span><span>•</span>
                          <span>{safeStr(item.location_found)}</span><span>•</span>
                          <span>{safeStr(item.found_date)}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${item.is_claimed ? 'ad-badge-green' : 'ad-badge-yellow'}`}>
                          {item.is_claimed ? 'Claimed' : 'Available'}
                        </span>
                        <span className="ad-badge ad-badge-blue">{item.status}</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><div className="ad-empty-icon">📦</div><p>No items found</p></div>}
              </>
            )}

            {activeTab === 'claims' && (
              <>
                {claims && claims.length > 0 ? claims.map(claim => (
                  <div key={claim.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(claim.item_title)}</div>
                        <div className="ad-card-meta">
                          <span>Claimant: {safeStr(claim.claimant_name)}</span><span>•</span>
                          <span>{safeStr(claim.claimant_phone)}</span><span>•</span>
                          <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${claim.status === 'pending' ? 'ad-badge-yellow' : claim.status === 'claimed' ? 'ad-badge-green' : 'ad-badge-red'}`}>{claim.status}</span>
                        {claim.status === 'pending' && (
                          <>
                            <button className="ad-btn-sm ad-btn-approve" onClick={() => approveMutation.mutate(claim.id)} disabled={approveMutation.isPending}><FiCheck size={12} /> Approve</button>
                            <button className="ad-btn-sm ad-btn-reject" onClick={() => rejectMutation.mutate(claim.id)} disabled={rejectMutation.isPending}><FiX size={12} /> Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><div className="ad-empty-icon">✅</div><p>No claims found</p></div>}
              </>
            )}

            {activeTab === 'reports' && (
              <>
                {reports && reports.length > 0 ? reports.map(report => (
                  <div key={report.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(report.announcement_title) || safeStr(report.content_title) || 'Reported Content'}</div>
                        <div className="ad-card-meta">
                          <span>By: {safeStr(report.reported_by_name)}</span><span>•</span>
                          <span>Reason: {safeStr(report.reason)}</span><span>•</span>
                          <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${report.is_resolved ? 'ad-badge-green' : 'ad-badge-yellow'}`}>{report.is_resolved ? 'Resolved' : 'Pending'}</span>
                        {!report.is_resolved && (
                          <button className="ad-btn-sm ad-btn-resolve" onClick={() => resolveReportMutation.mutate(report.id)} disabled={resolveReportMutation.isPending}><FiCheck size={12} /> Resolve</button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><div className="ad-empty-icon">🚩</div><p>No reports found</p></div>}
              </>
            )}

            {activeTab === 'announcements' && (
              <>
                {announcements && announcements.length > 0 ? announcements.map(a => (
                  <div key={a.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(a.title)}</div>
                        <div className="ad-card-meta">
                          <span>By: {a.posted_by?.full_name || a.posted_by?.name || (typeof a.posted_by === 'string' ? a.posted_by : 'Admin')}</span>
                          <span>•</span>
                          <span>{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${a.is_urgent ? 'ad-badge-red' : 'ad-badge-blue'}`}>{a.is_urgent ? '🚨 Urgent' : 'Normal'}</span>
                        <button className="ad-btn-sm ad-btn-delete" onClick={() => handleDeleteClick(a, 'announcement')}><FiTrash2 size={12} /> Delete</button>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><div className="ad-empty-icon">📢</div><p>No announcements found</p></div>}
              </>
            )}

            {activeTab === 'opportunities' && (
              <>
                {opportunities && opportunities.length > 0 ? opportunities.map(o => (
                  <div key={o.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(o.title)}</div>
                        <div className="ad-card-meta">
                          <span>{safeStr(o.category)}</span><span>•</span>
                          <span>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><div className="ad-empty-icon">💼</div><p>No opportunities found</p></div>}
              </>
            )}

            {activeTab === 'classes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, margin: 0 }}>All Timetable Entries (Admin View)</h3>
                  <Link to="/classes/manage" className="ad-link">Manage Timetable <FiExternalLink size={12} /></Link>
                </div>
                {classes && classes.length > 0 ? classes.map(entry => (
                  <div key={entry.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(entry.unit_name)}</div>
                        <div className="ad-card-meta">
                          <span>Day: {entry.day_of_week}</span><span>•</span>
                          <span>{entry.start_time} – {entry.end_time}</span><span>•</span>
                          <span>Venue: {entry.venue}</span><span>•</span>
                          <span>Lecturer: {entry.lecturer}</span><span>•</span>
                          <span>Class: {entry.class_group_name}</span><span>•</span>
                          <span>Institution: {entry.institution}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><FiBook size={32} style={{ opacity: 0.4 }} /><p>No timetable entries found across the platform.</p></div>}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, margin: 0 }}>Recent Attendance Records</h3>
                  <Link to="/classes/attendance" className="ad-link">Full Summary <FiEye size={12} /></Link>
                </div>
                {attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords.map(rec => (
                  <div key={rec.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(rec.student_name)} – {safeStr(rec.unit_name)}</div>
                        <div className="ad-card-meta">
                          <span>{safeStr(rec.date)}</span><span>•</span>
                          <span>{safeStr(rec.sync_method)}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className="ad-badge ad-badge-green">Present</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><FiClipboard size={32} style={{ opacity: 0.4 }} /><p>No attendance records found</p></div>}
              </div>
            )}

            {activeTab === 'blog' && (
              <div>
                {blogPosts && blogPosts.length > 0 ? blogPosts.map(post => (
                  <div key={post.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{safeStr(post.title)}</div>
                        <div className="ad-card-meta">
                          <span>by {post.author?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span className={`ad-badge ${post.is_hidden ? 'ad-badge-gray' : 'ad-badge-blue'}`}>
                            {post.is_hidden ? 'Hidden' : 'Visible'}
                          </span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <button className="ad-btn-sm ad-btn-view" onClick={() => hideBlogMutation.mutate(post.slug)} disabled={hideBlogMutation.isPending}>
                          {post.is_hidden ? <FiEyeShow size={12} /> : <FiEyeOff size={12} />}
                          {post.is_hidden ? 'Show' : 'Hide'}
                        </button>
                        <button className="ad-btn-sm ad-btn-delete" onClick={() => handleDeleteClick(post, 'blog')}><FiTrash2 size={12} /> Delete</button>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty"><FiEdit2 size={32} style={{ opacity: 0.4 }} /><p>No blog posts found</p></div>}
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <div className="ad-stats" style={{ marginBottom: 24 }}>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{safeStr(systemHealth?.pending_offline_sync) || '‑'}</div>
                    <div className="ad-stat-label">Pending Sync</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{safeStr(systemHealth?.active_alerts) || '‑'}</div>
                    <div className="ad-stat-label">Active Alerts</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{safeStr(systemHealth?.cpu_usage) || '‑'}</div>
                    <div className="ad-stat-label">CPU %</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{safeStr(systemHealth?.memory_usage) || '‑'}</div>
                    <div className="ad-stat-label">Memory</div>
                  </div>
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>System Alerts</h3>
                {systemHealth?.alerts?.length > 0 ? (
                  systemHealth.alerts.map((alert, i) => (
                    <div key={i} className="ad-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="ad-card-title" style={{ color: '#d97706' }}>
                        <FiAlertTriangle size={14} style={{ marginRight: 6 }} />
                        {safeStr(alert.message)}
                      </div>
                      <div className="ad-card-meta" style={{ marginTop: 4 }}>
                        {safeStr(alert.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ad-empty"><FiCheckCircle size={32} style={{ color: '#10b981' }} /><p>System healthy – no active alerts.</p></div>
                )}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="ad-modal-overlay">
            <div className="ad-modal-backdrop" onClick={() => setDeleteConfirm(null)} />
            <div className="ad-modal">
              <div className="ad-modal-header">
                <div className="ad-modal-icon"><FiAlertTriangle size={20} /></div>
                <div className="ad-modal-title">Delete {deleteConfirm.type === 'blog' ? 'Blog Post' : 'Announcement'}</div>
              </div>
              <div className="ad-modal-body">
                <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                <span className="ad-modal-highlight">{deleteConfirm.title}</span>
              </div>
              <div className="ad-modal-footer">
                <button className="ad-modal-btn ad-modal-cancel" onClick={() => setDeleteConfirm(null)} disabled={deleteAnnouncementMutation.isPending || deleteBlogMutation.isPending}>
                  <FiX size={14} /> Cancel
                </button>
                <button className="ad-modal-btn ad-modal-delete" onClick={handleConfirmDelete} disabled={deleteAnnouncementMutation.isPending || deleteBlogMutation.isPending}>
                  {deleteAnnouncementMutation.isPending || deleteBlogMutation.isPending ? 'Deleting...' : (
                    <><FiTrash2 size={14} /> Delete Permanently</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}