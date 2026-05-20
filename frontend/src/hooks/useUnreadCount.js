import { useQuery } from '@tanstack/react-query';
import { opportunitiesApi } from '../api/opportunitiesApi';

export function useUnreadCount() {
    const { data } = useQuery({
        queryKey: ['unread-opportunities'],
        queryFn: () => opportunitiesApi.getUnreadCount(),
        refetchInterval: 60000, // Refetch every minute
    });

    return data?.count || 0;
}