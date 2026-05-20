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

  // Mutations with immediate refetch
  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/approve/`),
    onSuccess: () => {
      toast.success('Claim approved');
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      queryClient.refetchQueries({ queryKey: ['admin-claims'] });
    },
    onError: () => toast.error('Failed to approve claim'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/found-items/admin/claims/${id}/reject/`),
    onSuccess: () => {
      toast.success('Claim rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      queryClient.refetchQueries({ queryKey: ['admin-claims'] });
    },
    onError: () => toast.error('Failed to reject claim'),
  });

  const resolveReportMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/announcements/reports/${id}/resolve/`),
    onSuccess: () => {
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.refetchQueries({ queryKey: ['admin-reports'] });
    },
    onError: () => toast.error('Failed to resolve report'),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/announcements/${id}/`),
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.refetchQueries({ queryKey: ['admin-announcements'] });
    },
    onError: () => toast.error('Failed to delete announcement'),
  });

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
        .ad-root { font-family: 'Outfit', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; animation: adIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes adIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .ad-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .ad-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .ad-header h1 { color: #f8fafc; }
        .ad-header-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .ad-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: transparent; font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .ad-link:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .ad-link-green { border-color: #10b981; color: #10b981; }
        .ad-link-green:hover { background: rgba(16,185,129,0.04); }
        .dark .ad-link { border-color: #334155; color: #94a3b8; }

        .ad-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 4px; backdrop-filter: blur(12px); }
        .dark .ad-tabs { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.05); }
        .ad-tab { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; border: none; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .ad-tab:hover { color: #0f172a; background: rgba(99,102,241,0.04); }
        .ad-tab.active { background: #6366f1; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .dark .ad-tab { color: #94a3b8; }
        .dark .ad-tab:hover { color: #f8fafc; }

        .ad-search { display: flex; gap: 8px; margin-bottom: 16px; }
        .ad-search input { flex: 1; padding: 9px 14px 9px 36px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; outline: none; position: relative; }
        .dark .ad-search input { background: rgba(15,23,42,0.8); border-color: #334155; color: #f8fafc; }

        .ad-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 24px; }
        .ad-stat { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 16px; text-align: center; backdrop-filter: blur(12px); }
        .dark .ad-stat { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .ad-stat-value { font-size: 1.6rem; font-weight: 900; color: #6366f1; }
        .ad-stat-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; }

        .ad-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; padding: 16px; margin-bottom: 8px; backdrop-filter: blur(12px); transition: all 0.2s; }
        .ad-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .dark .ad-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .ad-card-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ad-card-info { flex: 1; min-width: 0; }
        .ad-card-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
        .dark .ad-card-title { color: #f8fafc; }
        .ad-card-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
        .ad-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .ad-badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 700; }
        .ad-badge-green { background: rgba(16,185,129,0.1); color: #059669; }
        .ad-badge-yellow { background: rgba(245,158,11,0.1); color: #d97706; }
        .ad-badge-red { background: rgba(239,68,68,0.1); color: #dc2626; }
        .ad-badge-blue { background: rgba(99,102,241,0.1); color: #6366f1; }
        .ad-badge-gray { background: rgba(107,114,128,0.1); color: #6b7280; }

        .ad-btn-sm { padding: 6px 12px; border-radius: 8px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.15s; color: #fff; }
        .ad-btn-approve { background: #10b981; }
        .ad-btn-approve:hover { background: #059669; }
        .ad-btn-reject { background: #ef4444; }
        .ad-btn-reject:hover { background: #dc2626; }
        .ad-btn-resolve { background: #6366f1; }
        .ad-btn-resolve:hover { background: #4f46e5; }
        .ad-btn-delete { background: #ef4444; }
        .ad-btn-delete:hover { background: #dc2626; }
        .ad-btn-view { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .ad-btn-view:hover { background: rgba(0,0,0,0.03); }

        .ad-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
      `}</style>

      <div className="ad-root">
        {/* Header */}
        <div className="ad-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
              Manage items, claims, reports & more
            </p>
          </div>
          <div className="ad-header-links">
            <Link to="/admin/audit-logs" className="ad-link"><FiActivity size={14} /> Audit Logs</Link>
            <Link to="/admin/roles" className="ad-link"><FiUsers size={14} /> Roles</Link>
            <Link to="/governance" className="ad-link"><FiTrendingUp size={14} /> Governance</Link>
            <a href="http://localhost:8000/admin/" target="_blank" rel="noopener noreferrer" className="ad-link ad-link-green">
              <FiExternalLink size={14} /> Django Admin
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="ad-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`ad-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
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
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.students_count || '-'}</div><div className="ad-stat-label">Users</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.found_items_count || '-'}</div><div className="ad-stat-label">Items</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.total_claims || '-'}</div><div className="ad-stat-label">Claims</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.total_reports || '-'}</div><div className="ad-stat-label">Reports</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.active_roles || '-'}</div><div className="ad-stat-label">Roles</div></div>
                  <div className="ad-stat"><div className="ad-stat-value">{stats?.announcements_count || '-'}</div><div className="ad-stat-label">Announcements</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {TABS.filter(t => t.id !== 'overview').map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="ad-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      <tab.icon size={24} style={{ color: '#6366f1', marginBottom: 8 }} />
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{tab.label}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ITEMS TAB */}
            {activeTab === 'items' && (
              <>
                {items?.length > 0 ? items.map(item => (
                  <div key={item.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{item.title}</div>
                        <div className="ad-card-meta">{item.category} • {item.location_found} • {item.found_date}</div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${item.is_claimed ? 'ad-badge-green' : 'ad-badge-yellow'}`}>{item.is_claimed ? 'Claimed' : 'Available'}</span>
                        <span className="ad-badge ad-badge-blue">{item.status}</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">No items found</div>}
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
                        <div className="ad-card-meta">Claimant: {claim.claimant_name} • {claim.claimant_phone} • {new Date(claim.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${claim.status === 'pending' ? 'ad-badge-yellow' : claim.status === 'claimed' ? 'ad-badge-green' : 'ad-badge-red'}`}>{claim.status}</span>
                        {claim.status === 'pending' && (
                          <>
                            <button onClick={() => approveMutation.mutate(claim.id)} className="ad-btn-sm ad-btn-approve">Approve</button>
                            <button onClick={() => rejectMutation.mutate(claim.id)} className="ad-btn-sm ad-btn-reject">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">No claims found</div>}
              </>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <>
                {reports?.length > 0 ? reports.map(report => (
                  <div key={report.id} className="ad-card">
                    <div className="ad-card-row">
                      <div className="ad-card-info">
                        <div className="ad-card-title">{report.announcement_title || 'Reported Content'}</div>
                        <div className="ad-card-meta">By: {report.reported_by_name} • Reason: {report.reason} • {new Date(report.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${report.is_resolved ? 'ad-badge-green' : 'ad-badge-yellow'}`}>{report.is_resolved ? 'Resolved' : 'Pending'}</span>
                        {!report.is_resolved && (
                          <button onClick={() => resolveReportMutation.mutate(report.id)} className="ad-btn-sm ad-btn-resolve">Resolve</button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">No reports found</div>}
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
                        <div className="ad-card-meta">By: {a.posted_by || 'Admin'} • {new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="ad-card-actions">
                        <span className={`ad-badge ${a.is_urgent ? 'ad-badge-red' : 'ad-badge-blue'}`}>{a.is_urgent ? 'Urgent' : 'Normal'}</span>
                        <button onClick={() => deleteAnnouncementMutation.mutate(a.id)} className="ad-btn-sm ad-btn-delete">Delete</button>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">No announcements found</div>}
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
                        <div className="ad-card-meta">{o.category} • {new Date(o.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                )) : <div className="ad-empty">No opportunities found</div>}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}