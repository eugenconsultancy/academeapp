// frontend/src/components/chat/ForwardModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import chatApi from '@/api/chatApi';
import useUserStore from '@/stores/useUserStore';
import useChatStore from '@/stores/useChatStore'; // for presence & usernames

const ForwardModal = ({ message, onClose, onForward }) => {
    const [search, setSearch] = useState('');
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = useUserStore((s) => s.user);
    const { presence } = useChatStore();

    useEffect(() => {
        setLoading(true);
        chatApi
            .getConversations('all')
            .then((res) => {
                const filtered = (res.data || []).filter(
                    (c) => c.id !== message?.conversation_id
                );
                setConversations(filtered);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [message]);

    // Filter by search term
    const filteredConversations = useMemo(() => {
        if (!search.trim()) return conversations;
        const term = search.toLowerCase();
        return conversations.filter((conv) => {
            const display = getDisplayName(conv).toLowerCase();
            return display.includes(term);
        });
    }, [conversations, search]);

    const toggleSelect = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleForward = () => {
        if (selected.length > 0 && onForward) {
            onForward(selected);
        }
        onClose();
    };

    // Derive a display name from participants and presence
    const getDisplayName = (conv) => {
        if (conv.is_group) return conv.group_name || 'Group';
        const otherId = conv.participants?.find((id) => id !== currentUser?.id);
        if (!otherId) return 'Unknown';
        const presenceData = presence[otherId];
        return presenceData?.username || `User ${String(otherId).slice(0, 8)}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] flex flex-col">
                <h3 className="text-lg font-bold mb-4">Forward Message</h3>
                <input
                    type="text"
                    placeholder="Search conversations..."
                    className="w-full border p-2 rounded mb-4"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-gray-500">Loading...</p>
                    ) : filteredConversations.length === 0 ? (
                        <p className="text-center text-gray-500">No conversations</p>
                    ) : (
                        <ul className="space-y-2">
                            {filteredConversations.map((conv) => (
                                <li
                                    key={conv.id}
                                    className={`flex items-center p-2 rounded cursor-pointer ${selected.includes(conv.id) ? 'bg-blue-50' : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => toggleSelect(conv.id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(conv.id)}
                                        readOnly
                                        className="mr-2"
                                    />
                                    <span>{getDisplayName(conv)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
                        Cancel
                    </button>
                    <button
                        onClick={handleForward}
                        disabled={selected.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                        Forward ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;