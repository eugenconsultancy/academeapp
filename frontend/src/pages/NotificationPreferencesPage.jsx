// frontend/src/pages/NotificationPreferencesPage.jsx
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import {
    FiBell, FiCalendar, FiBox, FiBriefcase,
    FiMessageSquare, FiShield, FiServer, FiMessageCircle,
    FiAtSign, FiArrowLeft, FiSmartphone
} from 'react-icons/fi';
import SkeletonLoader from '../components/shared/SkeletonLoader';

const PREFERENCE_CATEGORIES = [
    { key: 'push_announcement', label: 'Announcements', icon: FiBell, description: 'School-wide announcements and urgent alerts' },
    { key: 'push_class', label: 'Class Updates', icon: FiCalendar, description: 'Class reminders, cancellations, and schedules' },
    { key: 'push_found_item', label: 'Found Items', icon: FiBox, description: 'Lost & found item claims and updates' },
    { key: 'push_opportunity', label: 'Opportunities', icon: FiBriefcase, description: 'Scholarships, internships, and job postings' },
    { key: 'push_support', label: 'Support', icon: FiMessageSquare, description: 'Support ticket updates and responses' },
    { key: 'push_governance', label: 'Governance', icon: FiShield, description: 'Role assignments, elections, and policies' },
    { key: 'push_chat', label: 'Chat Messages', icon: FiMessageCircle, description: 'New message notifications' },
    { key: 'push_mention', label: 'Mentions', icon: FiAtSign, description: 'When someone mentions you' },
    { key: 'push_system', label: 'System', icon: FiServer, description: 'Account updates and system notifications' },
];

export default function NotificationPreferencesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch preferences from API
    const { data: preferences, isLoading, isError } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/preferences/');
            return res.data;
        },
    });

    // Update preferences mutation
    const updateMutation = useMutation({
        mutationFn: (data) => apiClient.put('/notifications/preferences/', data),
        onSuccess: () => {
            toast.success('Preferences saved');
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        },
        onError: () => toast.error('Failed to save preferences'),
    });

    const handleToggle = (key) => {
        if (!preferences) return;
        updateMutation.mutate({ [key]: !preferences[key] });
    };

    // Push notification permission
    const handleEnablePush = async () => {
        if (!('Notification' in window)) {
            toast.error('Push notifications not supported in this browser');
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                toast.success('Push notifications enabled');
                // TODO: Register Firebase service worker, get FCM token, send to backend
                // const token = await getFCMToken();
                // await accountsApi.updateFCMToken(token);
            } else {
                toast.error('Permission denied. Enable in browser settings.');
            }
        } catch (err) {
            toast.error('Failed to request permission');
        }
    };

    const isPushEnabled = typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted';

    if (isLoading) return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <SkeletonLoader type="page" />
            </div>
        </div>
    );

    if (isError) return (
        <div className="min-h-screen flex items-center justify-center py-16 px-4">
            <div className="text-center">
                <p className="text-red-500 dark:text-red-400">Failed to load preferences.</p>
                <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })}
                    className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-3 sm:px-4">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 p-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mb-4 min-w-[44px] min-h-[44px]"
                    aria-label="Go back"
                >
                    <FiArrowLeft size={18} /> <span className="hidden sm:inline">Back</span>
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border p-4 sm:p-6 md:p-8">
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
                        <FiBell className="text-indigo-500" /> Notification Preferences
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Choose which notifications you want to receive.
                    </p>

                    {/* Push Permission Banner */}
                    {!isPushEnabled && (
                        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <FiSmartphone className="text-indigo-500 flex-shrink-0" size={20} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Enable Push Notifications</p>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">Get notified even when you're not using the app.</p>
                            </div>
                            <button
                                onClick={handleEnablePush}
                                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex-shrink-0 min-h-[44px] flex items-center"
                            >
                                Enable
                            </button>
                        </div>
                    )}

                    {/* Preference Toggles */}
                    <div className="space-y-1">
                        {PREFERENCE_CATEGORIES.map(({ key, label, icon: Icon, description }) => (
                            <div
                                key={key}
                                className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                                    <Icon className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{label}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{description}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={preferences?.[key] ?? true}
                                        onChange={() => handleToggle(key)}
                                        className="sr-only peer"
                                        aria-label={`Toggle ${label} notifications`}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-600 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Save Confirmation */}
                    {updateMutation.isSuccess && (
                        <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 text-center">
                            Preferences saved successfully!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}