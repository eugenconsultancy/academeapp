import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supportApi } from '../api/supportApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiChevronRight, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

export default function MyTicketsPage() {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
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

    const handleViewTicket = (id) => {
        setSelectedTicket(id);
        setShowDetail(true);
    };

    const statusColors = {
        open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    if (isLoading) return <SkeletonLoader type="list" count={3} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Support Tickets</h1>
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
                                                {new Date(t.created_at).toLocaleDateString()} • {t.category}
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
                            <FiMessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">You haven't submitted any tickets yet.</p>
                            <Link to="/contact" className="mt-4 inline-block text-indigo-600 hover:underline">Contact Support</Link>
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
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ticketDetail.title}</h2>
                                            <p className="text-sm text-gray-500">Category: {ticketDetail.category}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticketDetail.status]}`}>
                                            {ticketDetail.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticketDetail.description}</p>
                                        <p className="text-xs text-gray-400 mt-2">Submitted on {new Date(ticketDetail.created_at).toLocaleString()}</p>
                                    </div>

                                    {/* Responses (non-internal only) */}
                                    {ticketDetail.responses && ticketDetail.responses.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold mb-2">Responses</h3>
                                            <div className="space-y-3">
                                                {ticketDetail.responses.filter(r => !r.is_internal).map((r) => (
                                                    <div key={r.id} className="border-l-4 border-indigo-400 pl-3 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-r-lg">
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">{r.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">– {r.responder_name} on {new Date(r.created_at).toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}