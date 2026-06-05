// C:\Users\GATARA-BJTU\academe\frontend\src\pages\EditOpportunityPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiEye, FiEdit2 } from 'react-icons/fi';
import DOMPurify from 'dompurify';

export default function EditOpportunityPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'internship',
        link: '',
        expires_in_days: 30,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(false);

    useEffect(() => {
        const fetchOpportunity = async () => {
            try {
                const response = await opportunitiesApi.get(id);
                const data = response.data;
                setForm({
                    title: data.title || '',
                    description: data.description || '',
                    category: data.category || 'internship',
                    link: data.link || '',
                    expires_in_days: data.expires_in_days || 30,
                });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load opportunity');
                toast.error('Failed to load opportunity');
            } finally {
                setLoading(false);
            }
        };
        fetchOpportunity();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            toast.error('Title and description are required');
            return;
        }
        setSaving(true);
        try {
            await opportunitiesApi.update(id, form);
            toast.success('Opportunity updated!');
            navigate(`/opportunities/${id}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update opportunity');
        } finally {
            setSaving(false);
        }
    };

    // ReactQuill toolbar configuration (same as Blog)
    const modules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean'],
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'link', 'image',
    ];

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <SkeletonLoader type="detail" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <p className="text-red-500 text-lg">{error}</p>
                    <Link to="/opportunities" className="text-blue-500 hover:underline mt-4 inline-block">
                        Back to Opportunities
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    to={`/opportunities/${id}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6"
                >
                    <FiArrowLeft className="w-4 h-4" /> Back to Opportunity
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        Edit Opportunity
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Description – Rich Text Editor + Preview Toggle */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Description * (rich text)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setPreview(!preview)}
                                    className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    {preview ? (
                                        <>
                                            <FiEdit2 className="w-4 h-4" /> Edit
                                        </>
                                    ) : (
                                        <>
                                            <FiEye className="w-4 h-4" /> Preview
                                        </>
                                    )}
                                </button>
                            </div>

                            {preview ? (
                                <div
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[200px] prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(form.description),
                                    }}
                                />
                            ) : (
                                <ReactQuill
                                    theme="snow"
                                    value={form.description}
                                    onChange={(html) => setForm({ ...form, description: html })}
                                    modules={modules}
                                    formats={formats}
                                    placeholder="Describe the opportunity in detail..."
                                    className="rounded-xl overflow-hidden"
                                />
                            )}
                        </div>

                        {/* Category & Link */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Category
                                </label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="internship">Internship</option>
                                    <option value="scholarship">Scholarship</option>
                                    <option value="attachment">Attachment</option>
                                    <option value="competition">Competition</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Link (optional)
                                </label>
                                <input
                                    type="url"
                                    value={form.link}
                                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Expires slider */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Expires in (days): {form.expires_in_days}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="120"
                                value={form.expires_in_days}
                                onChange={(e) => setForm({ ...form, expires_in_days: parseInt(e.target.value) })}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate(`/opportunities/${id}`)}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <FiSave className="w-4 h-4" /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}