import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
  FiPackage, FiCheckCircle, FiFlag, FiUsers, FiBell,
  FiBriefcase, FiActivity, FiBarChart2, FiShield,
  FiHome, FiChevronRight, FiExternalLink, FiSearch,
  FiRefreshCw, FiEye, FiXCircle, FiTrendingUp,
  FiTrash2, FiAlertTriangle, FiX, FiCheck,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'items', label: 'Items', icon: FiPackage },
  { id: 'claims', label: 'Claims', icon: FiCheckCircle },
  { id: 'reports', label: 'Reports', icon: FiFlag },
  { id: 'announcements', label: 'Announcements', icon: FiBell },
  { id: 'opportunities', label: 'Opportunities', icon: FiBriefcase },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title }
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/governance/stats/').then(r => r.data),
    enabled: activeTab === 'overview',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => apiClient.get('/found-items/admin/items/').then(r => r.data),
    enabled: activeTab === 'items',
  });

  // Claims
  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['admin-claims'],
    queryFn: () => apiClient.get('/found-items/admin/claims/').then(r => r.data),
    enabled: activeTab === 'claims',
  });

  // Reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => apiClient.get('/announcements/reports/').then(r => r.data),
    enabled: activeTab === 'reports',
  });

  // Announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => apiClient.get('/announcements/').then(r => r.data),
    enabled: activeTab === 'announcements',
  });

  // Opportunities
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['admin-opportunities'],
    queryFn: () => apiClient.get('/opportunities/').then(r => r.data),
    enabled: activeTab === 'opportunities',
  });

  // Mutations with proper invalidation and optimistic updates
  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/approve/`),
    onSuccess: () => {
      toast.success('Claim approved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Failed to approve claim');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/reject/`),
    onSuccess: () => {
      toast.success('Claim rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Failed to reject claim');
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/announcements/reports/${id}/resolve/`),
    onSuccess: () => {
      toast.success('Report resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Failed to resolve report');
    },
  });

  const deleteAnnouncementMutation = useMutation({
    // We use template literals to build the path. 
    // If you continue to see 405, remove the trailing '/' below.
    mutationFn: (id) => apiClient.delete(`/announcements/${id}/`),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-announcements'] });
      const previousAnnouncements = queryClient.getQueryData(['admin-announcements']);

      queryClient.setQueryData(['admin-announcements'], (old) => {
        if (!old) return old;
        const data = Array.isArray(old) ? old : (old?.results || []);
        return data.filter(item => item.id !== deletedId);
      });

      return { previousAnnouncements };
    },

    onSuccess: (data, variables, context) => {
      toast.success('Announcement deleted successfully');
      setDeleteConfirm(null);

      // Batch invalidations to ensure UI stays in sync
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAnnouncements) {
        queryClient.setQueryData(['admin-announcements'], context.previousAnnouncements);
      }

      // Detailed error logging for 405 diagnosis
      console.error('Delete Request Failed:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });

      toast.error(error?.response?.data?.detail || 'Failed to delete announcement. Check server logs.');
      setDeleteConfirm(null);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const handleDeleteClick = (announcement) => {
    setDeleteConfirm({ id: announcement.id, title: announcement.title });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm?.id) {
      deleteAnnouncementMutation.mutate(deleteConfirm.id);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const isLoading = {
    overview: statsLoading,
    items: itemsLoading,
    claims: claimsLoading,
    reports: reportsLoading,
    announcements: announcementsLoading,
    opportunities: opportunitiesLoading,
  }[activeTab];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        
        .ad-root { 
          font-family: 'Outfit', sans-serif; 
          max-width: 1100px; margin: 0 auto; 
          padding: 28px 20px 80px; 
          animation: adIn .4s cubic-bezier(0.16,1,0.3,1) both; 
        }
        @keyframes adIn { 
          from { opacity: 0; transform: translateY(16px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ad-header { 
          display: flex; justify-content: space-between; 
          align-items: flex-start; gap: 16px; 
          margin-bottom: 20px; flex-wrap: wrap; 
        }
        .ad-header h1 { 
          font-size: clamp(1.5rem, 3.5vw, 2rem); 
          font-weight: 900; letter-spacing: -0.04em; 
          background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dark .ad-header h1 { 
          background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ad-header p {
          font-size: 0.83rem; color: #94a3b8; 
          font-weight: 500; margin-top: 4px;
        }
        .ad-header-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .ad-link { 
          display: inline-flex; align-items: center; gap: 6px; 
          padding: 8px 14px; border-radius: 10px; 
          border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.6);
          font-family: 'Outfit', sans-serif; font-size: 0.8rem; 
          font-weight: 600; color: #64748b; cursor: pointer; 
          text-decoration: none; transition: all 0.15s;
          backdrop-filter: blur(12px);
        }
        .ad-link:hover { 
          background: rgba(99,102,241,0.08); 
          border-color: #6366f1; color: #6366f1; 
          transform: translateY(-1px);
        }
        .ad-link-green { border-color: #10b981; color: #10b981; }
        .ad-link-green:hover { background: rgba(16,185,129,0.08); }
        .dark .ad-link { 
          border-color: #334155; color: #94a3b8; 
          background: rgba(15,23,42,0.6);
        }

        .ad-tabs { 
          display: flex; gap: 4px; margin-bottom: 20px; 
          flex-wrap: wrap; background: rgba(255,255,255,0.6); 
          border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; 
          padding: 4px; backdrop-filter: blur(12px); 
        }
        .dark .ad-tabs { 
          background: rgba(15,23,42,0.6); 
          border-color: rgba(255,255,255,0.05); 
        }
        .ad-tab { 
          display: flex; align-items: center; gap: 6px; 
          padding: 9px 16px; border-radius: 11px; 
          border: none; background: transparent; cursor: pointer; 
          font-family: 'Outfit', sans-serif; font-size: 0.82rem; 
          font-weight: 600; color: #64748b; 
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); 
        }
        .ad-tab:hover { 
          color: #0f172a; background: rgba(99,102,241,0.04); 
        }
        .ad-tab.active { 
          background: linear-gradient(135deg, #6366f1, #4f46e5); 
          color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.3); 
          transform: scale(1.02);
        }
        .dark .ad-tab { color: #94a3b8; }
        .dark .ad-tab:hover { color: #f8fafc; }

        .ad-search { 
          display: flex; gap: 8px; margin-bottom: 16px; 
        }
        .ad-search-input-wrapper {
          flex: 1; position: relative;
        }
        .ad-search input { 
          width: 100%; padding: 9px 14px 9px 36px; 
          border-radius: 12px; border: 1.5px solid #e2e8f0; 
          background: rgba(255,255,255,0.8); 
          font-family: 'Outfit', sans-serif; font-size: 0.84rem; 
          outline: none; transition: all 0.2s;
          backdrop-filter: blur(12px);
        }
        .ad-search input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }
        .ad-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: #94a3b8;
        }
        .dark .ad-search input { 
          background: rgba(15,23,42,0.8); 
          border-color: #334155; color: #f8fafc; 
        }

        .ad-stats { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
          gap: 10px; margin-bottom: 24px; 
        }
        .ad-stat { 
          background: rgba(255,255,255,0.85); 
          border: 1px solid rgba(0,0,0,0.05); 
          border-radius: 14px; padding: 20px 16px; 
          text-align: center; backdrop-filter: blur(12px);
          transition: all 0.2s;
        }
        .ad-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .dark .ad-stat { 
          background: rgba(15,23,42,0.85); 
          border-color: rgba(255,255,255,0.05); 
        }
        .ad-stat-value { 
          font-size: 1.8rem; font-weight: 900; 
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ad-stat-label { 
          font-size: 0.7rem; color: #94a3b8; font-weight: 600; 
          text-transform: uppercase; letter-spacing: 0.05em; 
          margin-top: 4px; 
        }

        .ad-card { 
          background: rgba(255,255,255,0.85); 
          border: 1px solid rgba(0,0,0,0.05); 
          border-radius: 14px; padding: 16px; 
          margin-bottom: 8px; backdrop-filter: blur(12px); 
          transition: all 0.2s; 
          animation: slideIn 0.3s ease both;
        }
        .ad-card:hover { 
          box-shadow: 0 4px 12px rgba(0,0,0,0.06); 
          transform: translateY(-1px);
        }
        .dark .ad-card { 
          background: rgba(15,23,42,0.85); 
          border-color: rgba(255,255,255,0.05); 
        }
        .ad-card-row { 
          display: flex; justify-content: space-between; 
          align-items: center; gap: 12px; flex-wrap: wrap; 
        }
        .ad-card-info { flex: 1; min-width: 0; }
        .ad-card-title { 
          font-size: 0.9rem; font-weight: 700; color: #0f172a;
          line-height: 1.3;
        }
        .dark .ad-card-title { color: #f8fafc; }
        .ad-card-meta { 
          font-size: 0.75rem; color: #94a3b8; margin-top: 4px; 
          display: flex; gap: 12px; flex-wrap: wrap;
        }
        .ad-card-actions { 
          display: flex; gap: 6px; flex-shrink: 0; 
          align-items: center;
        }
        
        .ad-badge { 
          display: inline-flex; align-items: center; gap: 3px; 
          padding: 4px 10px; border-radius: 99px; 
          font-size: 0.68rem; font-weight: 700; 
          letter-spacing: 0.01em;
        }
        .ad-badge-green { background: rgba(16,185,129,0.12); color: #059669; }
        .ad-badge-yellow { background: rgba(245,158,11,0.12); color: #d97706; }
        .ad-badge-red { background: rgba(239,68,68,0.12); color: #dc2626; }
        .ad-badge-blue { background: rgba(99,102,241,0.12); color: #6366f1; }
        .ad-badge-gray { background: rgba(107,114,128,0.12); color: #6b7280; }

        .ad-btn-sm { 
          padding: 7px 14px; border-radius: 8px; border: none; 
          font-family: 'Outfit', sans-serif; font-size: 0.73rem; 
          font-weight: 700; cursor: pointer; 
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); 
          color: #fff; display: inline-flex; align-items: center; 
          gap: 4px;
        }
        .ad-btn-sm:hover { transform: translateY(-1px); }
        .ad-btn-sm:active { transform: scale(0.97); }
        .ad-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        .ad-btn-approve { 
          background: linear-gradient(135deg, #10b981, #059669); 
          box-shadow: 0 4px 12px rgba(16,185,129,0.25);
        }
        .ad-btn-approve:hover { box-shadow: 0 6px 16px rgba(16,185,129,0.35); }
        
        .ad-btn-reject { 
          background: linear-gradient(135deg, #ef4444, #dc2626); 
          box-shadow: 0 4px 12px rgba(239,68,68,0.25);
        }
        .ad-btn-reject:hover { box-shadow: 0 6px 16px rgba(239,68,68,0.35); }
        
        .ad-btn-resolve { 
          background: linear-gradient(135deg, #6366f1, #4f46e5); 
          box-shadow: 0 4px 12px rgba(99,102,241,0.25);
        }
        .ad-btn-resolve:hover { box-shadow: 0 6px 16px rgba(99,102,241,0.35); }
        
        .ad-btn-delete { 
          background: linear-gradient(135deg, #ef4444, #dc2626); 
          box-shadow: 0 4px 12px rgba(239,68,68,0.25);
        }
        .ad-btn-delete:hover { box-shadow: 0 6px 16px rgba(239,68,68,0.35); }
        
        .ad-btn-view { 
          background: rgba(255,255,255,0.6); 
          border: 1.5px solid #e2e8f0; color: #64748b; 
          backdrop-filter: blur(12px);
        }
        .ad-btn-view:hover { 
          background: rgba(99,102,241,0.08); 
          border-color: #6366f1; color: #6366f1;
        }
        .dark .ad-btn-view { 
          background: rgba(15,23,42,0.6); 
          border-color: #334155; color: #94a3b8;
        }

        /* Delete confirmation modal */
        .ad-modal-overlay {
          position: fixed; inset: 0; z-index: 70;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .ad-modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease;
        }
        .ad-modal {
          position: relative; z-index: 71;
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.98);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 24px;
          backdrop-filter: blur(28px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .dark .ad-modal {
          background: rgba(15,23,42,0.98);
          border-color: rgba(255,255,255,0.07);
        }
        .ad-modal-header {
          display: flex; align-items: center; gap: 12px;
          padding: 20px 24px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .dark .ad-modal-header {
          border-bottom-color: rgba(255,255,255,0.06);
        }
        .ad-modal-icon {
          width: 44px; height: 44px; border-radius: 14px;
          background: rgba(239,68,68,0.1);
          display: flex; align-items: center; justify-content: center;
          color: #ef4444; flex-shrink: 0;
        }
        .ad-modal-title {
          font-size: 1rem; font-weight: 800;
          letter-spacing: -0.02em; color: #0f172a;
        }
        .dark .ad-modal-title { color: #f8fafc; }
        .ad-modal-body {
          padding: 20px 24px;
        }
        .ad-modal-body p {
          font-size: 0.85rem; color: #64748b;
          line-height: 1.5; margin-bottom: 12px;
        }
        .dark .ad-modal-body p { color: #94a3b8; }
        .ad-modal-highlight {
          display: block; padding: 10px 14px;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 10px;
          font-size: 0.88rem; font-weight: 700; color: #dc2626;
          word-break: break-word;
        }
        .dark .ad-modal-highlight {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.2);
          color: #fca5a5;
        }
        .ad-modal-footer {
          padding: 16px 24px 20px; display: flex; gap: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .dark .ad-modal-footer {
          border-top-color: rgba(255,255,255,0.06);
        }
        .ad-modal-btn {
          flex: 1; padding: 11px; border-radius: 12px;
          font-family: 'Outfit', sans-serif; font-size: 0.84rem;
          font-weight: 700; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
          gap: 6px;
        }
        .ad-modal-cancel {
          border: 1.5px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.5); color: #64748b;
        }
        .ad-modal-cancel:hover {
          background: rgba(0,0,0,0.03);
        }
        .dark .ad-modal-cancel {
          background: rgba(15,23,42,0.5);
          border-color: rgba(255,255,255,0.1);
          color: #94a3b8;
        }
        .ad-modal-delete {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; border: none;
          box-shadow: 0 6px 16px rgba(239,68,68,0.3);
        }
        .ad-modal-delete:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239,68,68,0.4);
        }
        .ad-modal-delete:disabled {
          opacity: 0.5; cursor: not-allowed; transform: none;
        }

        .ad-empty { 
          text-align: center; padding: 48px 24px; color: #94a3b8; 
        }
        .ad-empty-icon {
          font-size: 2.5rem; margin-bottom: 12px;
        }

        .ad-refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid #e2e8f0; background: rgba(255,255,255,0.6);
          cursor: pointer; font-family: 'Outfit', sans-serif;
          font-size: 0.73rem; font-weight: 600; color: #64748b;
          transition: all 0.15s;
        }
        .ad-refresh-btn:hover {
          background: rgba(99,102,241,0.06);
          border-color: #6366f1; color: #6366f1;
        }
        .dark .ad-refresh-btn {
          background: rgba(15,23,42,0.6);
          border-color: #334155; color: #94a3b8;
        }
      `}</style>

      <div className="ad-root">
        {/* Header */}
        <div className="ad-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage items, claims, reports & more</p>
          </div>
          <div className="ad-header-links">
            <Link to="/admin/audit-logs" className="ad-link">
              <FiActivity size={14} /> Audit Logs
            </Link>
            <Link to="/admin/roles" className="ad-link">
              <FiUsers size={14} /> Roles
            </Link>
            <Link to="/governance" className="ad-link">
              <FiTrendingUp size={14} /> Governance
            </Link>
            <a
              href="http://localhost:8000/admin/"
              target="_blank"
              rel="noopener noreferrer"
              className="ad-link ad-link-green"
            >
              <FiExternalLink size={14} /> Django Admin
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="ad-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`ad-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonLoader type="list" count={5} />
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="ad-stats">
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.students_count || '0'}</div>
                    <div className="ad-stat-label">Users</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.found_items_count || '0'}</div>
                    <div className="ad-stat-label">Items</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.total_claims || '0'}</div>
                    <div className="ad-stat-label">Claims</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.total_reports || '0'}</div>
                    <div className="ad-stat-label">Reports</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.active_roles || '0'}</div>
                    <div className="ad-stat-label">Roles</div>
                  </div>
                  <div className="ad-stat">
                    <div className="ad-stat-value">{stats?.announcements_count || '0'}</div>
                    <div className="ad-stat-label">Announcements</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {TABS.filter(t => t.id !== 'overview').map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="ad-card"
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                    >
                      <tab.icon size={28} style={{ color: '#6366f1', marginBottom: 8 }} />
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                        {tab.label}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ITEMS TAB */}
            {activeTab === 'items' && (
              <>
                <div className="ad-search" style={{ marginBottom: 16 }}>
                  <div className="ad-search-input-wrapper">
                    <FiSearch size={14} className="ad-search-icon" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                {items?.length > 0 ? items
                  .filter(item => !search || item.title?.toLowerCase().includes(search.toLowerCase()))
                  .map(item => (
                    <div key={item.id} className="ad-card">
                      <div className="ad-card-row">
                        <div className="ad-card-info">
                          <div className="ad-card-title">{item.title}</div>
                          <div className="ad-card-meta">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{item.location_found}</span>
                            <span>•</span>
                            <span>{item.found_date}</span>
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
                  )) : <div className="ad-empty">
                  <div className="ad-empty-icon">📦</div>
                  <p>No items found</p>
                </div>
                }
              </>
            )}

            {/* CLAIMS TAB */}
            {activeTab === 'claims' && (
              <>
                {claims?.length > 0 ? claims.map(claim => (
                  <div key={claim.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{claim.item_title}</div>
                        <div className="ad-card-meta">
                          <span>Claimant: {claim.claimant_name}</span>
                          <span>•</span>
                          <span>{claim.claimant_phone}</span>
                          <span>•</span>
                          <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${claim.status === 'pending' ? 'ad-badge-yellow' :
                          claim.status === 'claimed' ? 'ad-badge-green' : 'ad-badge-red'
                          }`}>
                          {claim.status}
                        </span>
                        {claim.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(claim.id)}
                              className="ad-btn-sm ad-btn-approve"
                              disabled={approveMutation.isPending}
                            >
                              <FiCheck size={12} />
                              {approveMutation.isPending && approveMutation.variables === claim.id
                                ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(claim.id)}
                              className="ad-btn-sm ad-btn-reject"
                              disabled={rejectMutation.isPending}
                            >
                              <FiX size={12} />
                              {rejectMutation.isPending && rejectMutation.variables === claim.id
                                ? 'Rejecting...' : 'Reject'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">
                  <div className="ad-empty-icon">✅</div>
                  <p>No claims found</p>
                </div>}
              </>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <>
                {reports?.length > 0 ? reports.map(report => (
                  <div key={report.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">
                          {report.announcement_title || 'Reported Content'}
                        </div>
                        <div className="ad-card-meta">
                          <span>By: {report.reported_by_name}</span>
                          <span>•</span>
                          <span>Reason: {report.reason}</span>
                          <span>•</span>
                          <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${report.is_resolved ? 'ad-badge-green' : 'ad-badge-yellow'}`}>
                          {report.is_resolved ? 'Resolved' : 'Pending'}
                        </span>
                        {!report.is_resolved && (
                          <button
                            onClick={() => resolveReportMutation.mutate(report.id)}
                            className="ad-btn-sm ad-btn-resolve"
                            disabled={resolveReportMutation.isPending}
                          >
                            <FiCheck size={12} />
                            {resolveReportMutation.isPending && resolveReportMutation.variables === report.id
                              ? 'Resolving...' : 'Resolve'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">
                  <div className="ad-empty-icon">🚩</div>
                  <p>No reports found</p>
                </div>}
              </>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <>
                {announcements?.length > 0 ? announcements.map(a => (
                  <div key={a.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{a.title}</div>
                        <div className="ad-card-meta">
                          <span>By: {a.posted_by || 'Admin'}</span>
                          <span>•</span>
                          <span>{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${a.is_urgent ? 'ad-badge-red' : 'ad-badge-blue'}`}>
                          {a.is_urgent ? '🚨 Urgent' : 'Normal'}
                        </span>
                        <button
                          onClick={() => handleDeleteClick(a)}
                          className="ad-btn-sm ad-btn-delete"
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">
                  <div className="ad-empty-icon">📢</div>
                  <p>No announcements found</p>
                </div>}
              </>
            )}

            {/* OPPORTUNITIES TAB */}
            {activeTab === 'opportunities' && (
              <>
                {opportunities?.length > 0 ? opportunities.map(o => (
                  <div key={o.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{o.title}</div>
                        <div className="ad-card-meta">
                          <span>{o.category}</span>
                          <span>•</span>
                          <span>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">
                  <div className="ad-empty-icon">💼</div>
                  <p>No opportunities found</p>
                </div>}
              </>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="ad-modal-overlay">
          <div className="ad-modal-backdrop" onClick={handleCancelDelete} />
          <div className="ad-modal">
            <div className="ad-modal-header">
              <div className="ad-modal-icon">
                <FiAlertTriangle size={20} />
              </div>
              <div className="ad-modal-title">Delete Announcement</div>
            </div>
            <div className="ad-modal-body">
              <p>Are you sure you want to delete this announcement? This action cannot be undone.</p>
              <span className="ad-modal-highlight">{deleteConfirm.title}</span>
            </div>
            <div className="ad-modal-footer">
              <button
                className="ad-modal-btn ad-modal-cancel"
                onClick={handleCancelDelete}
                disabled={deleteAnnouncementMutation.isPending}
              >
                <FiX size={14} /> Cancel
              </button>
              <button
                className="ad-modal-btn ad-modal-delete"
                onClick={handleConfirmDelete}
                disabled={deleteAnnouncementMutation.isPending}
              >
                {deleteAnnouncementMutation.isPending ? (
                  <>
                    <span className="spinner" style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={14} /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}