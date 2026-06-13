// frontend/src/pages/TicketDetailPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../api/supportApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSend, FiMessageSquare, FiUser, FiCalendar, FiTag, FiRefreshCw, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { useState } from 'react';

const STATUS_CONFIG = {
    open: {
        color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        label: 'Open',
        icon: FiAlertCircle
    },
    in_progress: {
        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        label: 'In Progress',
        icon: FiClock
    },
    resolved: {
        color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        label: 'Resolved',
        icon: FiCheckCircle
    },
    closed: {
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        label: 'Closed',
        icon: FiRefreshCw
    },
};

export default function TicketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch ticket details
    const { data: ticket, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['ticket', id],
        queryFn: () => supportApi.getTicket(id).then(res => res.data),
        enabled: !!id,
        retry: 1,
    });

    // Send reply mutation - Using sendReply which matches backend endpoint
    const replyMutation = useMutation({
        mutationFn: (message) => supportApi.sendReply(id, message),
        onMutate: () => {
            setIsSubmitting(true);
        },
        onSuccess: () => {
            toast.success('Reply sent successfully');
            setReplyText('');
            // Invalidate both the ticket detail and the tickets list
            queryClient.invalidateQueries({ queryKey: ['ticket', id] });
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
        },
        onError: (error) => {
            console.error('Reply error:', error);
            // Handle specific HTTP status codes
            if (error.response?.status === 404) {
                toast.error('Ticket not found or you no longer have access.');
            } else if (error.response?.status === 400) {
                toast.error(error.response?.data?.error || 'Cannot reply to closed or resolved tickets.');
            } else if (error.response?.status === 403) {
                toast.error('You do not have permission to reply to this ticket.');
            } else {
                toast.error(error?.response?.data?.message || 'Failed to send reply. Please try again.');
            }
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const handleSendReply = () => {
        if (!replyText.trim()) {
            toast.error('Please enter a message');
            return;
        }
        replyMutation.mutate(replyText.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <SkeletonLoader type="page" />
                </div>
            </div>
        );
    }

    // Error or not found state
    if (isError || !ticket) {
        const isNotFound = error?.response?.status === 404;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {isNotFound ? 'Ticket Not Found' : 'Error Loading Ticket'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {isNotFound
                            ? 'The ticket you\'re looking for doesn\'t exist or you don\'t have permission to view it.'
                            : 'There was a problem loading your ticket. Please try again.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate('/my-tickets')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Back to Tickets
                        </button>
                        {!isNotFound && (
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || FiAlertCircle;
    const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/my-tickets')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors group"
                >
                    <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Tickets
                </button>

                {/* Ticket Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/30 to-transparent dark:from-indigo-900/10">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <FiMessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                                        {ticket.title}
                                    </h1>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <FiTag size={14} /> {ticket.category}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FiCalendar size={14} /> {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FiUser size={14} /> Ticket #{id?.substring(0, 8)}
                                    </span>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status.color}`}>
                                <StatusIcon size={12} /> {status.label}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Description</h3>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {ticket.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Responses Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiMessageSquare size={18} className="text-indigo-500" />
                            Conversation
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                ({ticket.responses?.length || 0} responses)
                            </span>
                        </h2>
                    </div>

                    <div className="p-6">
                        {ticket.responses && ticket.responses.length > 0 ? (
                            <div className="space-y-4">
                                {ticket.responses.map((response) => {
                                    const isAdmin = response.responder_name !== 'You';
                                    return (
                                        <div
                                            key={response.id}
                                            className={`border-l-4 ${isAdmin ? 'border-green-500' : 'border-indigo-500'} pl-4 py-3 rounded-r-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                                        >
                                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full ${isAdmin ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'} flex items-center justify-center`}>
                                                        {isAdmin ? (
                                                            <FiMessageSquare size={12} className="text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <FiUser size={12} className="text-indigo-600 dark:text-indigo-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                        {response.responder_name}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(response.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed ml-8">
                                                {response.message}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiMessageSquare size={24} className="text-gray-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">No responses yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to respond</p>
                            </div>
                        )}
                    </div>

                    {/* Reply Form */}
                    {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add a reply</h3>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your reply here... (Shift+Enter for new line)"
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                rows={4}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-between items-center mt-3">
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {replyText.length > 0 && `Message length: ${replyText.length} characters`}
                                </p>
                                <button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || isSubmitting}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <FiSend size={16} /> Send Reply
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Closed/Resolved Message */}
                    {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-green-50 dark:bg-green-900/10 text-center">
                            <FiCheckCircle className="inline-block text-green-500 mr-2" size={18} />
                            <span className="text-sm text-green-700 dark:text-green-300">
                                This ticket is {ticket.status}. New replies are disabled.
                                {ticket.resolution && <span className="block mt-1 text-xs">Resolution: {ticket.resolution}</span>}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}