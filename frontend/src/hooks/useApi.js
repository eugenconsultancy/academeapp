import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { offlineStorage } from '../utils/storage';
import { toast } from 'react-hot-toast';

export function useSyncMutation(mutationFn, { key, endpoint, method = 'POST' }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            let isOffline = !navigator.onLine;

            // Attempt live call only when online
            if (!isOffline) {
                try {
                    const result = await mutationFn(data);
                    return result?.data ?? result; // ensure the actual response is returned
                } catch (error) {
                    // Distinguish network failure from real server errors
                    const isNetworkErr = !error.response && error.request;
                    if (isNetworkErr) {
                        isOffline = true; // fallback to offline queue
                    } else {
                        throw error; // propagate 4xx/5xx(exopound more the dff types or errors) to onError
                    }
                }
            }

            if (isOffline) {
                await offlineStorage.addToSyncQueue({
                    type: key.toUpperCase(),
                    endpoint,
                    method: method.toUpperCase(),
                    data,
                });
                toast.success('Saved locally (Offline mode)');
                return { status: 'queued' };
            }
        },
        onSuccess: (data) => {
            // Don't invalidate live cache if the mutation was only queued offline
            if (data?.status !== 'queued') {
                queryClient.invalidateQueries({ queryKey: [key] });
            }
        },
    });
}