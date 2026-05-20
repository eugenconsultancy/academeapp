import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import LikeButton from '../components/ui/LikeButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { getRelativeTime } from '../utils/time';
import toast from 'react-hot-toast';
import {
  FiBriefcase, FiAward, FiClipboard, FiMusic,
  FiTool, FiStar, FiExternalLink, FiFlag,
  FiCalendar, FiUser, FiFilter, FiX, FiPlus,
  FiSearch, FiRefreshCw, FiClock, FiAlertCircle,
  FiEdit3, FiTrash2, FiShare2, FiEye, FiChevronRight,
  FiTrendingUp, FiBookmark,
} from 'react-icons/fi';

const categoryConfig = {
  internship: { label: 'Internships', icon: FiBriefcase, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', emoji: '💼' },
  scholarship: { label: 'Scholarships', icon: FiAward, color: 'from-green-500 to-green-600', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', emoji: '🎓' },
  attachment: { label: 'Attachments', icon: FiClipboard, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', emoji: '📋' },
  workshop: { label: 'Workshops', icon: FiTool, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', emoji: '🔧' },
  competition: { label: 'Competitions', icon: FiStar, color: 'from-red-500 to-red-600', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', emoji: '🏆' },
  concert: { label: 'Events', icon: FiMusic, color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', emoji: '🎵' },
  other: { label: 'Others', icon: FiBriefcase, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', emoji: '📌' },
};

const sortOptions = [
  { value: 'latest', label: 'Newest', icon: FiClock },
  { value: 'popular', label: 'Popular', icon: FiTrendingUp },
  { value: 'expiring', label: 'Expiring Soon', icon: FiAlertCircle },
];

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportItemId, setReportItemId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '', description: '', category: 'internship', link: '', expires_in_days: 120,
  });
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';

  // Fetch opportunities
  const { data: opportunities, isLoading, refetch } = useQuery({
    queryKey: ['opportunities', category, sort],
    queryFn: async () => {
      const params = {};
      if (category) params.category = category;
      const response = await opportunitiesApi.list(params);
      let results = response.data || [];
      // Client-side sort
      if (sort === 'popular') results = [...results].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      if (sort === 'expiring') results = [...results].sort((a, b) => new Date(a.expires_at || 0) - new Date(b.expires_at || 0));
      return results;
    },
  });

  // Unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['opportunities-unread'],
    queryFn: async () => {
      const res = await opportunitiesApi.getUnreadCount();
      return res.data?.count || 0;
    },
  });

  // Mutations
  const likeMutation = useMutation({
    mutationFn: (id) => opportunitiesApi.toggleLike(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities'] }),
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, reason, description }) => opportunitiesApi.report(id, reason, description),
    onSuccess: () => { toast.success('Report submitted!'); setShowReportModal(false); setReportReason(''); setReportDescription(''); },
    onError: () => toast.error('Failed to submit report'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => opportunitiesApi.create(data),
    onSuccess: () => { toast.success('Opportunity created!'); setShowCreateModal(false); setCreateForm({ title: '', description: '', category: 'internship', link: '', expires_in_days: 120 }); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); },
    onError: () => toast.error('Failed to create opportunity'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => opportunitiesApi.delete(id),
    onSuccess: () => { toast.success('Opportunity deleted'); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleReport = (itemId) => { setReportItemId(itemId); setShowReportModal(true); };
  const handleDelete = async (id) => { if (!window.confirm('Delete this opportunity?')) return; deleteMutation.mutate(id); };

  const submitReport = () => {
    if (!reportReason) { toast.error('Please select a reason'); return; }
    reportMutation.mutate({ id: reportItemId, reason: reportReason, description: reportDescription });
  };

  // Filter by search
  const filteredOpportunities = search.trim()
    ? (opportunities || []).filter(o =>
      o.title?.toLowerCase().includes(search.toLowerCase()) ||
      o.description?.toLowerCase().includes(search.toLowerCase())
    )
    : opportunities;

  // Calculate expiry info helper
  const getExpiryInfo = (expiresAt) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Expired', color: 'text-red-500 bg-red-50 dark:bg-red-900/20', urgent: false };
    if (days <= 7) return { label: `${days}d left`, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', urgent: true };
    if (days <= 30) return { label: `${days}d left`, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', urgent: false };
    return null;
  };

  if (isLoading) return <SkeletonLoader type="list" count={5} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .opp-root { font-family: 'Outfit', sans-serif; max-width: 900px; margin: 0 auto; padding: 28px 20px 80px; animation: oppIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes oppIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .opp-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .opp-title h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; margin-bottom: 4px; }
        .opp-title p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; }
        .dark .opp-title h1 { color: #f8fafc; }
        .opp-header-btns { display: flex; gap: 8px; flex-wrap: wrap; }

        .opp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 14px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; cursor: pointer; transition: all 0.22s; color: #fff; }
        .opp-btn-create { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 6px 20px rgba(16,185,129,0.28); }
        .opp-btn-create:hover { transform: translateY(-2px); }
        .opp-btn-refresh { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; padding: 8px 14px; font-size: 0.8rem; }
        .opp-btn-refresh:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .opp-btn-refresh { border-color: #334155; color: #94a3b8; }

        /* Search bar */
        .opp-search-bar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
        .opp-search-wrap { flex: 1; min-width: 200px; position: relative; }
        .opp-search-wrap input { width: 100%; padding: 10px 14px 10px 38px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 500; color: #0f172a; outline: none; backdrop-filter: blur(8px); }
        .opp-search-wrap input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .dark .opp-search-wrap input { border-color: #334155; background: rgba(15,23,42,0.8); color: #f8fafc; }
        .opp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .opp-sort-select { padding: 10px 14px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .opp-sort-select { border-color: #334155; background: rgba(15,23,42,0.8); color: #94a3b8; }

        /* Category filters */
        .opp-categories { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .opp-cat-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 16px; border-radius: 99px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 600; color: #64748b; transition: all 0.15s; white-space: nowrap; }
        .opp-cat-btn:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .opp-cat-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; box-shadow: 0 2px 10px rgba(99,102,241,0.25); }
        .dark .opp-cat-btn { border-color: #334155; color: #94a3b8; }
        .dark .opp-cat-btn.active { background: #6366f1; border-color: #6366f1; }

        /* Cards */
        .opp-card { display: flex; background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 18px; backdrop-filter: blur(16px); box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06); margin-bottom: 12px; overflow: hidden; transition: all 0.22s; animation: oppIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .opp-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.1); }
        .dark .opp-card { background: rgba(12,16,24,0.85); border-color: rgba(255,255,255,0.05); }
        .opp-stripe { width: 4px; flex-shrink: 0; border-radius: 18px 0 0 18px; }
        .opp-body { flex: 1; padding: 18px 20px; }
        .opp-top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
        .opp-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .opp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 0.68rem; font-weight: 700; }
        .opp-title-link { text-decoration: none; color: inherit; }
        .opp-title-link h3 { font-size: 1rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 6px; line-height: 1.3; }
        .opp-title-link:hover h3 { color: #6366f1; }
        .dark .opp-title-link h3 { color: #f8fafc; }
        .dark .opp-title-link:hover h3 { color: #a5b4fc; }
        .opp-desc { font-size: 0.84rem; color: #64748b; line-height: 1.6; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .dark .opp-desc { color: #94a3b8; }
        .opp-bottom-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .opp-meta-left { display: flex; align-items: center; gap: 12px; }
        .opp-meta-item { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
        .opp-actions { display: flex; gap: 4px; }
        .opp-action-btn { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.15s; }
        .opp-action-btn:hover { background: rgba(99,102,241,0.08); color: #6366f1; }
        .opp-action-danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .opp-link-btn { display: inline-flex; align-items: center; gap: 4px; padding: 7px 14px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 0.75rem; font-weight: 700; text-decoration: none; transition: all 0.15s; }
        .opp-link-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.3); }

        /* Empty */
        .opp-empty { display: flex; flex-direction: column; align-items: center; padding: 64px 24px; text-align: center; }
        .opp-empty-icon { width: 72px; height: 72px; border-radius: 22px; background: rgba(99,102,241,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; font-size: 1.8rem; box-shadow: 0 6px 20px rgba(99,102,241,0.1); }
        .opp-empty h3 { font-size: 1.05rem; font-weight: 800; color: #334155; margin-bottom: 6px; }
        .dark .opp-empty h3 { color: #94a3b8; }
        .opp-empty p { font-size: 0.8rem; color: #94a3b8; }

        /* Modal */
        .opp-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .opp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .opp-modal { position: relative; z-index: 61; width: 100%; max-width: 520px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: oppIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .opp-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .opp-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .opp-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .opp-modal-title { color: #f8fafc; }
        .opp-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .opp-modal-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .opp-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
        .opp-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .opp-input { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); color: #0f172a; font-family: 'Outfit', sans-serif; font-size: 0.87rem; font-weight: 500; outline: none; resize: none; }
        .opp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .dark .opp-input { background: rgba(12,16,24,0.9); border-color: #334155; color: #f8fafc; }
        .opp-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; }
        .opp-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; }
        .opp-btn-submit { flex: 1; padding: 11px; border-radius: 12px; border: none; color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 6px 18px rgba(99,102,241,0.28); }
        .opp-btn-submit-danger { background: #ef4444; }
        .opp-report-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .opp-report-opt { padding: 10px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .opp-report-opt.active { background: #ef4444; color: #fff; border-color: #ef4444; }
        .dark .opp-report-opt { border-color: #334155; color: #94a3b8; }
      `}</style>

      <div className="opp-root">
        {/* Header */}
        <div className="opp-header">
          <div className="opp-title">
            <h1>Opportunities</h1>
            <p>Discover internships, scholarships, events & more {unreadCount > 0 && `(${unreadCount} new)`}</p>
          </div>
          <div className="opp-header-btns">
            <button onClick={() => refetch()} className="opp-btn opp-btn-refresh">
              <FiRefreshCw size={14} /> Refresh
            </button>
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="opp-btn opp-btn-create">
                <FiPlus size={15} /> Post Opportunity
              </button>
            )}
          </div>
        </div>

        {/* Search & Sort */}
        <div className="opp-search-bar">
          <div className="opp-search-wrap">
            <FiSearch size={15} className="opp-search-icon" />
            <input type="text" placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="opp-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Category Filters */}
        <div className="opp-categories">
          <button onClick={() => setCategory('')} className={`opp-cat-btn ${category === '' ? 'active' : ''}`}>🌟 All</button>
          {Object.entries(categoryConfig).map(([key, { label, icon: Icon }]) => (
            <button key={key} onClick={() => setCategory(key)} className={`opp-cat-btn ${category === key ? 'active' : ''}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* List */}
        {filteredOpportunities?.length > 0 ? (
          <div>
            {filteredOpportunities.map((opp, i) => {
              const config = categoryConfig[opp.category] || categoryConfig.other;
              const expiry = getExpiryInfo(opp.expires_at);
              return (
                <div key={opp.id} className="opp-card" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="opp-stripe" style={{ background: `linear-gradient(180deg, ${config.color.split(' ')[1] || '#6366f1'}, ${config.color.split(' ')[2] || '#8b5cf6'})` }} />
                  <div className="opp-body">
                    <div className="opp-top-row">
                      <div className="opp-badges">
                        <span className={`opp-badge ${config.bg} ${config.text}`}>
                          <config.icon size={11} />{config.label}
                        </span>
                        {expiry && <span className={`opp-badge ${expiry.color}`}><FiClock size={11} />{expiry.label}</span>}
                      </div>
                      <div className="opp-actions">
                        {isAdmin && (
                          <>
                            <button onClick={() => navigate(`/opportunities/${opp.id}`)} className="opp-action-btn" title="Edit"><FiEdit3 size={13} /></button>
                            <button onClick={() => handleDelete(opp.id)} className="opp-action-btn opp-action-danger" title="Delete"><FiTrash2 size={13} /></button>
                          </>
                        )}
                        <button onClick={() => handleReport(opp.id)} className="opp-action-btn opp-action-danger" title="Report"><FiFlag size={13} /></button>
                      </div>
                    </div>

                    <Link to={`/opportunities/${opp.id}`} className="opp-title-link">
                      <h3>{opp.title}</h3>
                    </Link>
                    <p className="opp-desc">{opp.description}</p>

                    <div className="opp-bottom-row">
                      <div className="opp-meta-left">
                        <LikeButton liked={opp.is_liked} count={opp.likes_count} onToggle={() => likeMutation.mutate(opp.id)} />
                        {opp.posted_by?.full_name && (
                          <span className="opp-meta-item"><FiUser size={11} />{opp.posted_by.full_name}</span>
                        )}
                        <span className="opp-meta-item"><FiCalendar size={11} />{getRelativeTime(opp.created_at)}</span>
                        <Link to={`/opportunities/${opp.id}`} className="opp-meta-item" style={{ color: '#6366f1' }}><FiEye size={11} />View</Link>
                      </div>
                      {opp.link && (
                        <a href={opp.link} target="_blank" rel="noopener noreferrer" className="opp-link-btn">
                          <FiExternalLink size={13} /> Apply
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="opp-empty">
            <div className="opp-empty-icon">{search ? '🔍' : categoryConfig[category]?.emoji || '💼'}</div>
            <h3>{search ? 'No results found' : 'No opportunities found'}</h3>
            <p>{search ? 'Try a different search term.' : category ? `No ${categoryConfig[category]?.label?.toLowerCase()} available right now.` : 'Check back later for new opportunities.'}</p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal-backdrop" onClick={() => setShowReportModal(false)} />
          <div className="opp-modal">
            <div className="opp-modal-header"><span className="opp-modal-title">Report Opportunity</span><button className="opp-modal-close" onClick={() => setShowReportModal(false)}><FiX size={16} /></button></div>
            <div className="opp-modal-body">
              <label className="opp-label">Reason</label>
              <div className="opp-report-options">
                {['spam', 'scam', 'expired', 'inappropriate', 'misleading', 'other'].map(r => (
                  <button key={r} className={`opp-report-opt ${reportReason === r ? 'active' : ''}`} onClick={() => setReportReason(r)}>
                    {r === 'spam' ? '🔗 Spam' : r === 'scam' ? '⚠️ Scam' : r === 'expired' ? '⏰ Expired' : r === 'inappropriate' ? '🚫 Inappropriate' : r === 'misleading' ? '❓ Misleading' : '📝 Other'}
                  </button>
                ))}
              </div>
              <textarea className="opp-input" rows={3} placeholder="Additional details (optional)" value={reportDescription} onChange={e => setReportDescription(e.target.value)} />
            </div>
            <div className="opp-modal-footer">
              <button className="opp-btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="opp-btn-submit opp-btn-submit-danger" onClick={submitReport} disabled={!reportReason}>Submit Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal (Admin) */}
      {showCreateModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal-backdrop" onClick={() => setShowCreateModal(false)} />
          <div className="opp-modal">
            <div className="opp-modal-header"><span className="opp-modal-title">Post Opportunity</span><button className="opp-modal-close" onClick={() => setShowCreateModal(false)}><FiX size={16} /></button></div>
            <div className="opp-modal-body">
              <div><label className="opp-label">Title</label><input className="opp-input" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g., Summer Internship at Google" /></div>
              <div><label className="opp-label">Description</label><textarea className="opp-input" rows={4} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} /></div>
              <div><label className="opp-label">Category</label><select className="opp-input" value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>{Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
              <div><label className="opp-label">Link (optional)</label><input className="opp-input" value={createForm.link} onChange={e => setCreateForm({ ...createForm, link: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div className="opp-modal-footer">
              <button className="opp-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="opp-btn-submit" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => createMutation.mutate(createForm)} disabled={!createForm.title.trim() || !createForm.description.trim()}>
                {createMutation.isPending ? 'Posting...' : 'Post Opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}