import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { classesApi } from '../api/classesApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiClock, FiMapPin, FiCheckCircle } from 'react-icons/fi';

export default function AttendanceDetail() {
    const { entryId } = useParams();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const response = await classesApi.getAttendance(entryId);
                setRecords(response.data || response);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load attendance records');
                toast.error('Failed to load attendance records');
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [entryId]);

    if (loading) return <SkeletonLoader type="list" count={6} />;
    if (error) return (
        <div className="min-h-screen py-8 px-4 text-center">
            <p className="text-red-500">{error}</p>
            <Link to="/classes" className="text-blue-500 hover:underline mt-4 inline-block">Back to Classes</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/classes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6">
                    <FiArrowLeft className="w-4 h-4" /> Back to Classes
                </Link>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Attendance Details</h1>
                    {records.length > 0 ? (
                        <div className="space-y-3">
                            {records.map((record) => (
                                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                            <FiUser className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {record.student_name || record.student?.full_name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{record.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* All records are present, so show a consistent badge */}
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            <FiCheckCircle className="w-3 h-3" /> Present
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{record.sync_method}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <FiUser className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No attendance records found for this class.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}