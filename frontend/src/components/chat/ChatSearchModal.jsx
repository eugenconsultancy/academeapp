// frontend/src/components/chat/ChatSearchModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import chatApi from '@/api/chatApi';
import { FiX, FiSearch } from 'react-icons/fi';

const ChatSearchModal = ({ conversationId, onClose, onJumpToMessage }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const doSearch = useCallback(async (q) => {
        if (!q.trim()) { setResults([]); setSearched(false); return; }
        setLoading(true);
        setSearched(true);
        try {
            const res = await chatApi.searchMessages(q, conversationId);
            setResults(res.data || []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    const handleSelect = (msg) => {
        onJumpToMessage(msg);
        onClose();
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="cd-search-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="cd-search-modal" onClick={e => e.stopPropagation()}>
                <div className="cd-search-handle" />
                <div className="cd-search-header">
                    <FiSearch size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="cd-search-input"
                        placeholder="Search messages…"
                        value={query}
                        onChange={handleChange}
                    />
                    <button className="cd-search-close" onClick={onClose} aria-label="Close search">
                        <FiX size={16} />
                    </button>
                </div>
                <div className="cd-search-body">
                    {loading && <p className="cd-search-hint">Searching…</p>}
                    {!loading && searched && results.length === 0 && (
                        <p className="cd-search-hint">No messages found for "{query}"</p>
                    )}
                    {!loading && !searched && (
                        <p className="cd-search-hint">Type to search messages in this conversation</p>
                    )}
                    {results.map((msg) => (
                        <div
                            key={msg.id}
                            className="cd-search-result"
                            onClick={() => handleSelect(msg)}
                        >
                            <div className="cd-search-result-header">
                                <span className="cd-search-result-sender">{msg.sender_name || 'User'}</span>
                                <span className="cd-search-result-time">{formatTime(msg.created_at)}</span>
                            </div>
                            <div className="cd-search-result-text">{msg.content}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatSearchModal;