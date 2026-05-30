import { useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import SkeletonLoader from '../components/shared/SkeletonLoader';

export default function DataExportPage() {
    const { user, loading } = useAuth();
    const [format, setFormat] = useState('json');
    const [exporting, setExporting] = useState(false);
    const [exportData, setExportData] = useState(null);
    const [error, setError] = useState(null);

    if (loading) return <SkeletonLoader type="page" />;

    const handleExport = async () => {
        setExporting(true);
        setError(null);
        try {
            const response = await accountsApi.exportData(format);
            const data = response.data || response;
            setExportData(data);
            toast.success('Export generated! You can download it now.');
        } catch (err) {
            const msg = err.response?.data?.error || 'Export failed. Try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setExporting(false);
        }
    };

    const handleDownload = async () => {
        if (!exportData?.export_id) return;
        try {
            // The backend would generate a file and return a download URL.
            // For now, we simulate by calling a dedicated download endpoint.
            // In real implementation, the export_data endpoint could return a signed URL.
            // For demo, we assume the endpoint returns a download link.
            const response = await fetch(`/api/accounts/download-export/${exportData.export_id}/`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `academe-export-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (err) {
            toast.error('Could not download file');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6">
                    <FiArrowLeft /> Back to Profile
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <FiDownload className="w-8 h-8 text-indigo-500" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Your Data</h1>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Download a copy of your personal data including profile, attendance records, claims, and activity.
                        The export will be available for 7 days.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" value="json" checked={format === 'json'} onChange={() => setFormat('json')} />
                                    <span>JSON</span>
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                                    <span>CSV</span>
                                </label>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400">
                                <FiAlertCircle /> {error}
                            </div>
                        )}

                        {exportData && exportData.download_url ? (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                                <FiCheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="font-medium text-green-700 dark:text-green-300">Export ready</p>
                                <button
                                    onClick={handleDownload}
                                    className="mt-3 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold"
                                >
                                    Download {format.toUpperCase()}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                            >
                                {exporting ? 'Generating export...' : 'Request Export'}
                            </button>
                        )}
                    </div>

                    <div className="mt-8 text-xs text-gray-400 text-center border-t pt-6 dark:border-gray-700">
                        Your data is protected. Exports expire after 7 days.
                    </div>
                </div>
            </div>
        </div>
    );
}