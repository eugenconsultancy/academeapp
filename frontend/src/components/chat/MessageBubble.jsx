// frontend/src/components/chat/MessageBubble.jsx
//
// Fixes:
//  • Bubbles now have proper padding, elevation, shadow, border-radius
//  • "Own" bubbles: gradient fill (accent → accent2) + white text
//  • "Other" bubbles: glass-surface bg + distinct border
//  • Context menu: glass card, proper hover states, icons
//  • Tick icons replaced with SVG (no emoji jank)
//  • Reply preview styled properly
//  • Image/voice/file attachments properly boxed
//  • Forwarded badge styled
//  • Pending state uses opacity instead of broken emoji clock
//  • onHeightChange still wired via ResizeObserver
//  • Sender name and avatar used correctly (no more "?")
//
import React, { useState, useRef, useEffect, useCallback } from 'react';
import useChatStore from '@/stores/useChatStore';
import useUserStore from '@/stores/useUserStore';
import chatApi from '@/api/chatApi';

/* ── Tick SVG components ── */
const TickSent = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const TickDelivered = () => (
    <svg width="16" height="14" viewBox="0 0 28 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <polyline points="1 8 6 13 14 4" />
        <polyline points="10 8 15 13 28 1" />
    </svg>
);
const TickRead = () => (
    <svg width="16" height="14" viewBox="0 0 28 16" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 8 6 13 14 4" stroke="#2c7cdd" />
        <polyline points="10 8 15 13 28 1" stroke="#226ac2" />
    </svg>
);

const StatusTick = ({ status }) => {
    if (status === 'pending') return <span style={{ opacity: 0.45, fontSize: 11 }}>●</span>;
    if (status === 'sent') return <TickSent />;
    if (status === 'delivered') return <TickDelivered />;
    if (status === 'read') return <TickRead />;
    return null;
};

/* ── Menu item ── */
const MenuItem = ({ icon, label, danger, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 12px', border: 'none',
            background: 'none', borderRadius: 10, cursor: 'pointer',
            fontSize: 13.5, fontWeight: 500, textAlign: 'left',
            color: danger ? 'var(--danger, #e0284a)' : 'var(--text, #0f1421)',
            transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(224,40,74,0.09)' : 'var(--accent-soft, rgba(108,99,255,0.09))'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
        <span style={{ opacity: 0.75, display: 'flex', alignItems: 'center' }}>{icon}</span>
        {label}
    </button>
);

/* ── Icons for context menu ── */
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
const IconReply = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" /></svg>;
const IconForward = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" /></svg>;
const IconDelete = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;
const IconReport = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10S22 17.53 22 12 17.53 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>;

/* ═══════════════════════════════════════════════════
   MessageBubble
   ═══════════════════════════════════════════════════ */
const MessageBubble = ({ message, conversationId, currentUserId, onAction, onHeightChange }) => {
    const { updateMessageStatus, deleteMessageLocally, markMessageEdited, activeConversationId } = useChatStore();
    const user = useUserStore(s => s.user);
    const uid = currentUserId || user?.id;
    const convId = conversationId || activeConversationId;

    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(message.content);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);
    const bubbleRef = useRef(null);
    const longPressRef = useRef(null);

    const isOwn = message.sender_id === uid;
    const deletedEveryone = message.deleted_for_everyone;
    const deletedSelf = message.deleted_for_self && isOwn;

    // ── Sender name and avatar ──────────────────────────────────────────────
    const senderName = message.sender_name || 'Unknown';
    const senderAvatar = message.sender_avatar || null;
    const initials = senderName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    /* ── Height reporting ── */
    useEffect(() => {
        const el = bubbleRef.current;
        if (!el || !onHeightChange) return;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) onHeightChange(e.contentRect.height + 4); // +4 for margin
        });
        ro.observe(el);
        onHeightChange(el.offsetHeight + 4);
        return () => ro.disconnect();
    }, [onHeightChange]);

    /* ── Edit submit ── */
    const handleEditSubmit = async () => {
        if (!editText.trim()) return;
        try {
            const res = await chatApi.editMessage(message.id, editText);
            markMessageEdited(convId, message.id, res.data.content, res.data.edited_at);
            setEditing(false);
        } catch { alert('Edit failed'); }
    };

    /* ── Context menu ── */
    const openMenu = useCallback(e => {
        e.preventDefault(); e.stopPropagation();
        const rect = bubbleRef.current?.getBoundingClientRect();
        const x = e.clientX ?? e.touches?.[0]?.clientX ?? (rect?.left ?? 0);
        const y = e.clientY ?? e.touches?.[0]?.clientY ?? (rect?.bottom ?? 0);
        // keep menu on screen
        const menuW = 180;
        const menuH = 240;
        const clampedX = Math.min(x, window.innerWidth - menuW - 8);
        const clampedY = Math.min(y, window.innerHeight - menuH - 8);
        setMenuPosition({ x: clampedX, y: clampedY });
        setMenuVisible(true);
    }, []);

    const closeMenu = useCallback(() => setMenuVisible(false), []);

    useEffect(() => {
        if (!menuVisible) return;
        const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuVisible, closeMenu]);

    const handleTouchStart = e => { longPressRef.current = setTimeout(() => openMenu(e), 480); };
    const handleTouchEnd = () => clearTimeout(longPressRef.current);
    const handleTouchMove = () => clearTimeout(longPressRef.current);

    const triggerAction = type => { onAction?.(type, message); closeMenu(); };

    /* ── Deleted states ── */
    if (deletedEveryone) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                <span style={{
                    fontSize: 12, color: 'var(--text3)', fontStyle: 'italic',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    padding: '4px 14px', borderRadius: 20,
                }}>
                    This message was deleted
                </span>
            </div>
        );
    }
    if (deletedSelf) return null;

    /* ── Time label ── */
    const timeLabel = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    /* ── Attachment ── */
    const renderAttachment = () => {
        if (!message.file_url) return null;
        const common = { marginTop: 8, borderRadius: 12, overflow: 'hidden', maxWidth: '100%' };

        if (message.msg_type === 'IMAGE') return (
            <div style={common}>
                <img
                    src={message.thumbnail_url || message.file_url}
                    alt="attachment"
                    style={{ width: '100%', maxWidth: 260, display: 'block', cursor: 'pointer', borderRadius: 12 }}
                    onClick={() => window.open(message.file_url, '_blank')}
                />
            </div>
        );

        if (message.msg_type === 'VOICE') return (
            <div style={{ ...common, background: 'rgba(0,0,0,0.08)', padding: '8px 12px' }}>
                <audio controls src={message.file_url} style={{ width: '100%', maxWidth: 260 }} />
            </div>
        );

        if (message.msg_type === 'FILE') return (
            <a
                href={message.file_url} target="_blank" rel="noopener noreferrer"
                style={{
                    ...common, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: 'rgba(0,0,0,0.08)',
                    color: 'inherit', textDecoration: 'none', borderRadius: 12,
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {message.file_name || 'Attachment'}
                </span>
            </a>
        );
        return null;
    };

    /* ── Reply preview ── */
    const renderReplyPreview = () => {
        if (!message.reply_to_id) return null;
        return (
            <div style={{
                display: 'flex', alignItems: 'stretch', gap: 0,
                background: 'rgba(0,0,0,0.1)', borderRadius: 8,
                overflow: 'hidden', marginBottom: 8,
            }}>
                <div style={{ width: 3, background: isOwn ? 'rgba(27, 238, 238, 0.79)' : 'var(--accent)', flexShrink: 0 }} />
                <div style={{ padding: '6px 10px', fontSize: 12, opacity: 0.8, fontStyle: 'italic', lineHeight: 1.4 }}>
                    {message.reply_preview || 'Quoted message'}
                </div>
            </div>
        );
    };

    /* ── Bubble style ── */
    const bubbleStyle = isOwn ? {
        background: 'linear-gradient(135deg, var(--bubble-own-from, #027e17) 0%, var(--bubble-own-to, #5b35a7) 100%)',
        color: 'var(--bubble-own-text, #fff)',
        borderRadius: '20px 4px 20px 20px',
        boxShadow: '0 4px 18px rgba(108,99,255,0.30), 0 2px 6px rgba(0,0,0,0.15)',
        padding: '12px 16px',
        maxWidth: 320,
        position: 'relative',
    } : {
        background: 'var(--bubble-other-bg, #fff)',
        color: 'var(--bubble-other-text, #1a2040)',
        border: '1px solid var(--bubble-other-border, rgba(0,0,0,0.07))',
        borderRadius: '4px 20px 20px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        padding: '12px 16px',
        maxWidth: 320,
        position: 'relative',
    };

    /* ── Editing UI ── */
    const renderEditing = () => (
        <div>
            <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } }}
                autoFocus
                style={{
                    background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)',
                    borderRadius: 8, padding: '6px 10px', color: 'inherit',
                    fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box',
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                <button onClick={() => setEditing(false)} style={{
                    padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.15)', color: 'inherit', fontSize: 12, fontWeight: 600,
                }}>Cancel</button>
                <button onClick={handleEditSubmit} style={{
                    padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.9)', color: 'var(--accent, #10a058)', fontSize: 12, fontWeight: 700,
                }}>Save</button>
            </div>
        </div>
    );

    /* ── Main render ── */
    return (
        <>
            <div
                ref={bubbleRef}
                style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    padding: '3px 16px',
                    position: 'relative',
                }}
                onContextMenu={openMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                {/* Other-user avatar beside bubble */}
                {!isOwn && (
                    <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: senderAvatar ? 'transparent' : 'linear-gradient(135deg, var(--accent, #269b87), var(--accent2, #5d32e0))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        marginRight: 8, alignSelf: 'flex-end', marginBottom: 2,
                        boxShadow: '0 2px 8px rgba(108,99,255,0.25)',
                        overflow: 'hidden',
                    }}>
                        {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            initials
                        )}
                    </div>
                )}

                <div style={bubbleStyle}>
                    {/* Forwarded badge */}
                    {message.is_forwarded && (
                        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.65, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconForward />
                            Forwarded
                        </div>
                    )}

                    {editing ? renderEditing() : (
                        <>
                            {renderReplyPreview()}
                            {message.content && (
                                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, wordBreak: 'break-word' }}>
                                    {message.content}
                                </p>
                            )}
                            {renderAttachment()}

                            {/* Footer: time + edited + ticks */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 6 }}>
                                {message.is_edited && (
                                    <span style={{ fontSize: 11, opacity: 0.55, fontStyle: 'italic' }}>edited</span>
                                )}
                                <span style={{ fontSize: 11, opacity: 0.6 }}>{timeLabel}</span>
                                {isOwn && <StatusTick status={message.status} />}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Context menu — glass card */}
            {menuVisible && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: menuPosition.y,
                        left: menuPosition.x,
                        zIndex: 500,
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #e0e4f0)',
                        borderRadius: 16,
                        boxShadow: '0 16px 56px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
                        padding: 6,
                        minWidth: 178,
                        backdropFilter: 'blur(16px)',
                        animation: 'menuPop 0.13s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    <style>{`@keyframes menuPop { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }`}</style>

                    {isOwn && !deletedEveryone && (
                        <MenuItem icon={<IconEdit />} label="Edit" onClick={() => { setEditing(true); closeMenu(); }} />
                    )}
                    <MenuItem icon={<IconReply />} label="Reply" onClick={() => triggerAction('reply')} />
                    <MenuItem icon={<IconForward />} label="Forward" onClick={() => triggerAction('forward')} />
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
                    <MenuItem icon={<IconDelete />} label="Delete" onClick={() => triggerAction('delete')} />
                    {!isOwn && (
                        <MenuItem icon={<IconReport />} label="Report" danger onClick={() => triggerAction('report')} />
                    )}
                </div>
            )}
        </>
    );
};

export default React.memo(MessageBubble);