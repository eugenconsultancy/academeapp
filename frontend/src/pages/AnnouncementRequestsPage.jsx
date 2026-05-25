import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiEye,
    FiChevronRight,
} from 'react-icons/fi';

const STATUS_STYLES = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    seen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    read: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AnnouncementRequestsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const isLeader = ['student_leader', 'faculty_rep', 'class_rep', 'admin'].includes(
        user?.role
    );

    // Fetch requests whenever the filter changes
    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await announcementsApi.listRequests(params);
            // Axios wraps the backend array in response.data
            const data = response.data || [];
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Failed to load requests');
            setRequests([]); // ensure it's an array even on failure
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await announcementsApi.approveRequest(id, 'Approved');
            toast.success('Request approved');
            fetchRequests();
        } catch (err) {
            toast.error('Failed to approve');
        }
    };

    const handleReject = async (id) => {
        const note = prompt('Reason for rejection (optional):');
        try {
            await announcementsApi.rejectRequest(id, note || '');
            toast.success('Request rejected');
            fetchRequests();
        } catch (err) {
            toast.error('Failed to reject');
        }
    };

    if (loading) return <SkeletonLoader type="list" count={4} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Announcement Requests
                    </h1>
                    <Link
                        to="/announcements/requests/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all"
                    >
                        <FiPlus className="w-4 h-4" /> New Request
                    </Link>
                </div>

                {/* Filter tabs */}
                {isLeader && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {['all', 'pending', 'approved', 'rejected'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                )}

                {requests.length === 0 && (
                    <div className="text-center py-16">
                        <FiClock className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No requests found</p>
                    </div>
                )}

                <div className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[req.status] || STATUS_STYLES.pending
                                                }`}
                                        >
                                            {req.status}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {req.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {req.content}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {isLeader && req.status === 'pending' && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleApprove(req.id)}
                                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors"
                                            title="Approve"
                                        >
                                            <FiCheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Reject"
                                        >
                                            <FiXCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}