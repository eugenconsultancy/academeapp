// frontend/src/pages/NotificationsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/client';
import useNotificationWebSocket from '../hooks/useNotificationWebSocket';
import DOMPurify from 'dompurify';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { getRelativeTime } from '../utils/time';
import {
    FiBell, FiAlertCircle, FiMessageSquare, FiCalendar,
    FiMail, FiShield, FiRefreshCw, FiCheck, FiTrash2,
    FiEye, FiX, FiSquare, FiCheckSquare, FiArrowLeft,
    FiMessageCircle, FiAtSign, FiServer
} from 'react-icons/fi';

const TYPE_ICONS = {
    announcement: FiBell,
    announcement_urgent: FiAlertCircle,
    class: FiCalendar,
    class_reminder: FiCalendar,
    class_cancelled: FiX,
    class_rescheduled: FiRefreshCw,
    assignment_graded: FiCheck,
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
    new_message: FiMessageCircle,
    mention: FiAtSign,
    reaction: FiRefreshCw,
    system: FiServer,
};

/** Strip all HTML tags, leaving only plain text */
function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [undoDeleteId, setUndoDeleteId] = useState(null);
    const [detailModal, setDetailModal] = useState(null);

    // Infinite query with cursor pagination
    const isDeletedFilter = filter === 'deleted';
    const isUnreadFilter = filter === 'unread';

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
            // Use trash endpoint for deleted filter
            if (isDeletedFilter) {
                const params = { page_size: 20 };
                if (pageParam) params.cursor = pageParam;
                const res = await apiClient.get('/notifications/deleted/', { params });
                return res.data;
            }
            const params = { page_size: 20 };
            if (pageParam) params.cursor = pageParam;
            if (isUnreadFilter) params.unread_only = true;
            const res = await apiClient.get('/notifications/', { params });
            return res.data;
        },
        getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
        initialPageParam: undefined,
        staleTime: 30000,
        retry: 1,
        refetchOnWindowFocus: false,
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

    // Mark as unread mutation
    const markUnreadMutation = useMutation({
        mutationFn: (id) => apiClient.post(`/notifications/${id}/unread/`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => n.id === id ? { ...n, is_read: false } : n),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark as unread');
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

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => apiClient.post('/notifications/bulk-delete/', { notification_ids: ids }),
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.filter(n => !ids.includes(n.id)),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, ids, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to delete notifications');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            setSelectionMode(false);
            setSelectedIds([]);
        },
    });

    // Delete single mutation (with undo support)
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
        onSuccess: (data, id) => {
            setUndoDeleteId(id);
            toast((t) => (
                <div className="flex items-center gap-3">
                    <span className="text-sm">Notification moved to trash</span>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await apiClient.post(`/notifications/${id}/restore/`);
                                queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] });
                                queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
                                toast.success('Restored');
                            } catch {
                                toast.error('Failed to restore');
                            }
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        Undo
                    </button>
                </div>
            ), { duration: 5000 });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: (id) => apiClient.post(`/notifications/${id}/restore/`),
        onSuccess: () => {
            toast.success('Notification restored');
            queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
        onError: () => toast.error('Failed to restore'),
    });

    // Delete all read mutation
    const deleteAllReadMutation = useMutation({
        mutationFn: () => apiClient.delete('/notifications/read/'),
        onSuccess: (data) => {
            toast.success(data.data.message);
            queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
        onError: () => toast.error('Failed to clear read notifications'),
    });

    // Empty trash mutation
    const emptyTrashMutation = useMutation({
        mutationFn: () => apiClient.delete('/notifications/trash/empty/'),
        onSuccess: (data) => {
            toast.success(data.data.message);
            queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] });
        },
        onError: () => toast.error('Failed to empty trash'),
    });

    // WebSocket integration
    const handleNewNotification = useCallback((notification) => {
        if (filter === 'all' || filter === 'unread') {
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
            { threshold: 0.1, rootMargin: '100px' }
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-3 sm:px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Go back"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiBell className="inline-block text-indigo-500" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </h1>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <select
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setSelectionMode(false); setSelectedIds([]); }}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 flex-1 sm:flex-none min-h-[44px]"
                            aria-label="Filter notifications"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread</option>
                            <option value="deleted">Trash</option>
                        </select>

                        {filter !== 'deleted' && (
                            <>
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    disabled={markAllReadMutation.isPending || unreadCount === 0}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
                                    aria-label="Mark all notifications as read"
                                >
                                    <FiCheck size={16} /> <span className="hidden sm:inline">Mark all read</span>
                                </button>
                                {filter === 'all' && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Move all read notifications to trash?')) {
                                                deleteAllReadMutation.mutate();
                                            }
                                        }}
                                        disabled={deleteAllReadMutation.isPending}
                                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg flex items-center gap-1.5 min-h-[44px]"
                                        aria-label="Clear all read notifications"
                                    >
                                        <FiTrash2 size={16} /> <span className="hidden sm:inline">Clear read</span>
                                    </button>
                                )}
                            </>
                        )}

                        {filter === 'deleted' && allNotifications.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Permanently delete all notifications in trash?')) {
                                        emptyTrashMutation.mutate();
                                    }
                                }}
                                disabled={emptyTrashMutation.isPending}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold min-h-[44px] flex items-center gap-1.5"
                            >
                                <FiTrash2 size={16} /> Empty Trash
                            </button>
                        )}

                        {filter !== 'deleted' && (
                            <button
                                onClick={toggleSelectionMode}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 min-h-[44px] ${selectionMode
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {selectionMode ? <FiX size={16} /> : <FiCheckSquare size={16} />}
                                <span className="hidden sm:inline">{selectionMode ? 'Cancel' : 'Select'}</span>
                            </button>
                        )}

                        {selectionMode && selectedIds.length > 0 && (
                            <>
                                <button
                                    onClick={() => bulkMarkReadMutation.mutate(selectedIds)}
                                    disabled={bulkMarkReadMutation.isPending}
                                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 min-h-[44px]"
                                >
                                    <FiCheck size={16} /> <span className="hidden sm:inline">Read ({selectedIds.length})</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Delete ${selectedIds.length} notifications?`)) {
                                            bulkDeleteMutation.mutate(selectedIds);
                                        }
                                    }}
                                    disabled={bulkDeleteMutation.isPending}
                                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 min-h-[44px]"
                                >
                                    <FiTrash2 size={16} /> <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Notifications list */}
                {allNotifications.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3" role="list">
                        {allNotifications.map((notif) => {
                            const Icon = TYPE_ICONS[notif.type] || FiBell;
                            const isSelected = selectedIds.includes(notif.id);
                            const plainMessage = stripHtml(notif.message);
                            return (
                                <div
                                    key={notif.id}
                                    role="listitem"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (selectionMode) {
                                                toggleSelection(notif.id);
                                            } else if (notif.link) {
                                                navigate(notif.link);
                                            } else {
                                                setDetailModal(notif);
                                            }
                                        }
                                    }}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 md:p-5 flex items-start gap-3 sm:gap-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 ${!notif.is_read && !notif.is_deleted
                                            ? 'border-l-4 border-l-indigo-500 dark:border-l-indigo-400'
                                            : 'border-gray-100 dark:border-gray-700'
                                        } ${isSelected ? 'ring-2 ring-indigo-400' : ''} ${notif.is_deleted ? 'opacity-70' : ''
                                        }`}
                                >
                                    {selectionMode && (
                                        <button
                                            onClick={() => toggleSelection(notif.id)}
                                            className="flex-shrink-0 mt-1 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-500"
                                            aria-label={isSelected ? "Deselect notification" : "Select notification"}
                                        >
                                            {isSelected ? <FiCheckSquare size={22} /> : <FiSquare size={22} />}
                                        </button>
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read && !notif.is_deleted
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                                                {notif.title}
                                            </p>
                                            <div className="flex gap-0.5">
                                                {/* Action buttons */}
                                                {!notif.is_deleted && notif.is_read && !selectionMode && (
                                                    <button
                                                        onClick={() => markUnreadMutation.mutate(notif.id)}
                                                        className="text-xs text-gray-400 hover:text-blue-500 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                        title="Mark as unread"
                                                        aria-label="Mark as unread"
                                                    >
                                                        <FiMail size={15} />
                                                    </button>
                                                )}
                                                {!notif.is_deleted && !notif.is_read && !selectionMode && (
                                                    <button
                                                        onClick={() => markReadMutation.mutate(notif.id)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                        title="Mark as read"
                                                        aria-label="Mark as read"
                                                    >
                                                        <FiEye size={15} />
                                                    </button>
                                                )}
                                                {notif.is_deleted && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); restoreMutation.mutate(notif.id); }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                        title="Restore notification"
                                                        aria-label="Restore notification"
                                                    >
                                                        <FiRefreshCw size={15} />
                                                    </button>
                                                )}
                                                {!selectionMode && (
                                                    <button
                                                        onClick={() => deleteMutation.mutate(notif.id)}
                                                        className="text-xs text-gray-400 hover:text-red-500 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                        title={notif.is_deleted ? "Permanently delete" : "Move to trash"}
                                                        aria-label={notif.is_deleted ? "Permanently delete" : "Move to trash"}
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {plainMessage}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                                            <span>{getRelativeTime(notif.created_at)}</span>
                                            {notif.link && !notif.is_deleted && (
                                                <Link to={notif.link} className="text-indigo-500 hover:underline font-medium">
                                                    View details →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.is_read && !notif.is_deleted && !selectionMode && (
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Infinite scroll trigger */}
                        <div ref={loadMoreRef} className="h-10 sm:h-4" />
                        {isFetchingNextPage && <SkeletonLoader type="list" count={3} />}

                        {/* Manual Load More fallback */}
                        {hasNextPage && !isFetchingNextPage && (
                            <div className="text-center py-4">
                                <button
                                    onClick={() => fetchNextPage()}
                                    className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                >
                                    Load more notifications
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <FiBell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            {filter === 'deleted' ? 'Trash is empty.' : 'No notifications yet.'}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            {filter === 'deleted'
                                ? 'Deleted notifications will appear here.'
                                : 'When you receive important updates, they\'ll appear here.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detailModal.title}</h3>
                            <button onClick={() => setDetailModal(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close detail">
                                <FiX size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {getRelativeTime(detailModal.created_at)}
                        </p>
                        <div className="text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detailModal.message) }}
                        />
                        {detailModal.link && (
                            <Link to={detailModal.link} className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
                                View full details →
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}