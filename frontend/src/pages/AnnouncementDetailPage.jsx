import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiArrowLeft, FiAlertTriangle, FiClock, FiUser, FiFlag,
    FiTrash2, FiEdit3, FiShare2, FiTarget, FiCalendar,
    FiEye, FiCopy, FiCheck, FiRefreshCw, FiChevronRight,
    FiHome, FiBell, FiInfo,
} from 'react-icons/fi';

export default function AnnouncementDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [announcement, setAnnouncement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [reportReason, setReportReason] = useState('spam');
    const [reportDescription, setReportDescription] = useState('');
    const [reporting, setReporting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', content: '', is_urgent: false });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAnnouncement();
    }, [id]);

    const fetchAnnouncement = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await announcementsApi.get(id);   // Axios response
            const data = response.data;                        // extract the actual announcement
            setAnnouncement(data);
            setEditForm({
                title: data.title || '',
                content: data.content || '',
                is_urgent: data.is_urgent || false,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load announcement');
        } finally {
            setLoading(false);
        }
    };

    const handleReport = async () => {
        setReporting(true);
        try {
            // FIXED: pass a single object { reason, description }
            await announcementsApi.report(id, {
                reason: reportReason,
                description: reportDescription,
            });
            toast.success('Report submitted successfully');
            setShowReportModal(false);
            setReportDescription('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit report');
        } finally {
            setReporting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await announcementsApi.delete(id);
            toast.success('Announcement deleted');
            navigate('/announcements');
        } catch (err) {
            toast.error('Failed to delete announcement');
        }
    };

    const handleEdit = async () => {
        if (!editForm.title.trim() || !editForm.content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        setSaving(true);
        try {
            await announcementsApi.update(id, editForm);
            toast.success('Announcement updated!');
            setShowEditModal(false);
            fetchAnnouncement();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: announcement?.title, url });
            } catch (err) {
                // User cancelled
            }
        } else {
            handleCopyLink();
        }
    };

    // Calculate expiry info
    const expiresAt = announcement?.expires_at ? new Date(announcement.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    const daysLeft = expiresAt
        ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    const isAdmin = user?.role === 'admin';
    const isOwner = user?.id === announcement?.posted_by?.id;
    const canEdit = isAdmin || isOwner;
    const initials = announcement?.posted_by?.full_name
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <SkeletonLoader type="detail" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiAlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h2>
                    <p className="text-red-500 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={fetchAnnouncement}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <FiRefreshCw size={16} /> Try Again
                        </button>
                        <Link
                            to="/announcements"
                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            <FiArrowLeft size={16} /> Back
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Not found
    if (!announcement) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiInfo className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not Found</h2>
                    <p className="text-gray-500 mb-6">This announcement doesn't exist or has been removed.</p>
                    <Link
                        to="/announcements"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md transition-all"
                    >
                        <FiArrowLeft size={16} /> Back to Announcements
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

        .ad-root {
          font-family: 'Outfit', sans-serif;
          max-width: 760px; margin: 0 auto;
          padding: 32px 20px 80px;
          animation: adIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes adIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        /* Breadcrumb */
        .ad-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; font-weight: 600; color: #94a3b8;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .ad-breadcrumb a {
          color: #6366f1; text-decoration: none;
          display: flex; align-items: center; gap: 4px;
        }
        .ad-breadcrumb a:hover { text-decoration: underline; }
        .ad-breadcrumb .ad-bc-current { color: #64748b; }

        /* Alert banners */
        .ad-alert {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 14px;
          font-size: 0.84rem; font-weight: 600; margin-bottom: 20px;
        }
        .ad-alert-urgent {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.18);
          color: #dc2626;
        }
        .ad-alert-expired {
          background: rgba(107,114,128,0.08);
          border: 1px solid rgba(107,114,128,0.15);
          color: #6b7280;
        }
        .ad-alert-warning {
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.15);
          color: #d97706;
        }
        .dark .ad-alert-urgent { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.25); }
        .dark .ad-alert-expired { background: rgba(107,114,128,0.15); border-color: rgba(107,114,128,0.2); }
        .dark .ad-alert-warning { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.2); }

        /* Card */
        .ad-card {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 22px; padding: 28px 32px;
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08);
        }
        .dark .ad-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        /* Title */
        .ad-title {
          font-size: clamp(1.4rem, 3vw, 1.8rem);
          font-weight: 900; letter-spacing: -0.03em;
          color: #0f172a; margin-bottom: 16px; line-height: 1.3;
        }
        .dark .ad-title { color: #f8fafc; }

        /* Meta bar */
        .ad-meta-bar {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: 12px; padding-bottom: 20px; margin-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .dark .ad-meta-bar { border-bottom-color: rgba(255,255,255,0.06); }
        .ad-meta-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; font-weight: 600; color: #64748b;
        }
        .dark .ad-meta-item { color: #94a3b8; }
        .ad-meta-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(0,0,0,0.04);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dark .ad-meta-icon { background: rgba(255,255,255,0.05); }
        .ad-meta-sep { width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
        .ad-meta-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 0.6rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Badges */
        .ad-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 99px;
          font-size: 0.7rem; font-weight: 700;
        }
        .ad-badge-target { background: rgba(6,182,212,0.1); color: #0891b2; }
        .ad-badge-expiry { background: rgba(245,158,11,0.1); color: #d97706; }
        .ad-badge-expired { background: rgba(107,114,128,0.1); color: #6b7280; }
        .ad-badge-report { background: rgba(239,68,68,0.08); color: #dc2626; }

        /* Content */
        .ad-content {
          font-size: 0.95rem; line-height: 1.8; color: #334155;
          white-space: pre-wrap; margin-bottom: 28px;
        }
        .dark .ad-content { color: #cbd5e1; }

        /* Action bar */
        .ad-actions {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding-top: 20px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .dark .ad-actions { border-top-color: rgba(255,255,255,0.06); }
        .ad-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s; text-decoration: none;
        }
        .ad-btn-report { color: #dc2626; background: rgba(239,68,68,0.06); }
        .ad-btn-report:hover { background: rgba(239,68,68,0.12); }
        .ad-btn-edit { color: #6366f1; background: rgba(99,102,241,0.06); }
        .ad-btn-edit:hover { background: rgba(99,102,241,0.12); }
        .ad-btn-delete { color: #dc2626; background: rgba(239,68,68,0.06); }
        .ad-btn-delete:hover { background: rgba(239,68,68,0.12); }
        .ad-btn-share { color: #0891b2; background: rgba(6,182,212,0.06); }
        .ad-btn-share:hover { background: rgba(6,182,212,0.12); }

        /* Modal */
        .ad-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .ad-modal { position: relative; z-index: 61; width: 100%; max-width: 500px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: adIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .ad-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .ad-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .dark .ad-modal-header { border-bottom-color: rgba(255,255,255,0.06); }
        .ad-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .ad-modal-title { color: #f8fafc; }
        .ad-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .ad-modal-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .ad-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
        .ad-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .ad-input { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); color: #0f172a; font-family: 'Outfit', sans-serif; font-size: 0.87rem; font-weight: 500; outline: none; resize: none; }
        .ad-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .dark .ad-input { background: rgba(12,16,24,0.9); border-color: #334155; color: #f8fafc; }
        .ad-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; }
        .ad-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; }
        .ad-btn-primary { flex: 1; padding: 11px; border-radius: 12px; border: none; color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .ad-btn-danger { background: #ef4444; }
        .ad-btn-danger:hover { background: #dc2626; }
        .ad-btn-save { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .ad-btn-submit { background: #ef4444; }
        .ad-check-row { display: flex; align-items: center; gap: 8px; }
        .ad-check-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #6366f1; }
      `}</style>

            <div className="ad-root">
                {/* Breadcrumb */}
                <nav className="ad-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/announcements"><FiBell size={13} /> Announcements</Link>
                    <FiChevronRight size={12} />
                    <span className="ad-bc-current">{announcement.title?.substring(0, 40)}{announcement.title?.length > 40 ? '...' : ''}</span>
                </nav>

                {/* Alerts */}
                {announcement.is_urgent && (
                    <div className="ad-alert ad-alert-urgent">
                        <FiAlertTriangle size={18} /> This is an urgent announcement
                    </div>
                )}
                {isExpired && (
                    <div className="ad-alert ad-alert-expired">
                        <FiClock size={18} /> This announcement has expired
                    </div>
                )}
                {!isExpired && daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
                    <div className="ad-alert ad-alert-warning">
                        <FiClock size={18} /> Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </div>
                )}

                {/* Main Card */}
                <div className="ad-card">
                    {/* Title */}
                    <h1 className="ad-title">{announcement.title}</h1>

                    {/* Meta bar */}
                    <div className="ad-meta-bar">
                        <div className="ad-meta-avatar">{initials}</div>
                        <span className="ad-meta-item">
                            <FiUser size={13} />
                            {announcement.posted_by?.full_name || 'Admin'}
                        </span>
                        <span className="ad-meta-sep" />
                        <span className="ad-meta-item">
                            <FiCalendar size={13} />
                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </span>
                        <span className="ad-meta-sep" />
                        <span className="ad-meta-item">
                            <FiClock size={13} />
                            {new Date(announcement.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </span>
                        {announcement.target && (
                            <>
                                <span className="ad-meta-sep" />
                                <span className="ad-badge ad-badge-target">
                                    <FiTarget size={11} /> {announcement.target?.replace(/_/g, ' ')}
                                </span>
                            </>
                        )}
                        {expiresAt && (
                            <span className={`ad-badge ${isExpired ? 'ad-badge-expired' : 'ad-badge-expiry'}`}>
                                <FiCalendar size={11} />
                                {isExpired ? 'Expired' : `Expires ${expiresAt.toLocaleDateString()}`}
                            </span>
                        )}
                    </div>

                    {/* Content — now correctly displayed */}
                    <div className="ad-content">
                        {announcement.content?.split('\n').map((paragraph, i) => (
                            <p key={i} style={{ marginBottom: '0.8em' }}>
                                {paragraph}
                            </p>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="ad-actions">
                        <button onClick={handleShare} className="ad-btn ad-btn-share">
                            {copied ? <FiCheck size={15} /> : <FiShare2 size={15} />}
                            {copied ? 'Copied!' : 'Share'}
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="ad-btn ad-btn-report">
                            <FiFlag size={15} /> Report
                        </button>
                        {canEdit && (
                            <>
                                <button onClick={() => setShowEditModal(true)} className="ad-btn ad-btn-edit">
                                    <FiEdit3 size={15} /> Edit
                                </button>
                                <button onClick={() => setShowDeleteConfirm(true)} className="ad-btn ad-btn-delete">
                                    <FiTrash2 size={15} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="ad-modal-overlay">
                    <div className="ad-modal-backdrop" onClick={() => setShowReportModal(false)} />
                    <div className="ad-modal">
                        <div className="ad-modal-header">
                            <span className="ad-modal-title">Report Announcement</span>
                            <button className="ad-modal-close" onClick={() => setShowReportModal(false)}><FiArrowLeft size={16} /></button>
                        </div>
                        <div className="ad-modal-body">
                            <div>
                                <label className="ad-label">Reason</label>
                                <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="ad-input">
                                    <option value="spam">Spam</option>
                                    <option value="inappropriate">Inappropriate Content</option>
                                    <option value="misinformation">Misinformation</option>
                                    <option value="harassment">Harassment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="ad-label">Description (optional)</label>
                                <textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} rows={3} className="ad-input" placeholder="Additional details..." />
                            </div>
                        </div>
                        <div className="ad-modal-footer">
                            <button className="ad-btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
                            <button className="ad-btn-primary ad-btn-submit" onClick={handleReport} disabled={reporting}>
                                {reporting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="ad-modal-overlay">
                    <div className="ad-modal-backdrop" onClick={() => setShowEditModal(false)} />
                    <div className="ad-modal">
                        <div className="ad-modal-header">
                            <span className="ad-modal-title">Edit Announcement</span>
                            <button className="ad-modal-close" onClick={() => setShowEditModal(false)}><FiArrowLeft size={16} /></button>
                        </div>
                        <div className="ad-modal-body">
                            <div><label className="ad-label">Title</label><input type="text" className="ad-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
                            <div><label className="ad-label">Content</label><textarea className="ad-input" rows={5} value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} /></div>
                            <div className="ad-check-row">
                                <input type="checkbox" id="edit_urgent" checked={editForm.is_urgent} onChange={e => setEditForm({ ...editForm, is_urgent: e.target.checked })} />
                                <label htmlFor="edit_urgent" className="ad-label" style={{ margin: 0 }}>Mark as Urgent</label>
                            </div>
                        </div>
                        <div className="ad-modal-footer">
                            <button className="ad-btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="ad-btn-primary ad-btn-save" onClick={handleEdit} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="ad-modal-overlay">
                    <div className="ad-modal-backdrop" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="ad-modal">
                        <div className="ad-modal-header">
                            <span className="ad-modal-title">Delete Announcement</span>
                            <button className="ad-modal-close" onClick={() => setShowDeleteConfirm(false)}><FiArrowLeft size={16} /></button>
                        </div>
                        <div className="ad-modal-body">
                            <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete this announcement? This action cannot be undone.</p>
                        </div>
                        <div className="ad-modal-footer">
                            <button className="ad-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="ad-btn-primary ad-btn-danger" onClick={handleDelete}>
                                <FiTrash2 size={15} /> Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}