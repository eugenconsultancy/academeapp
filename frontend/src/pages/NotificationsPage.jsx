import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/client';
import useNotificationWebSocket from '../hooks/useNotificationWebSocket';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import {
    FiBell, FiAlertCircle, FiMessageSquare, FiCalendar,
    FiMail, FiShield, FiRefreshCw, FiCheck, FiTrash2,
    FiEye, FiX
} from 'react-icons/fi';

const TYPE_ICONS = {
    announcement: FiBell,
    announcement_urgent: FiAlertCircle,
    class: FiCalendar,
    class_reminder: FiCalendar,
    found_item: FiAlertCircle,
    item_found: FiAlertCircle,
    claim_update: FiShield,
    claim_approved: FiCheck,
    claim_rejected: FiX,
    opportunity: FiMail,
    opportunity_expiring: FiMail,
    ticket_updated: FiMessageSquare,
    badge_earned: FiRefreshCw,
    role_assigned: FiShield,
    role_expired: FiShield,
    role_expiring_soon: FiShield,
    system: FiRefreshCw,
};

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');

    // Infinite query with cursor pagination
    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['notifications', 'infinite', filter],
        queryFn: async ({ pageParam }) => {
            const params = { page_size: 20 };
            if (pageParam) params.cursor = pageParam;
            if (filter === 'unread') params.unread_only = true;
            const res = await apiClient.get('/notifications/', { params });
            return res.data;
        },
        getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
        initialPageParam: undefined,
        staleTime: 30000,
        retry: 1,
    });

    // Unread count
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/unread-count/');
            return res.data.unread_count;
        },
        refetchInterval: 30000,
    });

    // Mark single read mutation
    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.post(`/notifications/${id}/read/`),
        onMutate: async (id) => {
            // Optimistic update: mark as read in cache
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => n.id === id ? { ...n, is_read: true } : n),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            // No need to invalidate main query because we optimistically updated.
        },
    });

    // Mark all read mutation
    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.post('/notifications/mark-all-read/'),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => ({ ...n, is_read: true })),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark all as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(`/notifications/${id}/`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.filter(n => n.id !== id),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to delete');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // WebSocket integration
    const handleNewNotification = useCallback((notification) => {
        // Prepend to first page
        queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
            if (!old || !old.pages || old.pages.length === 0) return old;
            const newPages = [...old.pages];
            const firstPage = { ...newPages[0], results: [notification, ...newPages[0].results] };
            newPages[0] = firstPage;
            return { ...old, pages: newPages };
        });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        toast.success('New notification');
    }, [filter, queryClient]);

    const { disconnect: wsDisconnect } = useNotificationWebSocket(handleNewNotification);

    // Infinite scroll observer
    const loadMoreRef = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allNotifications = data?.pages?.flatMap(page => page.results) ?? [];
    const unreadCount = unreadCountData ?? 0;

    if (isLoading) return <SkeletonLoader type="list" count={6} />;
    if (isError) return (
        <div className="text-center py-16">
            <FiX className="w-16 h-16 mx-auto text-red-300 mb-4" />
            <p className="text-red-500">Failed to load notifications.</p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] })}
                className="mt-2 text-indigo-600 hover:underline">
                Retry
            </button>
        </div>
    );

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
                {allNotifications.length > 0 ? (
                    <div className="space-y-3">
                        {allNotifications.map((notif) => {
                            const Icon = TYPE_ICONS[notif.type] || FiBell;
                            return (
                                <div
                                    key={notif.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-all hover:shadow-md ${!notif.is_read ? 'border-l-4 border-l-indigo-500' : 'border-gray-100 dark:border-gray-700'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">{notif.title}</p>
                                            <div className="flex gap-1">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => markReadMutation.mutate(notif.id)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 p-1"
                                                        title="Mark as read"
                                                    >
                                                        <FiEye size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteMutation.mutate(notif.id)}
                                                    className="text-xs text-gray-400 hover:text-red-500 p-1"
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
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

                        {/* Infinite scroll trigger */}
                        <div ref={loadMoreRef} className="h-4" />
                        {isFetchingNextPage && <SkeletonLoader type="list" count={3} />}
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