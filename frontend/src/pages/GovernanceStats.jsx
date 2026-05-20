import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { FiUsers, FiActivity, FiBell, FiPackage, FiBriefcase, FiBook, FiTrendingUp } from 'react-icons/fi';

export default function GovernanceStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/governance/stats/');
            setStats(response.data);
        } catch (err) {
            console.error('Failed to load stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <SkeletonLoader type="dashboard" />;

    const statCards = [
        { label: 'Total Students', value: stats?.students_count || 0, icon: FiUsers, color: 'blue' },
        { label: 'Active Roles', value: stats?.active_roles || 0, icon: FiActivity, color: 'green' },
        { label: 'Announcements', value: stats?.announcements_count || 0, icon: FiBell, color: 'purple' },
        { label: 'Found Items', value: stats?.found_items_count || 0, icon: FiPackage, color: 'orange' },
        { label: 'Opportunities', value: stats?.opportunities_count || 0, icon: FiBriefcase, color: 'teal' },
        { label: 'Classes', value: stats?.classes_count || 0, icon: FiBook, color: 'pink' },
    ];

    const colorMap = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Platform Statistics</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Comprehensive platform metrics and analytics.</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {statCards.map((card) => (
                        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 text-center">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${colorMap[card.color]}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Additional stats */}
                {stats?.role_breakdown && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FiTrendingUp className="w-5 h-5 text-blue-500" /> Role Distribution
                        </h2>
                        <div className="space-y-3">
                            {Object.entries(stats.role_breakdown).map(([role, count]) => (
                                <div key={role} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{role.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${stats.students_count ? (count / stats.students_count) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!stats && (
                    <div className="text-center py-16">
                        <FiTrendingUp className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No statistics available</p>
                    </div>
                )}
            </div>
        </div>
    );
}