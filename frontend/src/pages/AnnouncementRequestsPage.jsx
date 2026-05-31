import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSend, FiInfo } from 'react-icons/fi';

export default function CreateAnnouncementRequestPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [form, setForm] = useState({
        title: '',
        content: '',
        target: 'class_rep',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            toast.error('Please fill in all fields');
            return;
        }
        setSubmitting(true);
        try {
            await announcementsApi.createRequest(form);
            toast.success('Request submitted successfully!');
            navigate('/announcements/requests');
        } catch (err) {
            toast.error('Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link
                    to="/announcements/requests"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6"
                >
                    <FiArrowLeft className="w-4 h-4" /> Back to Requests
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        Request an Announcement
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Your request will be reviewed by the selected recipient(s). Once approved, it will be published as an announcement.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Important Update on Exam Schedule"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Message *
                            </label>
                            <textarea
                                rows={5}
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe the announcement you'd like to share..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Send To *
                            </label>
                            <select
                                value={form.target}
                                onChange={(e) => setForm({ ...form, target: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="class_rep">Class Representative</option>
                                <option value="student_leaders">Student Leaders</option>
                                <option value="both">Both (Class Rep & Student Leaders)</option>
                                <option value="admin">Admin</option>   {/* NEW OPTION */}
                            </select>
                            <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <FiInfo className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>If you select "Admin", your request will go directly to the platform administrators.</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/announcements/requests')}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? 'Submitting...' : <><FiSend className="w-4 h-4" /> Submit Request</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}