// frontend/src/components/notification/NotificationBell.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { FiBell } from 'react-icons/fi';

export default function NotificationBell() {
    const { data } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/unread-count/');
            return res.data.unread_count;
        },
        refetchInterval: 30000, // Poll every 30 seconds
        staleTime: 15000,
    });

    const unreadCount = data ?? 0;

    return (
        <Link
            to="/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        >
            <FiBell size={20} />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}