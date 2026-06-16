// src/hooks/useApi.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { offlineStorage } from '../utils/storage';
import { toast } from 'react-hot-toast';
import useUserStore from '../stores/useUserStore';

// Helper to check if user is still authenticated at the moment of cache update
const isAuthenticated = () => {
    const { user, token } = useUserStore.getState();
    return !!(user && token);
};

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
                    return result?.data ?? result;
                } catch (error) {
                    const isNetworkError = !error.response && error.request;
                    const isServerError = error.response?.status >= 500;
                    const isRateLimit = error.response?.status === 429;
                    const isAuthError = error.response?.status === 401;

                    if (isNetworkError) {
                        shouldQueue = true;
                        queueReason = 'network_error';
                    } else if (isServerError) {
                        shouldQueue = true;
                        queueReason = 'server_error';
                        console.warn(`Server error ${error.response?.status}, queuing for retry:`, error);
                    } else if (isRateLimit) {
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
            // 🛡️ Guard: if user logged out during the request, abort cache updates
            if (!isAuthenticated()) {
                console.warn('Skipping onSuccess – user not authenticated');
                return;
            }

            // Case 1: Server returned data with _tempId - reconcile by replacing
            if (data && data._tempId) {
                console.log(`🔄 Reconciling message: tempId=${data._tempId} → realId=${data.id}`);

                queryClient.setQueryData([key], (old) => {
                    if (!Array.isArray(old)) return old;

                    return old.map((item) => {
                        if (item._tempId === data._tempId) {
                            return {
                                ...data,
                                _queued: false,
                                _pendingSync: false,
                                _tempId: undefined,
                            };
                        }
                        return item;
                    });
                });

                if (key === 'messages') {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }

                if (data.content) {
                    toast.success('Message sent', { duration: 2000 });
                }
                return;
            }

            // Case 2: Data is queued (offline mode)
            if (data?.status === 'queued') {
                console.log(`📦 Message queued for later sync: ${key}`);

                queryClient.setQueryData([key], (old) => {
                    const oldData = Array.isArray(old) ? old : [];
                    return [...oldData, {
                        ...data,
                        _queued: true,
                        _pendingSync: true,
                        _tempId: data._tempId || `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    }];
                });
                return;
            }

            // Case 3: Normal successful mutation without tempId (edit, delete, etc.)
            if (data && !data._tempId) {
                console.log(`✅ Mutation successful for ${key}, invalidating queries`);
                queryClient.invalidateQueries({ queryKey: [key] });
                if (key === 'messages') {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }
                if (key === 'conversations') {
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                }
                return;
            }

            // Fallback
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

            // Mark temp message as failed only if still authenticated
            if (isAuthenticated() && variables && variables._tempId) {
                console.log(`❌ Message failed to send: tempId=${variables._tempId}`);
                // Could update UI here
            }
        },
        onSettled: (data, error, variables) => {
            if (data?._tempId && !error) {
                console.log(`✅ Reconciliation complete for ${data._tempId}`);
            }
        },
    });
}

export function useOptimisticMutation(mutationFn, { key, invalidateKeys = [] }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: mutationFn,
        onMutate: async (variables) => {
            // 🛡️ Guard: do not create optimistic data if user is not authenticated
            if (!isAuthenticated()) {
                console.warn('Skipping optimistic update – user not authenticated');
                return { previousData: null };
            }

            await queryClient.cancelQueries({ queryKey: [key] });
            const previousData = queryClient.getQueryData([key]);

            queryClient.setQueryData([key], (old) => {
                if (!Array.isArray(old)) return old;

                if (variables._tempId && !variables.id) {
                    const optimisticItem = {
                        ...variables,
                        _tempId: variables._tempId,
                        _optimistic: true,
                        _pendingSync: true,
                        created_at: new Date().toISOString(),
                    };
                    return [optimisticItem, ...old];
                } else if (variables.id) {
                    return old.map(item =>
                        item.id === variables.id ? { ...item, ...variables, _optimistic: true } : item
                    );
                }
                return old;
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback only if we have a previous snapshot
            if (context?.previousData) {
                queryClient.setQueryData([key], context.previousData);
            }
            toast.error(err.response?.data?.message || 'Operation failed');
        },
        onSuccess: (data, variables) => {
            // 🛡️ Guard: skip cache update if logged out
            if (!isAuthenticated()) {
                console.warn('Skipping optimistic onSuccess – user not authenticated');
                return;
            }

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
            // Only invalidate if still authenticated
            if (isAuthenticated()) {
                queryClient.invalidateQueries({ queryKey: [key] });
                invalidateKeys.forEach(k => {
                    queryClient.invalidateQueries({ queryKey: [k] });
                });
            }
        },
    });
}

// Helper hook for fetching data with cache management
export function useFetchQuery(queryKey, fetchFn, options = {}) {
    return useQuery({
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        queryFn: fetchFn,
        staleTime: options.staleTime || 1000 * 60,
        cacheTime: options.cacheTime || 1000 * 60 * 5,
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
            staleTime: 1000 * 60,
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