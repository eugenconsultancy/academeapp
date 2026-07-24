// src/hooks/useApi.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { offlineStorage } from '../utils/storage';
import { toast } from 'react-hot-toast';
import useUserStore from '../stores/useUserStore';

// Helper to extract a user‑friendly error message from API responses
function extractErrorMessage(error) {
    const detail = error?.response?.data?.detail;
    if (detail) return detail;

    const status = error?.response?.status;
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 422) return 'The data you submitted is invalid.';
    if (status === 429) return 'Too many requests. Please slow down and try again.';
    if (status >= 500) return 'A server error occurred. Please try again later.';

    return error.message || 'An unexpected error occurred.';
}

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

                    if (isNetworkError || isServerError) {
                        shouldQueue = true;
                        queueReason = isNetworkError ? 'network_error' : 'server_error';
                        console.warn(`Error ${error.response?.status}, queuing for retry:`, error);
                    } else if (isRateLimit) {
                        toast.error('Rate limit exceeded. Please try again later.');
                        throw error;
                    } else if (isAuthError) {
                        // Let the interceptor handle refresh
                        throw error;
                    } else {
                        // Client error (400, 403, 404, 422) – show detail and throw
                        toast.error(extractErrorMessage(error));
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
            if (!isAuthenticated()) {
                console.warn('Skipping onSuccess – user not authenticated');
                return;
            }

            if (data && data._tempId) {
                console.log(`🔄 Reconciling message: tempId=${data._tempId} → realId=${data.id}`);
                queryClient.setQueryData([key], (old) => {
                    if (!Array.isArray(old)) return old;
                    return old.map((item) => {
                        if (item._tempId === data._tempId) {
                            return { ...data, _queued: false, _pendingSync: false, _tempId: undefined };
                        }
                        return item;
                    });
                });
                if (key === 'messages') queryClient.invalidateQueries({ queryKey: ['conversations'] });
                if (data.content) toast.success('Message sent', { duration: 2000 });
                return;
            }

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

            if (data && !data._tempId) {
                console.log(`✅ Mutation successful for ${key}, invalidating queries`);
                queryClient.invalidateQueries({ queryKey: [key] });
                if (key === 'messages') queryClient.invalidateQueries({ queryKey: ['conversations'] });
                if (key === 'conversations') queryClient.invalidateQueries({ queryKey: ['messages'] });
                return;
            }

            console.log(`⚠️ Unknown response format for ${key}, invalidating`);
            queryClient.invalidateQueries({ queryKey: [key] });
        },
        onError: (error, variables) => {
            console.error(`Mutation error for ${key}:`, error);
            if (error.response?.status !== 401) {
                toast.error(extractErrorMessage(error));
            }
            if (isAuthenticated() && variables && variables._tempId) {
                console.log(`❌ Message failed to send: tempId=${variables._tempId}`);
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
            if (!isAuthenticated()) {
                console.warn('Skipping optimistic update – user not authenticated');
                return { previousData: null };
            }
            await queryClient.cancelQueries({ queryKey: [key] });
            const previousData = queryClient.getQueryData([key]);
            queryClient.setQueryData([key], (old) => {
                if (!Array.isArray(old)) return old;
                if (variables._tempId && !variables.id) {
                    const optimisticItem = { ...variables, _tempId: variables._tempId, _optimistic: true, _pendingSync: true, created_at: new Date().toISOString() };
                    return [optimisticItem, ...old];
                } else if (variables.id) {
                    return old.map(item => item.id === variables.id ? { ...item, ...variables, _optimistic: true } : item);
                }
                return old;
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData([key], context.previousData);
            }
            toast.error(extractErrorMessage(err));
        },
        onSuccess: (data, variables) => {
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
            if (isAuthenticated()) {
                queryClient.invalidateQueries({ queryKey: [key] });
                invalidateKeys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
            }
        },
    });
}

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

export function useInvalidateQueries() {
    const queryClient = useQueryClient();
    return (queryKeys) => {
        const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }));
    };
}