// frontend/src/pages/FoundItemDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { foundItemsApi } from '../api/foundItemsApi';
import { useAuth } from '../contexts/AuthContext';
import { BlurredImage, FoundItemImage } from '../components/shared/BlurredImage';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiArrowLeft, FiMapPin, FiCalendar, FiShield, FiDollarSign,
    FiSend, FiCheckCircle, FiClock, FiUser, FiHome, FiPackage,
    FiChevronRight, FiShare2, FiCopy, FiFlag, FiRefreshCw,
    FiAlertTriangle, FiDownload, FiInfo, FiX, FiEye,
} from 'react-icons/fi';

const CATEGORY_LABELS = { id: 'Student ID', bank_card: 'Bank Card', keys: 'Keys', gadget: 'Gadget', document: 'Document', other: 'Other' };
const CATEGORY_ICONS = { id: '🪪', bank_card: '💳', keys: '🔑', gadget: '📱', document: '📄', other: '📦' };

export default function FoundItemDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tipMessage, setTipMessage] = useState('');
    const [sendingTip, setSendingTip] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [ownershipVerified, setOwnershipVerified] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => { fetchItem(); }, [id]);

    const fetchItem = async () => {
        setLoading(true); setError(null);
        try {
            const res = await foundItemsApi.getItem(id);
            const data = res.data || res;
            setItem(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load item');
        } finally { setLoading(false); }
    };

    const handleVerifyOwnership = async () => {
        setVerifying(true);
        try {
            const res = await foundItemsApi.verifyOwnership(id);
            const result = res.data || res;
            if (result.verified) {
                setOwnershipVerified(true);
                toast.success('Ownership verified!');
            } else {
                toast.error(result.error || 'Verification failed');
            }
        } catch (err) {
            // Log 422 validation errors for debugging
            if (err.response?.status === 422) {
                console.error("422 Validation Error:", err.response.data.detail);
            }
            toast.error(err.response?.data?.error || 'Verification failed');
        } finally { setVerifying(false); }
    };

    const handleClaimNow = () => {
        navigate(`/found-items/${id}/claim`);
    };

    const handleSendTip = async () => {
        if (!tipMessage.trim()) return;
        setSendingTip(true);
        try { await foundItemsApi.sendTip(id, tipMessage); toast.success('Tip sent!'); setTipMessage(''); }
        catch { toast.error('Failed to send tip'); }
        finally { setSendingTip(false); }
    };

    const handleReport = async () => {
        try { await foundItemsApi.reportItem(id, reportReason); toast.success('Report submitted'); setShowReportModal(false); }
        catch { toast.error('Failed to report'); }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); toast.success('Link copied!'); setTimeout(() => setCopied(false), 2000); });
    };

    const isOwner = item?.posted_by?.id === user?.id;
    const categoryLabel = CATEGORY_LABELS[item?.category] || item?.category;
    const categoryIcon = CATEGORY_ICONS[item?.category] || '📦';

    if (loading) return <div className="min-h-screen py-8 px-4"><div className="max-w-3xl mx-auto"><SkeletonLoader type="detail" /></div></div>;
    if (error) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiAlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h2>
                    <p className="text-red-500 mb-6">{error}</p>
                    <button onClick={fetchItem} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2 mx-auto">
                        <FiRefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        );
    }
    if (!item) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiInfo className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not Found</h2>
                    <Link to="/found-items" className="text-blue-500 hover:underline">Back to Found Items</Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .fid-root { font-family: 'Outfit', sans-serif; max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; animation: fidIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes fidIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fid-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .fid-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .fid-breadcrumb a:hover { text-decoration: underline; }
        .fid-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; overflow: hidden; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
        .dark .fid-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }
        .fid-img { aspect-ratio: 16/9; background: rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: center; }
        .fid-body { padding: 24px 28px; }
        .fid-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .fid-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; }
        .fid-badge-blue { background: rgba(99,102,241,0.1); color: #6366f1; }
        .fid-badge-green { background: rgba(16,185,129,0.1); color: #059669; }
        .fid-badge-amber { background: rgba(245,158,11,0.1); color: #d97706; }
        .fid-title { font-size: clamp(1.3rem, 3vw, 1.7rem); font-weight: 900; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.03em; }
        .dark .fid-title { color: #f8fafc; }
        .fid-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        @media (max-width: 500px) { .fid-grid { grid-template-columns: 1fr; } }
        .fid-detail { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: rgba(0,0,0,0.02); border-radius: 12px; }
        .dark .fid-detail { background: rgba(255,255,255,0.03); }
        .fid-detail-icon { color: #94a3b8; margin-top: 2px; flex-shrink: 0; }
        .fid-detail-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
        .fid-detail-value { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
        .dark .fid-detail-value { color: #f8fafc; }
        .fid-desc { padding: 14px; background: rgba(0,0,0,0.02); border-radius: 14px; margin-bottom: 20px; font-size: 0.88rem; color: #64748b; line-height: 1.7; }
        .dark .fid-desc { background: rgba(255,255,255,0.03); color: #94a3b8; }
        .fid-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.06); }
        .dark .fid-actions { border-top-color: rgba(255,255,255,0.06); }
        .fid-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-decoration: none; }
        .fid-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .fid-btn-primary:hover { transform: translateY(-1px); }
        .fid-btn-green { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
        .fid-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .fid-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .fid-btn-danger { background: transparent; border: 1.5px solid #fecaca; color: #dc2626; }
        .fid-btn-danger:hover { background: rgba(239,68,68,0.06); }
        .fid-tip-row { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06); }
        .fid-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .fid-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .fid-modal { position: relative; z-index: 61; width: 100%; max-width: 440px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: fidIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .fid-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .fid-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .fid-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .fid-modal-title { color: #f8fafc; }
        .fid-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .fid-modal-body { padding: 20px 22px; }
        .fid-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .fid-input { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); color: #0f172a; font-family: 'Outfit', sans-serif; font-size: 0.87rem; outline: none; resize: none; }
        .fid-input:focus { border-color: #6366f1; }
        .dark .fid-input { background: rgba(12,16,24,0.9); border-color: #334155; color: #f8fafc; }
        .fid-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; }
        .fid-btn-submit { flex: 1; padding: 11px; border-radius: 12px; border: none; background: #ef4444; color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; }
      `}</style>
            <div className="fid-root">
                <nav className="fid-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/found-items"><FiPackage size={13} /> Found Items</Link>
                    <FiChevronRight size={12} />
                    <span>{item.title?.substring(0, 30)}</span>
                </nav>
                <div className="fid-card">
                    {item.blurred_image_url ? (
                        <div className="fid-img">
                            <FoundItemImage src={item.blurred_image_url} alt={item.title} />
                        </div>
                    ) : null}
                    <div className="fid-body">
                        <div className="fid-badges">
                            <span className="fid-badge fid-badge-blue">{categoryIcon} {categoryLabel}</span>
                            {item.is_claimed && <span className="fid-badge fid-badge-green"><FiCheckCircle size={11} /> Claimed</span>}
                            {item.is_fee_required && <span className="fid-badge fid-badge-amber"><FiDollarSign size={11} /> Fee Required (KES 100)</span>}
                        </div>
                        <h1 className="fid-title">{item.title}</h1>
                        <div className="fid-grid">
                            <div className="fid-detail"><FiMapPin size={16} className="fid-detail-icon" /><div><p className="fid-detail-label">Location Found</p><p className="fid-detail-value">{item.location_found}</p></div></div>
                            <div className="fid-detail"><FiCalendar size={16} className="fid-detail-icon" /><div><p className="fid-detail-label">Date Found</p><p className="fid-detail-value">{new Date(item.found_date).toLocaleDateString()}</p></div></div>
                            <div className="fid-detail"><FiUser size={16} className="fid-detail-icon" /><div><p className="fid-detail-label">Posted By</p><p className="fid-detail-value">{item.posted_by?.full_name || 'Anonymous'}</p></div></div>
                            <div className="fid-detail"><FiClock size={16} className="fid-detail-icon" /><div><p className="fid-detail-label">Posted</p><p className="fid-detail-value">{new Date(item.created_at).toLocaleDateString()}</p></div></div>
                        </div>
                        {item.description && <div className="fid-desc">{item.description}</div>}
                        {!isOwner && !item.is_claimed && (
                            <div className="fid-actions">
                                {!ownershipVerified ? (
                                    <button onClick={handleVerifyOwnership} disabled={verifying} className="fid-btn fid-btn-primary" style={{ flex: 1 }}>
                                        {verifying ? 'Verifying...' : '🔐 Verify Ownership'}
                                    </button>
                                ) : (
                                    <button onClick={handleClaimNow} className="fid-btn fid-btn-green" style={{ flex: 1 }}>
                                        ✅ Proceed to Claim
                                    </button>
                                )}
                                <button onClick={() => setShowReportModal(true)} className="fid-btn fid-btn-danger"><FiFlag size={14} /></button>
                                <button onClick={handleCopyLink} className="fid-btn fid-btn-outline">{copied ? <FiCheckCircle size={14} /> : <FiShare2 size={14} />}</button>
                            </div>
                        )}
                        {!isOwner && (
                            <div className="fid-tip-row">
                                <input type="text" value={tipMessage} onChange={e => setTipMessage(e.target.value)} placeholder="Know the owner? Send a tip..." className="fid-input" style={{ flex: 1 }} />
                                <button onClick={handleSendTip} disabled={sendingTip || !tipMessage.trim()} className="fid-btn fid-btn-primary"><FiSend size={14} /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showReportModal && (
                <div className="fid-modal-overlay">
                    <div className="fid-modal-backdrop" onClick={() => setShowReportModal(false)} />
                    <div className="fid-modal">
                        <div className="fid-modal-header"><span className="fid-modal-title">Report Item</span><button className="fid-modal-close" onClick={() => setShowReportModal(false)}><FiX size={16} /></button></div>
                        <div className="fid-modal-body">
                            <select className="fid-input" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                                <option value="">Select reason...</option>
                                <option value="inappropriate">Inappropriate</option>
                                <option value="fake">Fake/Spam</option>
                                <option value="wrong_info">Wrong Information</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="fid-modal-footer">
                            <button className="fid-btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
                            <button className="fid-btn-submit" onClick={handleReport} disabled={!reportReason}>Submit Report</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}