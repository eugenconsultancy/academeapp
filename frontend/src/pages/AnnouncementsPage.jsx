import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../api/announcementsApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import ReportButton from '../components/ui/ReportButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { getRelativeTime } from '../utils/time';
import toast from 'react-hot-toast';
import {
  FiBell, FiAlertCircle, FiUser, FiCalendar,
  FiX, FiSend, FiPlus, FiInfo, FiEdit3, FiTrash2,
  FiFilter, FiSearch, FiEye, FiClock, FiCheckCircle,
  FiChevronDown, FiRefreshCw, FiInbox, FiTarget,
  FiExternalLink,
} from 'react-icons/fi';

/* ─── Announcement card ─────────────────────────── */
function AnnouncementCard({ a, onReport, onDelete, onEdit, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
  const daysLeft = a.expires_at
    ? Math.ceil((new Date(a.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <article
      className={`ann-card ${a.is_urgent ? 'ann-card-urgent' : ''} ${isExpired ? 'ann-card-expired' : ''}`}
      style={{ animationDelay: `${Math.random() * 80}ms` }}
    >
      {/* Left accent stripe */}
      <div
        className="ann-stripe"
        style={{
          background: a.is_urgent
            ? 'linear-gradient(180deg, #ef4444, #f97316)'
            : isExpired
              ? 'linear-gradient(180deg, #9ca3af, #d1d5db)'
              : 'linear-gradient(180deg, #6366f1, #8b5cf6)',
        }}
      />

      <div className="ann-body">
        {/* Header */}
        <div className="ann-head">
          <div className="ann-badges">
            {a.is_urgent && (
              <span className="badge badge-danger" style={{ gap: 4 }}>
                <FiAlertCircle size={11} /> Urgent
              </span>
            )}
            {isExpired && (
              <span className="badge badge-gray">
                <FiClock size={11} /> Expired
              </span>
            )}
            {!isExpired && daysLeft !== null && daysLeft <= 3 && (
              <span className="badge badge-warning">
                <FiClock size={11} /> {daysLeft}d left
              </span>
            )}
            {a.target && a.target !== 'entire_institution' && (
              <span className="badge badge-info">
                <FiTarget size={11} /> {a.target?.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="ann-head-right">
            {isAdmin && (
              <>
                <button onClick={() => onEdit(a)} className="ann-action-btn" title="Edit">
                  <FiEdit3 size={13} />
                </button>
                <button onClick={() => onDelete(a.id)} className="ann-action-btn ann-action-danger" title="Delete">
                  <FiTrash2 size={13} />
                </button>
              </>
            )}
            <ReportButton onReport={(reason, desc) => onReport(a.id, reason, desc)} />
          </div>
        </div>

        {/* Title - clickable to detail */}
        <Link to={`/announcements/${a.id}`} className="ann-title-link">
          <h3 className="ann-title">{a.title}</h3>
        </Link>

        {/* Content - expandable */}
        <div className={`ann-content ${!expanded && a.content?.length > 200 ? 'ann-content-clamped' : ''}`}>
          {a.content}
        </div>
        {a.content?.length > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="ann-expand-btn">
            {expanded ? 'Show less' : 'Read more'}
            <FiChevronDown size={12} className={expanded ? 'rotate-180' : ''} />
          </button>
        )}

        {/* Footer */}
        <div className="ann-footer">
          <span className="ann-meta-item">
            <span className="ann-meta-icon"><FiUser size={11} /></span>
            {a.posted_by || typeof a.posted_by === 'object' ? a.posted_by?.full_name || 'Admin' : 'Admin'}
          </span>
          <span className="ann-meta-sep" />
          <span className="ann-meta-item">
            <span className="ann-meta-icon"><FiCalendar size={11} /></span>
            {getRelativeTime(a.created_at)}
          </span>
          <span className="ann-meta-sep" />
          <Link to={`/announcements/${a.id}`} className="ann-meta-item ann-meta-link">
            <FiEye size={11} /> View
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Main page ─────────────────────────────────── */
export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', target: 'class_rep' });
  const [createForm, setCreateForm] = useState({
    title: '', content: '', target: 'entire_institution',
    is_urgent: false, expires_in_days: 21,
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const isLeader = isAdmin || ['student_leader', 'faculty_rep', 'class_rep'].includes(user?.role);

  // Fetch announcements
  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['announcements', filter],
    queryFn: async () => {
      const params = {};
      if (filter === 'urgent') params.is_urgent = true;
      if (filter === 'class') params.target = 'specific_class';
      const res = await announcementsApi.list(params);
      return Array.isArray(res.data) ? res.data : res.data?.results || [];
    },
  });

  // Request mutation
  const requestMutation = useMutation({
    mutationFn: (data) => announcementsApi.request(data),
    onSuccess: () => {
      toast.success('Request submitted successfully');
      setShowModal(false);
      setForm({ title: '', content: '', target: 'class_rep' });
    },
    onError: () => toast.error('Failed to submit request'),
  });

  // Create mutation (admin/leaders)
  const createMutation = useMutation({
    mutationFn: (data) => announcementsApi.create(data),
    onSuccess: () => {
      toast.success('Announcement published!');
      setShowCreateModal(false);
      setCreateForm({ title: '', content: '', target: 'entire_institution', is_urgent: false, expires_in_days: 21 });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => toast.error('Failed to publish announcement'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => announcementsApi.delete(id),
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: ({ id, reason, description }) => announcementsApi.report(id, reason, description),
    onSuccess: () => toast.success('Report submitted'),
    onError: () => toast.error('Failed to submit report'),
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (announcement) => {
    setEditData(announcement);
    setShowEditModal(true);
  };

  // Filter and search
  let filteredAnnouncements = announcements || [];
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredAnnouncements = filteredAnnouncements.filter(a =>
      a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q)
    );
  }

  const urgentCount = announcements?.filter(a => a.is_urgent).length ?? 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

        .ann-root {
          font-family: 'Outfit', sans-serif;
          max-width: 840px; margin: 0 auto;
          padding: 28px 20px 80px;
          animation: annIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes annIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .ann-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .ann-title-group h1 {
          font-size: clamp(1.5rem, 3.5vw, 2rem);
          font-weight: 900; letter-spacing: -0.04em;
          color: #0f172a; margin-bottom: 4px;
        }
        .ann-title-group p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; }
        .dark .ann-title-group h1 { color: #f8fafc; }

        .ann-header-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .ann-cta, .ann-cta-create {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 14px; border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 6px 20px rgba(99,102,241,0.28);
          transition: all 0.22s; flex-shrink: 0; color: #fff;
        }
        .ann-cta { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .ann-cta-create { background: linear-gradient(135deg, #10b981, #059669); }
        .ann-cta:hover, .ann-cta-create:hover { transform: translateY(-2px); }

        /* Filter bar */
        .ann-filter-bar {
          display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
          align-items: center;
        }
        .ann-filter-btn {
          padding: 7px 14px; border-radius: 99px; border: 1.5px solid #e2e8f0;
          background: transparent; cursor: pointer;
          font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 600;
          color: #64748b; transition: all 0.15s;
        }
        .ann-filter-btn.active {
          background: #6366f1; color: #fff; border-color: #6366f1;
        }
        .ann-filter-btn:hover:not(.active) { background: rgba(99,102,241,0.06); }
        .dark .ann-filter-btn { border-color: #334155; color: #94a3b8; }
        .dark .ann-filter-btn.active { background: #6366f1; border-color: #6366f1; }

        .ann-search-wrap {
          flex: 1; min-width: 180px; position: relative;
        }
        .ann-search-wrap input {
          width: 100%; padding: 8px 12px 8px 36px; border-radius: 99px;
          border: 1.5px solid #e2e8f0; background: transparent;
          font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 500;
          color: #0f172a; outline: none; transition: all 0.15s;
        }
        .ann-search-wrap input:focus { border-color: #6366f1; }
        .dark .ann-search-wrap input { border-color: #334155; color: #f8fafc; background: rgba(255,255,255,0.03); }
        .ann-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }

        /* Stats */
        .ann-stats { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .ann-stat-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 99px;
          font-size: 0.78rem; font-weight: 700;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(0,0,0,0.06);
          backdrop-filter: blur(12px);
          color: #0f172a;
        }
        .dark .ann-stat-pill { background: rgba(15,23,42,0.75); border-color: rgba(255,255,255,0.06); color: #f8fafc; }
        .ann-stat-dot { width: 8px; height: 8px; border-radius: 50%; }

        /* Cards */
        .ann-card {
          display: flex; align-items: stretch;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 18px;
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06);
          margin-bottom: 12px; overflow: hidden;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s;
          animation: annIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .ann-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .ann-card-expired { opacity: 0.7; }
        .dark .ann-card { background: rgba(12,16,24,0.8); border-color: rgba(255,255,255,0.06); }
        .ann-card-urgent { border-color: rgba(239,68,68,0.2); background: rgba(255,248,248,0.9); }
        .dark .ann-card-urgent { border-color: rgba(239,68,68,0.18); background: rgba(30,10,10,0.85); }

        .ann-stripe { width: 4px; flex-shrink: 0; border-radius: 18px 0 0 18px; }
        .ann-body { flex: 1; padding: 18px 20px; }
        .ann-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
        .ann-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .ann-head-right { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .ann-action-btn {
          width: 28px; height: 28px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          color: #94a3b8; transition: all 0.15s;
        }
        .ann-action-btn:hover { background: rgba(99,102,241,0.08); color: #6366f1; }
        .ann-action-danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

        .ann-title-link { text-decoration: none; color: inherit; }
        .ann-title {
          font-size: 1rem; font-weight: 800; color: #0f172a;
          letter-spacing: -0.02em; margin-bottom: 8px; line-height: 1.3;
        }
        .ann-title-link:hover .ann-title { color: #6366f1; }
        .dark .ann-title { color: #f8fafc; }
        .dark .ann-title-link:hover .ann-title { color: #a5b4fc; }

        .ann-content {
          font-size: 0.85rem; font-weight: 500; color: #475569;
          line-height: 1.65; white-space: pre-wrap; margin-bottom: 8px;
        }
        .ann-content-clamped {
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dark .ann-content { color: #94a3b8; }
        .ann-expand-btn {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.75rem; font-weight: 600; color: #6366f1;
          background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 10px;
        }

        .ann-footer { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .ann-meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
        .ann-meta-link { color: #6366f1; text-decoration: none; }
        .ann-meta-link:hover { text-decoration: underline; }
        .ann-meta-icon { width: 20px; height: 20px; border-radius: 6px; background: rgba(0,0,0,0.04); display: inline-flex; align-items: center; justify-content: center; }
        .dark .ann-meta-icon { background: rgba(255,255,255,0.05); }
        .ann-meta-sep { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }

        /* Badges */
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 0.68rem; font-weight: 700; }
        .badge-danger { background: rgba(239,68,68,0.1); color: #dc2626; }
        .badge-gray { background: rgba(107,114,128,0.1); color: #6b7280; }
        .badge-warning { background: rgba(245,158,11,0.1); color: #d97706; }
        .badge-info { background: rgba(6,182,212,0.1); color: #0891b2; }

        .ann-empty { display: flex; flex-direction: column; align-items: center; padding: 64px 24px; text-align: center; }
        .ann-empty-icon { width: 72px; height: 72px; border-radius: 22px; background: rgba(99,102,241,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; font-size: 1.8rem; box-shadow: 0 6px 20px rgba(99,102,241,0.1); }
        .ann-empty h3 { font-size: 1.05rem; font-weight: 800; color: #334155; margin-bottom: 6px; }
        .dark .ann-empty h3 { color: #94a3b8; }
        .ann-empty p { font-size: 0.8rem; color: #94a3b8; }

        /* Modal */
        .ann-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ann-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .ann-modal { position: relative; z-index: 61; width: 100%; max-width: 520px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: annIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .ann-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .ann-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .dark .ann-modal-header { border-bottom-color: rgba(255,255,255,0.06); }
        .ann-modal-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; }
        .dark .ann-modal-title { color: #f8fafc; }
        .ann-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.15s; }
        .ann-modal-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .ann-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
        .ann-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .ann-input { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid rgba(226,232,240,0.9); background: rgba(255,255,255,0.9); color: #0f172a; font-family: 'Outfit', sans-serif; font-size: 0.87rem; font-weight: 500; outline: none; transition: all 0.15s; resize: none; }
        .ann-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .ann-input::placeholder { color: #94a3b8; }
        .dark .ann-input { background: rgba(12,16,24,0.9); border-color: rgba(51,65,85,0.7); color: #f8fafc; }
        .ann-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; }
        .dark .ann-label { color: #6b7280; }
        .ann-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid rgba(226,232,240,0.9); background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; transition: all 0.15s; }
        .ann-btn-submit { flex: 1; padding: 11px; border-radius: 12px; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 6px 18px rgba(99,102,241,0.28); transition: all 0.18s; }
        .ann-btn-submit:hover { transform: translateY(-1px); }
        .ann-btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .ann-notice { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.12); font-size: 0.75rem; color: #4f46e5; font-weight: 500; }
        .dark .ann-notice { background: rgba(99,102,241,0.1); color: #a5b4fc; }

        /* Checkbox row */
        .ann-check-row { display: flex; align-items: center; gap: 8px; }
        .ann-check-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #6366f1; }
      `}</style>

      <div className="ann-root">
        {/* Header */}
        <div className="ann-header">
          <div className="ann-title-group">
            <h1>Announcements</h1>
            <p>Stay updated with campus news and notices</p>
          </div>
          <div className="ann-header-btns">
            {/* Create announcement (leaders only) */}
            {isLeader && (
              <button className="ann-cta-create" onClick={() => setShowCreateModal(true)}>
                <FiPlus size={15} /> Create
              </button>
            )}
            {/* Request announcement (all users) */}
            <button className="ann-cta" onClick={() => setShowModal(true)}>
              <FiSend size={15} /> Request
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="ann-filter-bar">
          {['all', 'urgent', 'class'].map(f => (
            <button key={f} className={`ann-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'urgent' ? 'Urgent' : 'My Class'}
            </button>
          ))}
          <div className="ann-search-wrap">
            <FiSearch size={14} className="ann-search-icon" />
            <input type="text" placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => refetch()} className="ann-action-btn" title="Refresh">
            <FiRefreshCw size={14} />
          </button>
        </div>

        {/* Stats */}
        {!isLoading && announcements && (
          <div className="ann-stats">
            <span className="ann-stat-pill">
              <span className="ann-stat-dot" style={{ background: '#6366f1' }} />
              {announcements.length} Total
            </span>
            {urgentCount > 0 && (
              <span className="ann-stat-pill">
                <span className="ann-stat-dot" style={{ background: '#ef4444' }} />
                {urgentCount} Urgent
              </span>
            )}
            {isLeader && (
              <Link to="/announcements/requests" className="ann-stat-pill" style={{ textDecoration: 'none' }}>
                <FiInbox size={14} /> Requests
              </Link>
            )}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <SkeletonLoader type="list" count={4} />
        ) : filteredAnnouncements.length > 0 ? (
          <div>
            {filteredAnnouncements.map((a, i) => (
              <div key={a.id} style={{ animationDelay: `${i * 50}ms` }}>
                <AnnouncementCard
                  a={a}
                  isAdmin={isAdmin}
                  onReport={(id, reason, desc) => reportMutation.mutate({ id, reason, description: desc })}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="ann-empty">
            <div className="ann-empty-icon">{search ? '🔍' : '📭'}</div>
            <h3>{search ? 'No results found' : 'No announcements yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Check back later for updates.'}</p>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="ann-modal-overlay">
          <div className="ann-modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="ann-modal">
            <div className="ann-modal-header">
              <span className="ann-modal-title">Request an Announcement</span>
              <button className="ann-modal-close" onClick={() => setShowModal(false)}><FiX size={16} /></button>
            </div>
            <div className="ann-modal-body">
              <div className="ann-notice"><FiInfo size={14} style={{ flexShrink: 0, marginTop: 1 }} />Your request will be reviewed by the class rep or student leaders.</div>
              <div><label className="ann-label">Title</label><input type="text" className="ann-input" placeholder="e.g., CATs postponed to Friday" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="ann-label">Message</label><textarea className="ann-input" placeholder="Describe the announcement…" rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
              <div><label className="ann-label">Send To</label><select className="ann-input" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}><option value="class_rep">Class Rep</option><option value="student_leaders">Student Leaders</option><option value="both">Both</option></select></div>
            </div>
            <div className="ann-modal-footer">
              <button className="ann-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ann-btn-submit" disabled={!form.title.trim() || !form.content.trim() || requestMutation.isPending} onClick={() => requestMutation.mutate(form)}>
                <FiSend size={14} />{requestMutation.isPending ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal (Leaders) */}
      {showCreateModal && (
        <div className="ann-modal-overlay">
          <div className="ann-modal-backdrop" onClick={() => setShowCreateModal(false)} />
          <div className="ann-modal">
            <div className="ann-modal-header">
              <span className="ann-modal-title">Create Announcement</span>
              <button className="ann-modal-close" onClick={() => setShowCreateModal(false)}><FiX size={16} /></button>
            </div>
            <div className="ann-modal-body">
              <div><label className="ann-label">Title</label><input type="text" className="ann-input" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></div>
              <div><label className="ann-label">Content</label><textarea className="ann-input" rows={4} value={createForm.content} onChange={e => setCreateForm({ ...createForm, content: e.target.value })} /></div>
              <div><label className="ann-label">Target</label><select className="ann-input" value={createForm.target} onChange={e => setCreateForm({ ...createForm, target: e.target.value })}><option value="entire_institution">Entire Institution</option><option value="specific_class">Specific Class</option></select></div>
              <div className="ann-check-row"><input type="checkbox" id="is_urgent" checked={createForm.is_urgent} onChange={e => setCreateForm({ ...createForm, is_urgent: e.target.checked })} /><label htmlFor="is_urgent" className="ann-label" style={{ margin: 0 }}>Mark as Urgent</label></div>
            </div>
            <div className="ann-modal-footer">
              <button className="ann-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="ann-btn-submit" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={!createForm.title.trim() || !createForm.content.trim() || createMutation.isPending} onClick={() => createMutation.mutate(createForm)}>
                <FiSend size={14} />{createMutation.isPending ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}