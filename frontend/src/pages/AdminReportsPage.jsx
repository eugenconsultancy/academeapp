import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiFlag, FiCheckCircle, FiExternalLink } from 'react-icons/fi';

const REASON_COLORS = {
    spam: 'bg-yellow-100 text-yellow-700',
    inappropriate: 'bg-red-100 text-red-700',
    misinformation: 'bg-orange-100 text-orange-700',
    harassment: 'bg-red-100 text-red-700',
    scam: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-700',
    other: 'bg-gray-100 text-gray-700',
};

export default function AdminReportsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/'); return; }
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/announcements/reports/', { params: { resolved: filter === 'resolved' } });
            setReports(response.data);
        } catch (err) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (reportId) => {
        const note = prompt('Resolution note (optional):') || 'Resolved';
        try {
            await apiClient.put(`/announcements/reports/${reportId}/resolve/`, null, { params: { resolution_note: note } });
            toast.success('Report resolved');
            fetchReports();
        } catch (err) {
            toast.error('Failed to resolve report');
        }
    };

    if (loading) return <SkeletonLoader type="list" count={4} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Content Reports</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Review and moderate reported content.</p>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6">
                    {['all', 'pending', 'resolved'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REASON_COLORS[report.reason] || REASON_COLORS.other}`}>
                                            {report.reason}
                                        </span>
                                        {report.is_resolved && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold flex items-center gap-1">
                                                <FiCheckCircle className="w-3 h-3" /> Resolved
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{report.announcement_title || report.content_title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Reported by {report.reported_by_name} on {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                    {report.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">"{report.description}"</p>
                                    )}
                                </div>
                                {!report.is_resolved && (
                                    <button onClick={() => handleResolve(report.id)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 flex-shrink-0">
                                        <FiCheckCircle className="w-3 h-3" /> Resolve
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {reports.length === 0 && (
                    <div className="text-center py-16">
                        <FiFlag className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No reports found</p>
                    </div>
                )}
            </div>
        </div>
    );
}