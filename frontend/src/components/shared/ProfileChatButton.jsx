// frontend/src/components/shared/ProfileChatButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi from '../../api/chatApi';          // default import, not { chatApi }
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileChatButton({ userId }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleChat = async () => {
        // Prevent chatting with yourself
        if (!user || user.id === userId) return;

        try {
            const res = await chatApi.createConversation([userId]);  // array of participant IDs
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            console.error('Failed to create conversation:', err);
            // Optionally show a toast/notification
        }
    };

    // Hide button if viewing own profile or no userId provided
    if (!userId || (user && user.id === userId)) return null;

    return (
        <button
            onClick={handleChat}
            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
            Chat
        </button>
    );
}