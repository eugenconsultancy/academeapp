import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import {
    FiBell, FiCheckCircle, FiAlertCircle, FiMessageSquare, FiCalendar,
    FiMail, FiShield, FiRefreshCw, FiCheck, FiX, FiEye
} from 'react-icons/fi';

const TYPE_ICONS = {
    announcement: FiBell,
    class: FiCalendar,
    found_item: FiAlertCircle,
    opportunity: FiMail,
    governance: FiShield,
    system: FiRefreshCw,
};

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all'); // 'all', 'unread'

    // Fetch notifications
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', filter],
        queryFn: async () => {
            const url = filter === 'unread'
                ? '/notifications/?unread_only=true&limit=100'
                : '/notifications/?limit=100';
            const response = await apiClient.get(url);
            return response.data || [];
        },
    });

    // Fetch unread count for badge
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/unread-count/');
            return res.data.unread_count;
        },
        refetchInterval: 30000, // refetch every 30 seconds
    });

    // Mark single notification as read
    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.post(`/notifications/${id}/read/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
        onError: () => toast.error('Failed to mark as read'),
    });

    // Mark all as read
    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.post('/notifications/mark-all-read/'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            toast.success('All notifications marked as read');
        },
        onError: () => toast.error('Failed to mark all as read'),
    });

    if (isLoading) return <SkeletonLoader type="list" count={6} />;

    const unreadCount = unreadCountData || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiBell className="inline-block" /> Notifications
                            {unreadCount > 0 && (
                                <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread only</option>
                        </select>
                        <button
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending || unreadCount === 0}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            <FiCheck size={16} /> Mark all read
                        </button>
                    </div>
                </div>

                {/* Notifications list */}
                {notifications?.length > 0 ? (
                    <div className="space-y-3">
                        {notifications.map((notif) => {
                            const Icon = TYPE_ICONS[notif.type] || FiBell;
                            return (
                                <div
                                    key={notif.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-all hover:shadow-md ${!notif.is_read ? 'border-l-4 border-l-indigo-500' : 'border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                                            {!notif.is_read && (
                                                <button
                                                    onClick={() => markReadMutation.mutate(notif.id)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                    disabled={markReadMutation.isPending}
                                                >
                                                    <FiEye size={12} /> Mark read
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>{new Date(notif.created_at).toLocaleString()}</span>
                                            {notif.link && (
                                                <Link to={notif.link} className="text-indigo-500 hover:underline">
                                                    View details →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.is_read && (
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <FiBell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No notifications yet.</p>
                        <p className="text-sm text-gray-400 mt-1">When you receive important updates, they'll appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}