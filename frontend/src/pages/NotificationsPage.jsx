import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/client';
import useNotificationWebSocket from '../hooks/useNotificationWebSocket';
import DOMPurify from 'dompurify';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import {
    FiBell, FiAlertCircle, FiMessageSquare, FiCalendar,
    FiMail, FiShield, FiRefreshCw, FiCheck, FiTrash2,
    FiEye, FiX, FiSquare, FiCheckSquare
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

/** Strip all HTML tags, leaving only plain text */
function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);

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
        refetchOnWindowFocus: false, // prevent refetch overwriting optimistic update
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

    // Bulk mark selected as read
    const bulkMarkReadMutation = useMutation({
        mutationFn: (ids) => apiClient.post('/notifications/bulk-mark-read/', { notification_ids: ids }),
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, ids, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark selected as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            setSelectionMode(false);
            setSelectedIds([]);
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
        // Prepend to first page only if filter is 'all' (new notifications are unread)
        if (filter === 'all') {
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old || !old.pages || old.pages.length === 0) return old;
                const newPages = [...old.pages];
                const firstPage = { ...newPages[0], results: [notification, ...newPages[0].results] };
                newPages[0] = firstPage;
                return { ...old, pages: newPages };
            });
        }
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        toast.success('New notification');
    }, [filter, queryClient]);

    useNotificationWebSocket(handleNewNotification);

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

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds([]);
    };

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
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setSelectionMode(false); setSelectedIds([]); }}
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
                        <button
                            onClick={toggleSelectionMode}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${selectionMode ? 'bg-gray-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                        >
                            {selectionMode ? <FiX size={16} /> : <FiCheckSquare size={16} />}
                            {selectionMode ? 'Cancel' : 'Select'}
                        </button>
                        {selectionMode && selectedIds.length > 0 && (
                            <button
                                onClick={() => bulkMarkReadMutation.mutate(selectedIds)}
                                disabled={bulkMarkReadMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                            >
                                <FiCheck size={16} /> Mark {selectedIds.length} as read
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications list */}
                {allNotifications.length > 0 ? (
                    <div className="space-y-3">
                        {allNotifications.map((notif) => {
                            const Icon = TYPE_ICONS[notif.type] || FiBell;
                            const isSelected = selectedIds.includes(notif.id);
                            const plainMessage = stripHtml(notif.message);
                            return (
                                <div
                                    key={notif.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-all hover:shadow-md ${!notif.is_read ? 'border-l-4 border-l-indigo-500' : 'border-gray-100 dark:border-gray-700'
                                        } ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}
                                >
                                    {selectionMode && (
                                        <button
                                            onClick={() => toggleSelection(notif.id)}
                                            className="flex-shrink-0 mt-1 text-indigo-500"
                                        >
                                            {isSelected ? <FiCheckSquare size={20} /> : <FiSquare size={20} />}
                                        </button>
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">{notif.title}</p>
                                            <div className="flex gap-1">
                                                {!notif.is_read && !selectionMode && (
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
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{plainMessage}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>{new Date(notif.created_at).toLocaleString()}</span>
                                            {notif.link && (
                                                <Link to={notif.link} className="text-indigo-500 hover:underline">
                                                    View details →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.is_read && !selectionMode && (
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