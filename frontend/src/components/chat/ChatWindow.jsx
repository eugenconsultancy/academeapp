import React, { useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useChatStore } from '../../stores/useChatStore';
import DOMPurify from 'dompurify';

const MessageRow = ({ data, index, style }) => {
    const msg = data[index];
    const user = useChatStore(s => s.user);
    const isMine = msg.sender_id === user?.id;

    return (
        <div style={style} className={`flex px-4 py-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isMine
                    ? 'bg-indigo-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-gray-600'
                }`}>
                {msg.msg_type === 'TEXT' && (
                    <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }} />
                )}
                {msg.msg_type === 'FILE' && (
                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-sm underline flex items-center gap-1">
                        📎 Attachment
                    </a>
                )}
                {msg.msg_type === 'VOICE' && (
                    <audio controls src={msg.file_url} className="max-w-[200px] h-8" />
                )}
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span>{new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMine && (
                        <span>
                            {msg._pending ? '🕒' : msg._failed ? '❌' : '✓'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ChatWindow({ conversationId }) {
    const messages = useChatStore(s => s.messages[conversationId] || []);
    const loadOlderMessages = useChatStore(s => s.loadOlderMessages);
    const cursor = useChatStore(s => s.cursors?.[conversationId]);
    const listRef = useRef(null);
    const outerRef = useRef(null);
    const isScrolledToBottomRef = useRef(true);

    // Auto-scroll to bottom when new messages arrive (if already at bottom)
    useEffect(() => {
        if (listRef.current && messages.length && isScrolledToBottomRef.current) {
            listRef.current.scrollToItem(messages.length - 1, 'end');
        }
    }, [messages.length]);

    const handleScroll = useCallback(({ scrollOffset }) => {
        // Load older messages when scrolled near top
        if (scrollOffset < 50 && cursor?.hasMore) {
            loadOlderMessages(conversationId);
        }
        // Detect if at bottom to enable auto-scroll
        if (outerRef.current) {
            const { scrollHeight, clientHeight, scrollTop } = outerRef.current;
            isScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
        }
    }, [conversationId, cursor, loadOlderMessages]);

    return (
        <div className="h-full">
            <List
                ref={listRef}
                outerRef={outerRef}
                height={typeof window !== 'undefined' ? window.innerHeight - 180 : 600}
                itemCount={messages.length}
                itemSize={70}
                width="100%"
                itemData={messages}
                onScroll={handleScroll}
            >
                {MessageRow}
            </List>
        </div>
    );
}