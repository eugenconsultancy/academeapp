import React from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../../api/chatApi';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileChatButton({ userId }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleChat = async () => {
        try {
            const res = await chatApi.startConversation(userId);
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <button onClick={handleChat} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm">
            Chat
        </button>
    );
}