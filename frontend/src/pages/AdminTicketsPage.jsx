import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../api/supportApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiChevronRight, FiRefreshCw, FiSend, FiArrowLeft } from 'react-icons/fi';

export default function AdminTicketsPage() {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const queryClient = useQueryClient();

    const { data: tickets, isLoading, refetch } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: () => supportApi.adminListTickets().then(res => res.data),
    });

    const { data: ticketDetail, isLoading: detailLoading } = useQuery({
        queryKey: ['admin-ticket', selectedTicket],
        queryFn: () => supportApi.adminGetTicket(selectedTicket).then(res => res.data),
        enabled: !!selectedTicket,
    });

    const respondMutation = useMutation({
        mutationFn: ({ id, message, internal }) => supportApi.adminRespond(id, message, internal),
        onSuccess: () => {
            toast.success('Response added');
            setResponseMessage('');
            queryClient.invalidateQueries(['admin-ticket', selectedTicket]);
        },
        onError: () => toast.error('Failed to add response'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => supportApi.adminUpdateTicket(id, { status }),
        onSuccess: () => {
            toast.success('Status updated');
            queryClient.invalidateQueries(['admin-ticket', selectedTicket]);
            queryClient.invalidateQueries(['admin-tickets']);
        },
        onError: () => toast.error('Failed to update status'),
    });

    const handleViewTicket = (id) => {
        setSelectedTicket(id);
        setShowDetail(true);
    };

    const handleSendResponse = () => {
        if (!responseMessage.trim()) return;
        respondMutation.mutate({ id: selectedTicket, message: responseMessage, internal: isInternal });
    };

    const handleStatusChange = (status) => {
        if (!selectedTicket) return;
        updateStatusMutation.mutate({ id: selectedTicket, status });
    };

    const statusOptions = [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
    ];

    const statusColors = {
        open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    if (isLoading) return <SkeletonLoader type="list" count={5} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets (Admin)</h1>
                    <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <FiRefreshCw size={18} />
                    </button>
                </div>

                {!showDetail ? (
                    tickets?.length > 0 ? (
                        <div className="space-y-3">
                            {tickets.map((t) => (
                                <Card key={t.id} hover className="cursor-pointer" onClick={() => handleViewTicket(t.id)}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{t.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {t.submitted_by_name} • {new Date(t.created_at).toLocaleDateString()} • {t.category}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status]}`}>
                                                {t.status.replace('_', ' ')}
                                            </span>
                                            <FiChevronRight className="text-gray-400" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">No support tickets found.</p>
                        </Card>
                    )
                ) : (
                    <div>
                        <button
                            onClick={() => setShowDetail(false)}
                            className="mb-4 inline-flex items-center gap-2 text-indigo-600 hover:underline"
                        >
                            <FiArrowLeft size={14} /> Back to list
                        </button>
                        {detailLoading ? (
                            <SkeletonLoader type="detail" />
                        ) : ticketDetail && (
                            <Card>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ticketDetail.title}</h2>
                                            <p className="text-sm text-gray-500">Category: {ticketDetail.category}</p>
                                            <p className="text-sm text-gray-500">Submitted by: {ticketDetail.submitted_by_name}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={ticketDetail.status}
                                                onChange={(e) => handleStatusChange(e.target.value)}
                                                className="px-3 py-1 border rounded-lg text-sm bg-white dark:bg-gray-700"
                                            >
                                                {statusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticketDetail.status]}`}>
                                                {ticketDetail.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticketDetail.description}</p>
                                        <p className="text-xs text-gray-400 mt-2">Created on {new Date(ticketDetail.created_at).toLocaleString()}</p>
                                    </div>

                                    {/* Responses (all, including internal) */}
                                    {ticketDetail.responses && ticketDetail.responses.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold mb-2">Conversation History</h3>
                                            <div className="space-y-3">
                                                {ticketDetail.responses.map((r) => (
                                                    <div key={r.id} className={`border-l-4 pl-3 py-2 rounded-r-lg ${r.is_internal ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-indigo-400 bg-gray-50 dark:bg-gray-800/30'}`}>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">{r.message}</p>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <p className="text-xs text-gray-400">– {r.responder_name} on {new Date(r.created_at).toLocaleString()}</p>
                                                            {r.is_internal && <span className="text-xs text-amber-600">Internal note</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reply form */}
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2">Add Response</h3>
                                        <textarea
                                            value={responseMessage}
                                            onChange={(e) => setResponseMessage(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                                            placeholder="Type your response..."
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Internal note (not visible to user)</span>
                                            </label>
                                            <button
                                                onClick={handleSendResponse}
                                                disabled={!responseMessage.trim() || respondMutation.isPending}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <FiSend size={14} /> Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}