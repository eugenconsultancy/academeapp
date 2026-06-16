// frontend/src/components/chat/DeleteConfirmation.jsx
import React from 'react';
import useUserStore from '@/stores/useUserStore';
import useChatStore from '@/stores/useChatStore';

const DeleteConfirmation = ({ message, onDelete, onClose }) => {
    const currentUser = useUserStore((s) => s.user);
    const isOwn = message?.sender_id === currentUser?.id;
    const now = new Date();
    const msgTime = new Date(message?.created_at);
    const canDeleteForEveryone = isOwn && (now - msgTime) / 1000 < 3600; // 1 hour

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-80">
                <h3 className="font-bold mb-2">Delete Message?</h3>
                <p className="text-sm text-gray-600 mb-4">
                    {isOwn
                        ? canDeleteForEveryone
                            ? 'You can delete this message for everyone or just for yourself.'
                            : 'You can only delete this message for yourself (delete for everyone expired after 1 hour).'
                        : 'You can only delete this message for yourself.'}
                </p>
                <div className="flex flex-col space-y-2">
                    {isOwn && canDeleteForEveryone && (
                        <button
                            onClick={() => onDelete('everyone')}
                            className="text-red-600 hover:bg-red-50 p-2 rounded text-left"
                        >
                            Delete for everyone
                        </button>
                    )}
                    <button
                        onClick={() => onDelete('self')}
                        className="text-gray-600 hover:bg-gray-100 p-2 rounded text-left"
                    >
                        Delete for me
                    </button>
                    <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-2 rounded text-left">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmation;