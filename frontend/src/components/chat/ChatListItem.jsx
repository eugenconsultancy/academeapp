// frontend/src/components/chat/ChatListItem.jsx
import React from 'react';
import useChatStore from '@/stores/useChatStore';
import useUserStore from '@/stores/useUserStore';

const ChatListItem = ({ conv, onClick }) => {
    const { presence, typingUsers } = useChatStore();
    const currentUser = useUserStore((s) => s.user);

    if (!conv || !currentUser) return null;

    // ── Determine other participant (from backend or fallback) ────────────
    const isGroup = conv.is_group;
    const otherParticipant = conv.other_participant;  // from backend
    const otherUserId = isGroup
        ? null
        : conv.participants?.find((id) => id !== currentUser.id);

    // ── Display name ──────────────────────────────────────────────────────
    let displayName = 'Unknown';
    if (isGroup) {
        displayName = conv.group_name || 'Group';
    } else if (otherParticipant) {
        displayName = otherParticipant.full_name;
    } else if (otherUserId) {
        // Fallback to presence data (if available)
        const presenceData = presence[otherUserId];
        displayName = presenceData?.username || `User ${String(otherUserId).slice(0, 8)}`;
    }

    const initials = displayName.charAt(0).toUpperCase();

    // ── Online status ─────────────────────────────────────────────────────
    const isOnline = otherUserId ? presence[otherUserId]?.online : false;

    // ── Unread count ───────────────────────────────────────────────────────
    const unread = conv.unread_count || 0;

    // ── Typing indicator ───────────────────────────────────────────────────
    const isTyping = otherUserId && typingUsers?.[otherUserId];

    // ── Last message sender name ──────────────────────────────────────────
    let lastSenderName = '';
    if (conv.last_message_sender_id === currentUser.id) {
        lastSenderName = 'You';
    } else if (conv.last_message_sender_id) {
        // Try other participant info first, then fallback to presence
        if (otherParticipant && conv.last_message_sender_id === otherParticipant.id) {
            lastSenderName = otherParticipant.full_name;
        } else {
            const senderPresence = presence[conv.last_message_sender_id];
            lastSenderName = senderPresence?.username || `User ${String(conv.last_message_sender_id).slice(0, 8)}`;
        }
    }

    // ── Time formatting ────────────────────────────────────────────────────
    const timeString = conv.last_message_at
        ? new Date(conv.last_message_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    return (
        <div
            onClick={onClick}
            className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b"
        >
            <div className="relative mr-3">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{
                        backgroundColor:
                            otherParticipant?.avatar_color || '#6366f1',
                    }}
                >
                    {otherParticipant?.avatar_url ? (
                        <img
                            src={otherParticipant.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        initials
                    )}
                </div>
                <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                        <h3 className="font-medium truncate">{displayName}</h3>
                        {conv.is_muted && <span className="text-xs">🔇</span>}
                        {conv.is_pinned && <span className="text-xs">📌</span>}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                        {timeString}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 truncate">
                        {isTyping ? (
                            <span className="italic text-green-600">typing...</span>
                        ) : (
                            <>
                                {lastSenderName && (
                                    <span className="font-medium">{lastSenderName}:</span>
                                )}{' '}
                                {conv.last_message_content || 'No messages'}
                            </>
                        )}
                    </p>
                    {unread > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                            {unread}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChatListItem);