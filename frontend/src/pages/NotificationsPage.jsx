import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiBell, FiCheckCircle, FiAlertCircle, FiMessageSquare, FiCalendar,
} from 'react-icons/fi';
import apiClient from '../api/client'; // for fetching notifications

export default function NotificationsPage() {
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get('/notifications/'); // adjust endpoint
            return response.data || [];
        },
    });

    if (isLoading) return <SkeletonLoader type="list" count={6} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                    <FiBell className="inline-block mr-2" /> Notifications
                </h1>

                {notifications?.length ? (
                    <div className="space-y-3">
                        {notifications.map((notif) => (
                            <div key={notif.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                    {notif.type === 'announcement' ? <FiBell className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
                                        notif.type === 'class' ? <FiCalendar className="w-5 h-5 text-green-600" /> :
                                            <FiMessageSquare className="w-5 h-5 text-purple-600" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 inline-block">
                                        {new Date(notif.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {!notif.is_read && (
                                    <span className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <FiBell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No notifications yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}