// src/hooks/useApi.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { offlineStorage } from '../utils/storage';
import { toast } from 'react-hot-toast';

export function useSyncMutation(mutationFn, { key, endpoint, method = 'POST' }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            let shouldQueue = false;
            let queueReason = null;

            // Check online status
            const isOnline = navigator.onLine;

            if (!isOnline) {
                shouldQueue = true;
                queueReason = 'offline';
            } else {
                try {
                    const result = await mutationFn(data);
                    // Ensure we return the actual data, not the axios wrapper
                    return result?.data ?? result;
                } catch (error) {
                    // Distinguish between network errors and server errors
                    const isNetworkError = !error.response && error.request;
                    const isServerError = error.response?.status >= 500;
                    const isRateLimit = error.response?.status === 429;
                    const isAuthError = error.response?.status === 401;

                    if (isNetworkError) {
                        shouldQueue = true;
                        queueReason = 'network_error';
                    } else if (isServerError) {
                        // Server error - queue for retry later
                        shouldQueue = true;
                        queueReason = 'server_error';
                        console.warn(`Server error ${error.response?.status}, queuing for retry:`, error);
                    } else if (isRateLimit) {
                        // Rate limit - don't queue, just show error
                        toast.error('Rate limit exceeded. Please try again later.');
                        throw error;
                    } else if (isAuthError) {
                        // Auth error - don't queue, let the interceptor handle refresh
                        throw error;
                    } else {
                        // Client error (400, 403, 404, etc.) - don't queue
                        throw error;
                    }
                }
            }

            if (shouldQueue) {
                try {
                    await offlineStorage.addToSyncQueue({
                        type: key.toUpperCase(),
                        endpoint,
                        method: method.toUpperCase(),
                        data,
                        reason: queueReason,
                        timestamp: new Date().toISOString(),
                    });
                    toast.success('Saved locally (Offline mode)');
                    return { status: 'queued', queueReason, key };
                } catch (queueError) {
                    console.error('Failed to queue message:', queueError);
                    toast.error('Failed to save message');
                    throw queueError;
                }
            }
        },
        onSuccess: (data, variables) => {
            // ============================================================
            // FIX: Reconciliation logic - replace tempId with real message
            // ============================================================

            // Case 1: Server returned data with _tempId - reconcile by replacing
            if (data && data._tempId) {
                console.log(`🔄 Reconciling message: tempId=${data._tempId} → realId=${data.id}`);

                queryClient.setQueryData([key], (old) => {
                    if (!Array.isArray(old)) return old;

                    // Find and replace the temporary message with the real one
                    const newData = old.map((item) => {
                        // If this item has a matching _tempId, replace it with server data
                        if (item._tempId === data._tempId) {
                            return {
                                ...data,
                                _queued: false,
                                _pendingSync: false,
                                _tempId: undefined,  // Remove tempId after reconciliation
                            };
                        }
                        return item;
                    });

                    // Also remove any pending flags from the replaced item
                    return newData;
                });

                // Optionally invalidate conversations to update last message
                if (key === 'messages') {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }

                // Show success toast for the reconciled message
                if (data.content) {
                    toast.success('Message sent', { duration: 2000 });
                }
                return;
            }

            // Case 2: Data is queued (offline mode)
            if (data?.status === 'queued') {
                console.log(`📦 Message queued for later sync: ${key}`);

                // Update cache with queued status
                queryClient.setQueryData([key], (old) => {
                    const oldData = Array.isArray(old) ? old : [];
                    return [...oldData, {
                        ...data,
                        _queued: true,
                        _pendingSync: true,
                        // Generate a temporary ID for queued items
                        _tempId: data._tempId || `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    }];
                });
                return;
            }

            // Case 3: Normal successful mutation without tempId (edit, delete, etc.)
            if (data && !data._tempId) {
                console.log(`✅ Mutation successful for ${key}, invalidating queries`);

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: [key] });

                // Also invalidate related queries
                if (key === 'messages') {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }
                if (key === 'conversations') {
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                }
                return;
            }

            // Fallback: just invalidate
            console.log(`⚠️ Unknown response format for ${key}, invalidating`);
            queryClient.invalidateQueries({ queryKey: [key] });
        },
        onError: (error, variables) => {
            console.error(`Mutation error for ${key}:`, error);

            // Don't show error toast for auth errors (interceptor will handle)
            if (error.response?.status !== 401) {
                const errorMessage = error.response?.data?.message ||
                    error.response?.data?.error ||
                    error.message ||
                    'Operation failed';
                toast.error(errorMessage);
            }

            // If there's a tempId in variables, mark the message as failed
            if (variables && variables._tempId) {
                console.log(`❌ Message failed to send: tempId=${variables._tempId}`);
                // This could trigger a failed state in the UI
            }
        },
        onSettled: (data, error, variables) => {
            // Optional: any cleanup after mutation settles
            if (data?._tempId && !error) {
                console.log(`✅ Reconciliation complete for ${data._tempId}`);
            }
        },
    });
}

// Custom hook for optimistic updates with rollback
export function useOptimisticMutation(mutationFn, { key, invalidateKeys = [] }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: mutationFn,
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: [key] });

            // Snapshot previous value
            const previousData = queryClient.getQueryData([key]);

            // Optimistically update based on the operation type
            queryClient.setQueryData([key], (old) => {
                if (!Array.isArray(old)) return old;

                // Check if we're adding, updating, or deleting
                if (variables._tempId && !variables.id) {
                    // Adding new item - add optimistic version
                    const optimisticItem = {
                        ...variables,
                        _tempId: variables._tempId,
                        _optimistic: true,
                        _pendingSync: true,
                        created_at: new Date().toISOString(),
                    };
                    return [optimisticItem, ...old];
                } else if (variables.id) {
                    // Updating existing item
                    return old.map(item =>
                        item.id === variables.id ? { ...item, ...variables, _optimistic: true } : item
                    );
                }
                return old;
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData([key], context.previousData);
            }
            toast.error(err.response?.data?.message || 'Operation failed');
        },
        onSuccess: (data, variables) => {
            // Replace optimistic item with real data
            if (data && data._tempId && variables._tempId) {
                queryClient.setQueryData([key], (old) => {
                    if (!Array.isArray(old)) return old;

                    return old.map(item =>
                        item._tempId === data._tempId
                            ? { ...data, _optimistic: false, _pendingSync: false }
                            : item
                    );
                });
            }
        },
        onSettled: () => {
            // Invalidate queries to ensure consistency
            queryClient.invalidateQueries({ queryKey: [key] });
            invalidateKeys.forEach(k => {
                queryClient.invalidateQueries({ queryKey: [k] });
            });
        },
    });
}

// Helper hook for fetching data with cache management
export function useFetchQuery(queryKey, fetchFn, options = {}) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        queryFn: fetchFn,
        staleTime: options.staleTime || 1000 * 60, // 1 minute default
        cacheTime: options.cacheTime || 1000 * 60 * 5, // 5 minutes default
        refetchOnWindowFocus: options.refetchOnWindowFocus || false,
        refetchOnMount: options.refetchOnMount || true,
        retry: options.retry || 1,
        ...options,
    });
}

// Helper for prefetching data
export function usePrefetchQuery(queryKey, fetchFn) {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
            queryFn: fetchFn,
            staleTime: 1000 * 60, // 1 minute
        });
    };
}

// Helper for invalidating multiple queries
export function useInvalidateQueries() {
    const queryClient = useQueryClient();

    return (queryKeys) => {
        const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
        keys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });
    };
}