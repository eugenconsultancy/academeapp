import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';

export default function DeleteAccountConfirmation({ onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [reason, setReason] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }
        setDeleting(true);
        try {
            await accountsApi.deleteAccount();
            toast.success('Account deactivated. You will be logged out.');
            logout();
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <FiTrash2 size={24} />
                        <h2 className="text-xl font-bold">Delete Account</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex gap-3 text-red-700 dark:text-red-300 text-sm">
                    <FiAlertTriangle className="flex-shrink-0 mt-0.5" />
                    <span>This action is irreversible. Your account will be deactivated and all your data will be anonymized after 30 days.</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            placeholder="Help us improve by telling us why you're leaving..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type <span className="font-mono font-bold">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                            placeholder="DELETE"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-50"
                        >
                            {deleting ? 'Deactivating...' : 'Yes, Delete My Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}