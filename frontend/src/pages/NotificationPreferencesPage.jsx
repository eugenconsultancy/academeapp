import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accountsApi';
import toast from 'react-hot-toast';
import { FiBell, FiMail, FiSmartphone, FiSave, FiArrowLeft } from 'react-icons/fi';
import SkeletonLoader from '../components/shared/SkeletonLoader';

export default function NotificationPreferencesPage() {
    const { user, updateUser, loading } = useAuth();
    const [pushEnabled, setPushEnabled] = useState(false);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [saving, setSaving] = useState(false);

    // In a real app, load preferences from backend. For demo, use local state.
    useEffect(() => {
        // Mock: check if user has FCM token
        setPushEnabled(!!user?.fcm_token);
        // Email alerts default true
        setEmailAlerts(true);
    }, [user]);

    const requestPushPermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Push notifications not supported');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // In production, register FCM token and send to backend
            toast.success('Push notifications enabled');
            setPushEnabled(true);
            // Update user with dummy token
            updateUser({ fcm_token: 'dummy-fcm-token' });
        } else {
            toast.error('Permission denied');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Send preferences to backend (endpoint not implemented in original, but can be added)
            // For demo, just show success
            toast.success('Preferences saved');
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonLoader type="page" />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
                    <FiArrowLeft /> Back to Profile
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border p-6 md:p-8">
                    <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                        <FiBell /> Notification Preferences
                    </h1>

                    <div className="space-y-6">
                        {/* Push Notifications */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <FiSmartphone className="text-indigo-500" size={20} />
                                <div>
                                    <h3 className="font-semibold">Push Notifications</h3>
                                    <p className="text-sm text-gray-500">Receive alerts on your device</p>
                                </div>
                            </div>
                            {pushEnabled ? (
                                <span className="text-green-600 text-sm">Enabled</span>
                            ) : (
                                <button onClick={requestPushPermission} className="px-4 py-1 bg-indigo-600 text-white rounded-lg text-sm">
                                    Enable
                                </button>
                            )}
                        </div>

                        {/* Email Alerts */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <FiMail className="text-indigo-500" size={20} />
                                <div>
                                    <h3 className="font-semibold">Email Alerts</h3>
                                    <p className="text-sm text-gray-500">Important updates via email</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            <FiSave /> {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}