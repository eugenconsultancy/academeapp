// C:\Users\GATARA-BJTU\academe\frontend\src\pages\MyTicketsPage.jsx

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supportApi } from '../api/supportApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMessageSquare, FiChevronRight, FiRefreshCw, FiArrowLeft,
    FiCircle, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle,
    FiPlus, FiSearch, FiInbox, FiUser, FiCalendar, FiTag,
    FiSend, FiPaperclip, FiX, FiEye
} from 'react-icons/fi';

const STATUS_CONFIG = {
    open: {
        color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        icon: FiAlertCircle,
        label: 'Open',
        dot: '\uD83D\uDFE1'
    },
    in_progress: {
        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        icon: FiClock,
        label: 'In Progress',
        dot: '\uD83D\uDD35'
    },
    resolved: {
        color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        icon: FiCheckCircle,
        label: 'Resolved',
        dot: '\uD83D\uDFE2'
    },
    closed: {
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        icon: FiXCircle,
        label: 'Closed',
        dot: '\u26AB'
    },
};

const FILTER_OPTIONS = [
    { key: 'all', label: 'All Tickets' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
];

export default function MyTicketsPage() {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filter, setFilter] = useState('all');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewTicketData, setViewTicketData] = useState(null);
    const [replyText, setReplyText] = useState('');
    const queryClient = useQueryClient();

    const { data: tickets, isLoading, refetch } = useQuery({
        queryKey: ['my-tickets'],
        queryFn: () => supportApi.listTickets().then(res => res.data),
    });

    const { data: ticketDetail, isLoading: detailLoading } = useQuery({
        queryKey: ['ticket', selectedTicket],
        queryFn: () => supportApi.getTicket(selectedTicket).then(res => res.data),
        enabled: !!selectedTicket,
    });

    // ── Send Reply Mutation ──
    const replyMutation = useMutation({
        mutationFn: ({ ticketId, message }) => supportApi.sendReply(ticketId, message),
        onSuccess: () => {
            toast.success('Reply sent');
            setReplyText('');
            queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicket] });
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
        },
        onError: (err) => toast.error(err?.response?.data?.error || 'Failed to send reply'),
    });

    const handleSelectTicket = (id) => {
        setSelectedTicket(id);
    };

    const handleBackToList = () => {
        setSelectedTicket(null);
    };

    const handleViewTicket = (ticket) => {
        setViewTicketData(ticket);
        setViewModalOpen(true);
    };

    const handleSendReply = () => {
        if (!replyText.trim() || !selectedTicket) return;
        replyMutation.mutate({ ticketId: selectedTicket, message: replyText.trim() });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    // Filter tickets
    const filteredTickets = tickets?.filter(t => filter === 'all' || t.status === filter) || [];

    // Calculate stats
    const stats = {
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 'open').length || 0,
        inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <SkeletonLoader type="list" count={5} />
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
                
                .st-root {
                    font-family: 'Outfit', sans-serif;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
                    padding: 2rem 1rem;
                }
                .dark .st-root {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
                }
                
                .st-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    animation: stFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                @keyframes stFadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .st-hero {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                    border-radius: 24px;
                    padding: 2.5rem 2rem;
                    margin-bottom: 2rem;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15);
                }
                
                .st-hero::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    border-radius: 50%;
                }
                
                .st-hero::after {
                    content: '';
                    position: absolute;
                    bottom: -30%;
                    left: -5%;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
                    border-radius: 50%;
                }
                
                .st-hero-content {
                    position: relative;
                    z-index: 1;
                }
                
                .st-hero-title {
                    font-size: clamp(1.8rem, 4vw, 2.5rem);
                    font-weight: 900;
                    color: white;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.03em;
                }
                
                .st-hero-subtitle {
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                    margin-bottom: 1.5rem;
                }
                
                .st-stats-grid {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                
                .st-stat-card {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    padding: 0.75rem 1.25rem;
                    color: white;
                    min-width: 100px;
                }
                
                .st-stat-value {
                    font-size: 1.5rem;
                    font-weight: 800;
                    line-height: 1;
                }
                
                .st-stat-label {
                    font-size: 0.75rem;
                    font-weight: 500;
                    opacity: 0.8;
                    margin-top: 0.25rem;
                }
                
                .st-filters {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                
                .st-filter-btn {
                    padding: 0.5rem 1.25rem;
                    border-radius: 99px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    white-space: nowrap;
                }
                
                .dark .st-filter-btn {
                    background: #1e293b;
                    border-color: #334155;
                    color: #94a3b8;
                }
                
                .st-filter-btn:hover {
                    border-color: #6366f1;
                    color: #6366f1;
                    transform: translateY(-1px);
                }
                
                .st-filter-btn.active {
                    background: #6366f1;
                    color: white;
                    border-color: #6366f1;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }
                
                .st-content {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                @media (min-width: 1024px) {
                    .st-content {
                        grid-template-columns: 400px 1fr;
                    }
                    
                    .st-list-panel {
                        max-height: calc(100vh - 300px);
                        overflow-y: auto;
                    }
                }
                
                .st-list-panel {
                    background: white;
                    border-radius: 20px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .dark .st-list-panel {
                    background: #1e293b;
                    border-color: rgba(255, 255, 255, 0.05);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }
                
                .st-ticket-card {
                    padding: 1rem 1.25rem;
                    border-radius: 14px;
                    margin-bottom: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 2px solid transparent;
                    background: #f8fafc;
                }
                
                .dark .st-ticket-card {
                    background: #0f172a;
                }
                
                .st-ticket-card:hover {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                    transform: translateX(4px);
                }
                
                .dark .st-ticket-card:hover {
                    background: #1e293b;
                    border-color: #334155;
                }
                
                .st-ticket-card.selected {
                    background: #eff6ff;
                    border-color: #6366f1;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
                }
                
                .dark .st-ticket-card.selected {
                    background: rgba(99, 102, 241, 0.1);
                    border-color: #6366f1;
                }
                
                .st-ticket-title {
                    font-weight: 700;
                    color: #0f172a;
                    font-size: 0.95rem;
                    margin-bottom: 0.25rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .dark .st-ticket-title {
                    color: #f1f5f9;
                }
                
                .st-ticket-meta {
                    font-size: 0.8rem;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .st-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 99px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    border: 1px solid;
                    white-space: nowrap;
                }
                
                .st-detail-panel {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .dark .st-detail-panel {
                    background: #1e293b;
                    border-color: rgba(255, 255, 255, 0.05);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }
                
                .st-detail-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #f1f5f9;
                    background: #fafbfc;
                }
                
                .dark .st-detail-header {
                    border-color: #334155;
                    background: #0f172a;
                }
                
                .st-detail-body {
                    padding: 2rem;
                    flex: 1;
                    overflow-y: auto;
                }
                
                .st-conversation-item {
                    padding: 1rem 1.25rem;
                    border-radius: 12px;
                    margin-bottom: 1rem;
                }
                
                .st-conversation-item.user {
                    background: #f0f9ff;
                    border-left: 4px solid #6366f1;
                }
                
                .dark .st-conversation-item.user {
                    background: rgba(99, 102, 241, 0.1);
                }
                
                .st-conversation-item.support {
                    background: #f0fdf4;
                    border-left: 4px solid #22c55e;
                }
                
                .dark .st-conversation-item.support {
                    background: rgba(34, 197, 94, 0.1);
                }
                
                .st-empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                
                .st-empty-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    color: white;
                    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
                }
                
                .st-create-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border-radius: 12px;
                    font-weight: 700;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.9rem;
                    text-decoration: none;
                    transition: all 0.2s;
                    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
                }
                
                .st-create-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
                }
                
                .st-refresh-btn {
                    padding: 0.5rem;
                    border-radius: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                
                .st-refresh-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.5);
                }
                
                .st-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #6366f1;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 1rem;
                }
                
                .dark .st-back-btn {
                    background: #1e293b;
                    border-color: #334155;
                }
                
                .st-back-btn:hover {
                    background: #f8fafc;
                    border-color: #6366f1;
                }
                
                .dark .st-back-btn:hover {
                    background: #0f172a;
                }

                /* ── FIXED: Reply form mobile responsive ── */
                .st-reply-form {
                    padding: 1rem 2rem;
                    border-top: 1px solid #f1f5f9;
                    background: #fafbfc;
                    display: flex;
                    gap: 0.75rem;
                    align-items: flex-end;
                    flex-shrink: 0;
                }
                .dark .st-reply-form {
                    border-color: #334155;
                    background: #0f172a;
                }
                .st-reply-input {
                    flex: 1;
                    min-width: 0;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    resize: none;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    min-height: 44px;
                    max-height: 120px;
                }
                .dark .st-reply-input {
                    background: #1e293b;
                    border-color: #334155;
                    color: #f1f5f9;
                }
                .st-reply-input:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
                }
                .st-send-btn {
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(99,102,241,0.3);
                }
                .st-send-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(99,102,241,0.4);
                }
                .st-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* ── View button for mobile ── */
                .st-view-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 8px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    color: #6366f1;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .st-view-btn:hover {
                    background: rgba(99,102,241,0.08);
                    border-color: #6366f1;
                }
                .dark .st-view-btn {
                    background: #1e293b;
                    border-color: #334155;
                }

                /* ── Modal for mobile view ── */
                .st-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 70;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .st-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(6px);
                    animation: stFadeIn 0.2s ease;
                }
                .st-modal {
                    position: relative;
                    z-index: 71;
                    width: 100%;
                    max-width: 600px;
                    max-height: 85vh;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
                    overflow-y: auto;
                }
                .dark .st-modal {
                    background: #1e293b;
                }
                .st-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #f1f5f9;
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 1;
                }
                .dark .st-modal-header {
                    background: #1e293b;
                    border-color: #334155;
                }
                .st-modal-close {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                }
                .st-modal-close:hover {
                    background: rgba(239,68,68,0.08);
                    color: #ef4444;
                    border-color: #ef4444;
                }
                .dark .st-modal-close {
                    background: #0f172a;
                    border-color: #334155;
                }
                .st-modal-body {
                    padding: 1.5rem;
                }

                @media (max-width: 640px) {
                    .st-reply-form {
                        padding: 0.75rem 1rem;
                        gap: 0.5rem;
                    }
                    .st-send-btn {
                        padding: 0.75rem 1rem;
                        font-size: 0.8rem;
                    }
                    .st-reply-input {
                        font-size: 0.8rem;
                    }
                    .st-detail-header {
                        padding: 1rem 1.25rem;
                    }
                    .st-detail-body {
                        padding: 1rem 1.25rem;
                    }
                }
                
                @media (max-width: 1024px) {
                    .st-list-panel {
                        max-height: none;
                    }
                }
            `}</style>

            <div className="st-root">
                <div className="st-container">
                    {/* Hero Section */}
                    <div className="st-hero">
                        <div className="st-hero-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h1 className="st-hero-title">Support Center</h1>
                                    <p className="st-hero-subtitle">Track your requests and get help from our team</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => refetch()} className="st-refresh-btn">
                                        <FiRefreshCw size={16} /> Refresh
                                    </button>
                                    <Link to="/contact" className="st-create-btn">
                                        <FiPlus size={18} /> New Ticket
                                    </Link>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="st-stats-grid">
                                <div className="st-stat-card">
                                    <div className="st-stat-value">{stats.total}</div>
                                    <div className="st-stat-label">Total Tickets</div>
                                </div>
                                <div className="st-stat-card">
                                    <div className="st-stat-value">{stats.open}</div>
                                    <div className="st-stat-label">Open</div>
                                </div>
                                <div className="st-stat-card">
                                    <div className="st-stat-value">{stats.inProgress}</div>
                                    <div className="st-stat-label">In Progress</div>
                                </div>
                                <div className="st-stat-card">
                                    <div className="st-stat-value">{stats.resolved}</div>
                                    <div className="st-stat-label">Resolved</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="st-filters">
                        {FILTER_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setFilter(opt.key)}
                                className={`st-filter-btn ${filter === opt.key ? 'active' : ''}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    {tickets?.length > 0 ? (
                        <div className="st-content">
                            {/* Left Panel - Ticket List */}
                            <div className="st-list-panel">
                                <h2 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">
                                    {filter === 'all' ? 'All Tickets' : FILTER_OPTIONS.find(f => f.key === filter)?.label}
                                    <span className="text-gray-400 font-normal text-sm ml-2">
                                        ({filteredTickets.length})
                                    </span>
                                </h2>

                                {filteredTickets.length > 0 ? (
                                    filteredTickets.map(ticket => {
                                        const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                        const StatusIcon = status.icon;

                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => handleSelectTicket(ticket.id)}
                                                className={`st-ticket-card ${selectedTicket === ticket.id ? 'selected' : ''}`}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <h3 className="st-ticket-title" title={ticket.title}>{ticket.title}</h3>
                                                        <div className="st-ticket-meta">
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <FiCalendar size={12} />
                                                                {new Date(ticket.created_at).toLocaleDateString()}
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <FiTag size={12} />
                                                                {ticket.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                        <span className={`st-status-badge ${status.color}`}>
                                                            <StatusIcon size={12} />
                                                            {status.label}
                                                        </span>
                                                        <button
                                                            className="st-view-btn"
                                                            onClick={(e) => { e.stopPropagation(); handleViewTicket(ticket); }}
                                                            title="Quick view"
                                                        >
                                                            <FiEye size={12} /> View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <FiSearch size={32} className="mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No tickets match this filter</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel - Ticket Detail */}
                            <div className="st-detail-panel">
                                {selectedTicket ? (
                                    detailLoading ? (
                                        <div className="st-detail-body">
                                            <SkeletonLoader type="detail" />
                                        </div>
                                    ) : ticketDetail ? (
                                        <>
                                            <div className="st-detail-header">
                                                <button onClick={handleBackToList} className="st-back-btn lg:hidden">
                                                    <FiArrowLeft size={16} /> Back to list
                                                </button>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2" style={{ wordBreak: 'break-word' }}>
                                                            {ticketDetail.title}
                                                        </h2>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                                                            <span className="flex items-center gap-1"><FiTag size={14} />{ticketDetail.category}</span>
                                                            <span className="flex items-center gap-1"><FiCalendar size={14} />{new Date(ticketDetail.created_at).toLocaleString()}</span>
                                                            <span className="flex items-center gap-1"><FiUser size={14} />Ticket #{ticketDetail.id?.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const status = STATUS_CONFIG[ticketDetail.status] || STATUS_CONFIG.open;
                                                        const StatusIcon = status.icon;
                                                        return (
                                                            <span className={`st-status-badge ${status.color}`}>
                                                                <StatusIcon size={14} />{status.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="st-detail-body">
                                                {/* Original Request */}
                                                <div className="st-conversation-item user">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                                            <FiUser size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white">You</p>
                                                            <p className="text-xs text-gray-500">{new Date(ticketDetail.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap ml-10" style={{ wordBreak: 'break-word' }}>
                                                        {ticketDetail.description}
                                                    </p>
                                                </div>

                                                {/* Responses */}
                                                {ticketDetail.responses?.filter(r => !r.is_internal).map((response) => (
                                                    <div key={response.id} className="st-conversation-item support">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                                                <FiMessageSquare size={14} className="text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                                    {response.responder_name || 'Support Team'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">{new Date(response.created_at).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap ml-10" style={{ wordBreak: 'break-word' }}>
                                                            {response.message}
                                                        </p>
                                                    </div>
                                                ))}

                                                {(!ticketDetail.responses || ticketDetail.responses.filter(r => !r.is_internal).length === 0) && (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <FiClock size={32} className="mx-auto mb-3 opacity-50" />
                                                        <p className="font-medium">Waiting for response</p>
                                                        <p className="text-sm mt-1">Our support team will get back to you soon.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── FIXED: Reply form with send button ── */}
                                            {ticketDetail.status !== 'closed' && ticketDetail.status !== 'resolved' && (
                                                <div className="st-reply-form">
                                                    <textarea
                                                        className="st-reply-input"
                                                        placeholder="Type your reply..."
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        rows={1}
                                                    />
                                                    <button
                                                        className="st-send-btn"
                                                        onClick={handleSendReply}
                                                        disabled={!replyText.trim() || replyMutation.isPending}
                                                    >
                                                        {replyMutation.isPending ? (
                                                            <><FiRefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending</>
                                                        ) : (
                                                            <><FiSend size={14} /> Send</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : null
                                ) : (
                                    <div className="st-detail-body flex items-center justify-center" style={{ minHeight: '400px' }}>
                                        <div className="text-center text-gray-400">
                                            <FiMessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                                            <p className="font-medium text-lg">Select a ticket</p>
                                            <p className="text-sm mt-1">Click on a ticket from the list to view details</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="st-list-panel">
                            <div className="st-empty-state">
                                <div className="st-empty-icon">
                                    <FiMessageSquare size={36} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    No Support Requests Yet
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">
                                    Need assistance? Our support team is here to help you with any questions or issues.
                                </p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
                                    Create a ticket and we'll get back to you as soon as possible.
                                </p>
                                <Link to="/contact" className="st-create-btn">
                                    <FiPlus size={18} /> Create Your First Ticket
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick View Modal for Mobile ── */}
            {viewModalOpen && viewTicketData && (
                <div className="st-modal-overlay">
                    <div className="st-modal-backdrop" onClick={() => setViewModalOpen(false)} />
                    <div className="st-modal">
                        <div className="st-modal-header">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{viewTicketData.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(viewTicketData.created_at).toLocaleDateString()} · {viewTicketData.category}
                                </p>
                            </div>
                            <button className="st-modal-close" onClick={() => setViewModalOpen(false)}>
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="st-modal-body">
                            {(() => {
                                const status = STATUS_CONFIG[viewTicketData.status] || STATUS_CONFIG.open;
                                const StatusIcon = status.icon;
                                return (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <span className={`st-status-badge ${status.color}`}>
                                            <StatusIcon size={14} /> {status.label}
                                        </span>
                                    </div>
                                );
                            })()}
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
                                {viewTicketData.description || viewTicketData.last_message || 'No description available.'}
                            </p>
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <button
                                    className="st-create-btn"
                                    onClick={() => {
                                        setViewModalOpen(false);
                                        handleSelectTicket(viewTicketData.id);
                                    }}
                                    style={{ display: 'inline-flex' }}
                                >
                                    <FiEye size={16} /> View Full Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}