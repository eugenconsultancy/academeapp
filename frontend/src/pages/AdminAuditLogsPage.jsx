import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiSearch, FiDownload, FiCalendar, FiUser, FiActivity, FiLoader, FiArrowLeft } from 'react-icons/fi';

const PAGE_SIZE = 50;

export default function AdminAuditLogsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchAction, setSearchAction] = useState('');
    const loaderRef = useRef(null);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    // Infinite query for audit logs
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['audit-logs', searchAction],
        queryFn: async ({ pageParam = 0 }) => {
            const params = {
                limit: PAGE_SIZE,
                offset: pageParam,
            };
            if (searchAction) params.action = searchAction;
            const response = await apiClient.get('/governance/audit-logs/', { params });
            return {
                logs: response.data.results || response.data,
                nextOffset: response.data.next_offset,
                total: response.data.total,
            };
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.nextOffset !== undefined && lastPage.nextOffset !== null) {
                return lastPage.nextOffset;
            }
            if (lastPage.logs.length === PAGE_SIZE) {
                const currentOffset = lastPage.nextOffset - PAGE_SIZE || 0;
                return currentOffset + PAGE_SIZE;
            }
            return undefined;
        },
        initialPageParam: 0,
        staleTime: 5 * 60 * 1000,
        enabled: user?.role === 'admin',
    });

    // Intersection Observer to trigger fetch when reaching bottom
    useEffect(() => {
        if (!loaderRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleExport = async () => {
        try {
            const response = await apiClient.get('/governance/audit-logs/export/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Export downloaded');
        } catch (err) {
            toast.error('Failed to export logs');
        }
    };

    // Flatten all logs from all pages
    const allLogs = data?.pages.flatMap(page => page.logs) || [];

    if (isLoading) return <SkeletonLoader type="list" count={5} />;
    if (isError) return (
        <div className="min-h-screen py-8 px-4 text-center">
            <p className="text-red-500">Failed to load audit logs. Please try again.</p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl">Retry</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Read-only view of all governance actions (lazy loaded)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium shadow-md transition-all">
                            <FiDownload className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all">
                            <FiArrowLeft className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Search filter */}
                <div className="relative mb-6">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchAction}
                        onChange={(e) => setSearchAction(e.target.value)}
                        placeholder="Filter by action (e.g., ROLE_EXPIRED, USER_CREATED)..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Performed By</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {allLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                                                <FiActivity className="w-3 h-3" /> {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {log.performed_by || 'System'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {log.target_user || '-'}
                                            {log.target_type && <span className="text-xs text-gray-400 ml-1">({log.target_type})</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {allLogs.length === 0 && (
                        <div className="text-center py-16">
                            <FiCalendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                        </div>
                    )}

                    {/* Load more trigger */}
                    {hasNextPage && (
                        <div ref={loaderRef} className="py-4 text-center border-t border-gray-100 dark:border-gray-700">
                            {isFetchingNextPage ? (
                                <div className="flex items-center justify-center gap-2 text-gray-500">
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                    Loading more...
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">Scroll for more</p>
                            )}
                        </div>
                    )}

                    {!hasNextPage && allLogs.length > 0 && (
                        <div className="py-4 text-center text-sm text-gray-400 border-t border-gray-100 dark:border-gray-700">
                            ✓ End of audit log history ({allLogs.length} records loaded)
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}