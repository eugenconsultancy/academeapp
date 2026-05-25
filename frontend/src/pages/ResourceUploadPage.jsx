import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUpload, FiX, FiCheckCircle } from 'react-icons/fi';
import apiClient from '../api/client'; // or a dedicated resourceApi

export default function ResourceUploadPage() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.size > 10 * 1024 * 1024) {
            toast.error('File size must be under 10 MB');
            return;
        }
        setFile(selected);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !title.trim()) {
            toast.error('Title and file are required');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('description', description);
            await apiClient.post('/resources/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Resource uploaded successfully!');
            navigate('/resources'); // or wherever you list resources
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Upload Resource</h1>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">File</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl">
                                <div className="space-y-1 text-center">
                                    {file ? (
                                        <div className="flex items-center gap-2">
                                            <FiCheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{file.name}</span>
                                            <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                                                <FiX className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <FiUpload className="mx-auto h-10 w-10 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, PPT, ZIP up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {uploading ? 'Uploading...' : <><FiUpload className="w-4 h-4" /> Upload</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}