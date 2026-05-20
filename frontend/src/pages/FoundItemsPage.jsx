import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { foundItemsApi } from '../api/foundItemsApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiSearch, FiX, FiPlus, FiRefreshCw, FiPackage,
    FiClock, FiMapPin, FiDollarSign, FiCheckCircle,
    FiFlag, FiEye, FiChevronRight, FiFilter,
    FiInbox, FiSend,
} from 'react-icons/fi';

const CATEGORY_CONFIG = {
    id: { emoji: '🪪', label: 'Student ID', color: 'from-blue-500 to-blue-600' },
    bank_card: { emoji: '💳', label: 'Bank Card', color: 'from-green-500 to-green-600' },
    keys: { emoji: '🔑', label: 'Keys', color: 'from-amber-500 to-amber-600' },
    document: { emoji: '📄', label: 'Document', color: 'from-purple-500 to-purple-600' },
    gadget: { emoji: '📱', label: 'Gadget', color: 'from-pink-500 to-pink-600' },
    other: { emoji: '📦', label: 'Other', color: 'from-gray-500 to-gray-600' },
};

export default function FoundItemsPage() {
    const navigate = useNavigate();
    const [category, setCategory] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('available');
    const [tipModal, setTipModal] = useState({ open: false, itemId: null, itemTitle: '' });
    const [tipMessage, setTipMessage] = useState('');
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: items, isLoading, refetch } = useQuery({
        queryKey: ['found-items', category, search, status],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (search) params.append('search', search);
            const response = await foundItemsApi.listItems(params);
            let results = Array.isArray(response) ? response : response.data || [];
            if (status === 'claimed') results = results.filter(i => i.is_claimed);
            if (status === 'available') results = results.filter(i => !i.is_claimed);
            return results;
        },
    });

    const tipMutation = useMutation({
        mutationFn: ({ itemId, message }) => foundItemsApi.sendTip(itemId, message),
        onSuccess: () => {
            toast.success('Tip sent successfully!');
            setTipModal({ open: false, itemId: null, itemTitle: '' });
            setTipMessage('');
        },
        onError: () => toast.error('Failed to send tip'),
    });

    const handleOpenTip = (itemId, itemTitle) => {
        setTipModal({ open: true, itemId, itemTitle });
        setTipMessage('');
    };

    const handleSubmitTip = () => {
        if (!tipMessage.trim()) { toast.error('Please enter a message'); return; }
        tipMutation.mutate({ itemId: tipModal.itemId, message: tipMessage });
    };

    const claimedCount = items?.filter(i => i.is_claimed).length ?? 0;
    const availableCount = items?.filter(i => !i.is_claimed).length ?? 0;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .fi-root { font-family: 'Outfit', sans-serif; max-width: 1000px; margin: 0 auto; padding: 28px 20px 80px; animation: fiIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes fiIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .fi-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .fi-title h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; margin-bottom: 4px; }
        .fi-title p { font-size: 0.83rem; color: #94a3b8; font-weight: 500; }
        .dark .fi-title h1 { color: #f8fafc; }
        .fi-header-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .fi-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 14px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; cursor: pointer; transition: all 0.22s; color: #fff; text-decoration: none; }
        .fi-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); box-shadow: 0 6px 20px rgba(99,102,241,0.28); }
        .fi-btn-primary:hover { transform: translateY(-2px); }
        .fi-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; font-size: 0.8rem; padding: 8px 14px; }
        .fi-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .fi-btn-outline { border-color: #334155; color: #94a3b8; }

        .fi-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .fi-search { flex: 1; min-width: 180px; padding: 10px 14px 10px 38px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 500; color: #0f172a; outline: none; }
        .fi-search:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .dark .fi-search { border-color: #334155; background: rgba(15,23,42,0.8); color: #f8fafc; }
        .fi-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .fi-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .fi-select { padding: 10px 14px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .fi-select { border-color: #334155; background: rgba(15,23,42,0.8); color: #94a3b8; }

        .fi-stats { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .fi-stat { padding: 6px 14px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.75); border: 1px solid rgba(0,0,0,0.05); color: #64748b; }
        .dark .fi-stat { background: rgba(15,23,42,0.75); border-color: rgba(255,255,255,0.05); color: #94a3b8; }

        .fi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .fi-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; overflow: hidden; backdrop-filter: blur(16px); box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06); transition: all 0.22s; animation: fiIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .fi-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .dark .fi-card { background: rgba(12,16,24,0.85); border-color: rgba(255,255,255,0.05); }
        .fi-card-img { height: 140px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04)); }
        .fi-card-body { padding: 16px 18px; }
        .fi-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .fi-card-title { font-size: 0.95rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .fi-card-title a { text-decoration: none; color: inherit; }
        .fi-card-title a:hover { color: #6366f1; }
        .dark .fi-card-title { color: #f8fafc; }
        .fi-badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 700; }
        .fi-badge-cat { background: rgba(99,102,241,0.1); color: #6366f1; }
        .fi-badge-fee { background: rgba(245,158,11,0.1); color: #d97706; }
        .fi-badge-claimed { background: rgba(16,185,129,0.1); color: #059669; }
        .fi-card-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.72rem; color: #94a3b8; margin-bottom: 12px; }
        .fi-card-meta span { display: flex; align-items: center; gap: 3px; }
        .fi-card-actions { display: flex; gap: 6px; }
        .fi-card-btn { flex: 1; padding: 9px 14px; border-radius: 10px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.76rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
        .fi-card-btn-claim { background: #6366f1; color: #fff; }
        .fi-card-btn-claim:hover { background: #4f46e5; }
        .fi-card-btn-tip { background: transparent; border: 1.5px solid #6366f1; color: #6366f1; }
        .fi-card-btn-tip:hover { background: rgba(99,102,241,0.06); }
        .fi-card-btn-view { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .fi-card-btn-view:hover { background: rgba(0,0,0,0.03); }

        .fi-empty { text-align: center; padding: 64px 24px; }
        .fi-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.6; }

        /* Modal */
        .fi-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .fi-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .fi-modal { position: relative; z-index: 61; width: 100%; max-width: 460px; background: rgba(255,255,255,0.96); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: fiIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .fi-modal { background: rgba(12,16,24,0.96); border-color: rgba(255,255,255,0.07); }
        .fi-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .fi-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .fi-modal-title { color: #f8fafc; }
        .fi-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .fi-modal-close:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
        .fi-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
        .fi-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
        .fi-input { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); color: #0f172a; font-family: 'Outfit', sans-serif; font-size: 0.87rem; font-weight: 500; outline: none; resize: none; }
        .fi-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .dark .fi-input { background: rgba(12,16,24,0.9); border-color: #334155; color: #f8fafc; }
        .fi-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; }
        .fi-btn-cancel { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: transparent; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; color: #64748b; }
        .fi-btn-submit { flex: 1; padding: 11px; border-radius: 12px; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 700; }
        .fi-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

            <div className="fi-root">
                {/* Header */}
                <div className="fi-header">
                    <div className="fi-title">
                        <h1>Found Items</h1>
                        <p>Lost something? Browse items found on campus</p>
                    </div>
                    <div className="fi-header-btns">
                        <button onClick={() => refetch()} className="fi-btn fi-btn-outline">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                        <Link to="/claims" className="fi-btn fi-btn-outline">
                            <FiInbox size={14} /> My Claims
                        </Link>
                        <Link to="/found-items/post" className="fi-btn fi-btn-primary">
                            <FiPlus size={15} /> Post Found Item
                        </Link>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="fi-bar">
                    <div className="fi-search-wrap">
                        <FiSearch size={15} className="fi-search-icon" />
                        <input type="search" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="fi-search" />
                    </div>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="fi-select">
                        <option value="">All Categories</option>
                        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="fi-select">
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="claimed">Claimed</option>
                    </select>
                </div>

                {/* Stats */}
                <div className="fi-stats">
                    <span className="fi-stat">📦 {items?.length || 0} Total</span>
                    <span className="fi-stat" style={{ color: '#059669' }}>✅ {availableCount} Available</span>
                    <span className="fi-stat" style={{ color: '#d97706' }}>🔒 {claimedCount} Claimed</span>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="fi-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
                    </div>
                ) : items?.length > 0 ? (
                    <div className="fi-grid">
                        {items.map((item, i) => {
                            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                            return (
                                <div key={item.id} className="fi-card" style={{ animationDelay: `${i * 60}ms` }}>
                                    <Link to={`/found-items/${item.id}`} style={{ textDecoration: 'none' }}>
                                        <div className="fi-card-img">
                                            <span style={{ fontSize: '3.5rem' }}>{config.emoji}</span>
                                        </div>
                                    </Link>
                                    <div className="fi-card-body">
                                        <div className="fi-card-top">
                                            <h3 className="fi-card-title">
                                                <Link to={`/found-items/${item.id}`}>{item.title}</Link>
                                            </h3>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <span className="fi-badge fi-badge-cat">{item.category}</span>
                                                {item.is_fee_required && <span className="fi-badge fi-badge-fee">💰 Fee</span>}
                                                {item.is_claimed && <span className="fi-badge fi-badge-claimed">✅ Claimed</span>}
                                            </div>
                                        </div>
                                        <div className="fi-card-meta">
                                            <span><FiMapPin size={10} />{item.location_found}</span>
                                            <span><FiClock size={10} />{new Date(item.found_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="fi-card-actions">
                                            {!item.is_claimed ? (
                                                <>
                                                    <Link to={`/found-items/${item.id}/claim`} className="fi-card-btn fi-card-btn-claim">
                                                        This is Mine
                                                    </Link>
                                                    <button onClick={(e) => { e.preventDefault(); handleOpenTip(item.id, item.title); }} className="fi-card-btn fi-card-btn-tip">
                                                        💡 Tip
                                                    </button>
                                                </>
                                            ) : (
                                                <Link to={`/found-items/${item.id}`} className="fi-card-btn fi-card-btn-view" style={{ flex: 1 }}>
                                                    <FiEye size={13} /> View Details
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="fi-empty">
                        <div className="fi-empty-icon">📦</div>
                        <h3 style={{ fontWeight: 700, color: '#64748b' }}>No items found</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>{search ? 'Try a different search term.' : 'Check back later for new found items.'}</p>
                    </div>
                )}
            </div>

            {/* Tip Modal */}
            {tipModal.open && (
                <div className="fi-modal-overlay">
                    <div className="fi-modal-backdrop" onClick={() => setTipModal({ open: false, itemId: null, itemTitle: '' })} />
                    <div className="fi-modal">
                        <div className="fi-modal-header">
                            <span className="fi-modal-title">💡 I Know the Owner</span>
                            <button className="fi-modal-close" onClick={() => setTipModal({ open: false, itemId: null, itemTitle: '' })}><FiX size={16} /></button>
                        </div>
                        <div className="fi-modal-body">
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Item: <strong>{tipModal.itemTitle}</strong></p>
                            <div><label className="fi-label">Your Message *</label><textarea className="fi-input" rows={3} value={tipMessage} onChange={e => setTipMessage(e.target.value)} placeholder="e.g., I think this belongs to John from 3rd year..." /></div>
                        </div>
                        <div className="fi-modal-footer">
                            <button className="fi-btn-cancel" onClick={() => setTipModal({ open: false, itemId: null, itemTitle: '' })}>Cancel</button>
                            <button className="fi-btn-submit" onClick={handleSubmitTip} disabled={!tipMessage.trim()}>Send Tip</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}