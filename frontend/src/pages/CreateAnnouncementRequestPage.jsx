import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSend } from 'react-icons/fi';

export default function CreateAnnouncementRequestPage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [target, setTarget] = useState('class_rep');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content are required');
            return;
        }

        setLoading(true);
        try {
            await announcementsApi.createRequest({ title, content, target });
            toast.success('Request submitted for review');
            navigate('/announcements/requests');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/announcements/requests" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <FiArrowLeft className="w-4 h-4" /> Back to Requests
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Request Announcement</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        Submit a request for your class rep or student leader to post an announcement.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="What should be announced?" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send to</label>
                            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                <option value="class_rep">Class Representative</option>
                                <option value="student_leaders">Student Leaders</option>
                                <option value="both">Both</option>
                            </select>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? 'Submitting...' : <><FiSend className="w-5 h-5" /> Submit Request</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}