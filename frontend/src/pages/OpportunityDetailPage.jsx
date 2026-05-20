import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiHeart, FiExternalLink, FiClock, FiUser, FiFlag, FiTrash2, FiEdit3 } from 'react-icons/fi';

export default function OpportunityDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [opportunity, setOpportunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('spam');
    const [reportDescription, setReportDescription] = useState('');

    useEffect(() => {
        fetchOpportunity();
    }, [id]);

    const fetchOpportunity = async () => {
        setLoading(true);
        try {
            const data = await opportunitiesApi.get(id);
            setOpportunity(data);
            setLiked(data.is_liked);
            setLikesCount(data.likes_count);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load opportunity');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLike = async () => {
        try {
            const result = await opportunitiesApi.toggleLike(id);
            setLiked(result.liked);
            setLikesCount(result.count);
        } catch (err) {
            toast.error('Failed to update like');
        }
    };

    const handleReport = async () => {
        try {
            await opportunitiesApi.report(id, reportReason, reportDescription);
            toast.success('Report submitted');
            setShowReportModal(false);
        } catch (err) {
            toast.error('Failed to submit report');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this opportunity?')) return;
        try {
            await opportunitiesApi.delete(id);
            toast.success('Opportunity deleted');
            navigate('/opportunities');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    if (loading) return <SkeletonLoader type="detail" />;
    if (error) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <p className="text-red-500 text-lg">{error}</p>
                <Link to="/opportunities" className="text-blue-500 hover:underline mt-4 inline-block">Back to Opportunities</Link>
            </div>
        );
    }
    if (!opportunity) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <p className="text-gray-500 text-lg">Opportunity not found</p>
                <Link to="/opportunities" className="text-blue-500 hover:underline mt-4 inline-block">Back to Opportunities</Link>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';
    const categoryColors = {
        internship: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        scholarship: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        attachment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        competition: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        workshop: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        concert: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
        other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/opportunities" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <FiArrowLeft className="w-4 h-4" /> Back to Opportunities
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    {/* Category badge */}
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${categoryColors[opportunity.category] || categoryColors.other}`}>
                        {opportunity.category?.charAt(0).toUpperCase() + opportunity.category?.slice(1)}
                    </span>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {opportunity.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                        {opportunity.posted_by && (
                            <span className="flex items-center gap-1"><FiUser className="w-4 h-4" /> {opportunity.posted_by.full_name}</span>
                        )}
                        <span className="flex items-center gap-1"><FiClock className="w-4 h-4" /> {new Date(opportunity.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="prose dark:prose-invert max-w-none mb-8">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{opportunity.description}</p>
                    </div>

                    {/* External link */}
                    {opportunity.link && (
                        <a href={opportunity.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all mb-6">
                            <FiExternalLink className="w-5 h-5" /> Visit Link
                        </a>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={handleToggleLike} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${liked ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                            <FiHeart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                        </button>

                        <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <FiFlag className="w-4 h-4" /> Report
                        </button>

                        {isAdmin && (
                            <>
                                <button onClick={() => navigate(`/opportunities/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                    <FiEdit3 className="w-4 h-4" /> Edit
                                </button>
                                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <FiTrash2 className="w-4 h-4" /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Report Opportunity</h2>
                        <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full px-4 py-2 border rounded-xl mb-3 dark:bg-gray-700 dark:border-gray-600">
                            <option value="spam">Spam</option>
                            <option value="scam">Scam</option>
                            <option value="expired">Expired</option>
                            <option value="inappropriate">Inappropriate</option>
                            <option value="other">Other</option>
                        </select>
                        <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-xl resize-none dark:bg-gray-700 dark:border-gray-600" placeholder="Details (optional)" />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowReportModal(false)} className="flex-1 py-2 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleReport} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}