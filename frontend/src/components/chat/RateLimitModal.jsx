// frontend/src/components/chat/RateLimitModal.jsx
import React from 'react';
import useChatStore from '@/stores/useChatStore';

const RateLimitModal = ({ onClose }) => {
    const { rateLimit } = useChatStore();
    const resetTime = rateLimit.reset_at ? new Date(rateLimit.reset_at) : null;
    const formattedReset = resetTime
        ? resetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'midnight';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-sm text-center">
                <h3 className="text-xl font-bold text-red-600 mb-2">Daily Limit Reached</h3>
                <p className="text-gray-700 mb-4">
                    You have sent the maximum of {rateLimit.limit} messages today.
                    <br />
                    Your limit resets at {formattedReset}.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    aria-label="Close"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default RateLimitModal;