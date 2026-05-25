import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { blogApi } from '../api/blogApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import ItemNotFound from '../components/shared/ItemNotFound';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiHeart, FiBookmark, FiShare2,
  FiClock, FiEye, FiUser, FiCalendar, FiTag,
  FiMessageCircle, FiSend, FiCornerDownRight, FiX,
  FiSmile, FiHome, FiBookOpen, FiChevronRight,
  FiEdit3, FiTrash2, FiArrowUp,
} from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';

/* ────────────────────────────────────────────────────── */
/*  Small Comment Component (recursive for nested replies) */
/* ────────────────────────────────────────────────────── */
function CommentItem({ comment, onReply, depth = 0 }) {
  const maxDepth = 3;
  const canReply = depth < maxDepth;

  return (
    <div className={`${depth > 0 ? 'bd-reply-thread' : ''}`}>
      <div className="bd-comment">
        <div className="bd-comment-avatar">
          {comment.user?.full_name?.charAt(0) ?? '?'}
        </div>
        <div className="bd-comment-body">
          <div className="bd-comment-header">
            <span className="bd-comment-author">{comment.user?.full_name}</span>
            <span className="bd-comment-date">
              {new Date(comment.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })}
            </span>
          </div>
          <p className="bd-comment-text">{comment.body}</p>
          {canReply && (
            <button
              className="bd-comment-reply-btn"
              onClick={() => onReply(comment.id)}
            >
              <FiCornerDownRight size={12} /> Reply
            </button>
          )}
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
/*  Main Blog Detail Page                                 */
/* ────────────────────────────────────────────────────── */
export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [commenting, setCommenting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const textareaRef = useRef(null);
  const emojiBtnRef = useRef(null);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const data = await blogApi.getPost(slug);
      if (data?.id) {
        try {
          const cmts = await blogApi.listComments(data.id);
          setComments(cmts || []);
        } catch (e) { /* ignore */ }
      }
      return data;
    },
    retry: false,
  });

  const likeMutation = useMutation({
    mutationFn: () => blogApi.toggleLike(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-post', slug] }),
  });

  const saveMutation = useMutation({
    mutationFn: () => blogApi.toggleSave(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', slug] });
      toast.success(post?.is_saved ? 'Removed from saved' : 'Post saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => blogApi.deletePost(post.id),
    onSuccess: () => {
      toast.success('Post deleted');
      navigate('/blog');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  // Reading progress & back-to-top
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setReadingProgress(progress);
      setShowBackToTop(scrollTop > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle emoji selection
  const onEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    const cursor = textareaRef.current?.selectionStart || newComment.length;
    const textBefore = newComment.substring(0, cursor);
    const textAfter = newComment.substring(cursor);
    setNewComment(textBefore + emoji + textAfter);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (emojiBtnRef.current && !emojiBtnRef.current.contains(e.target) &&
        !document.querySelector('.EmojiPickerReact')?.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const payload = { body: newComment };
      if (replyTo) payload.parent_id = replyTo;
      await blogApi.createComment(post.id, payload);
      toast.success('Comment added!');
      setNewComment('');
      setReplyTo(null);
      const cmts = await blogApi.listComments(post.id);
      setComments(cmts || []);
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this post? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  if (isLoading) return <SkeletonLoader type="page" />;
  if (isError || !post) return <ItemNotFound title="Blog Post" backTo="/blog" backLabel="Back to Blog" />;

  const authorInitial = post.author?.full_name?.charAt(0) ?? '?';
  const pubDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const isAuthor = user?.id === post.author?.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor || isAdmin;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

        .bd-root {
          font-family: 'Outfit', sans-serif;
          max-width: 760px; margin: 0 auto;
          padding: 28px 20px 80px;
          animation: bdIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes bdIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        /* Reading Progress Bar */
        .bd-progress-bar {
          position: fixed; top: 0; left: 0;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          z-index: 100; transition: width 0.1s;
        }

        /* Back to Top */
        .bd-back-top {
          position: fixed; bottom: 24px; right: 24px;
          width: 44px; height: 44px; border-radius: 50%;
          background: #6366f1; color: #fff; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          z-index: 50; box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          transition: all 0.2s; animation: bdFadeIn 0.3s ease;
        }
        .bd-back-top:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.5); }
        @keyframes bdFadeIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }

        /* Breadcrumb */
        .bd-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; font-weight: 600; color: #94a3b8;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .bd-breadcrumb a {
          color: #6366f1; text-decoration: none;
          display: flex; align-items: center; gap: 4px;
        }
        .bd-breadcrumb a:hover { text-decoration: underline; }

        /* Back button */
        .bd-back {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 10px; border: none;
          background: rgba(0,0,0,0.04); cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem; font-weight: 600;
          color: #6b7280; margin-bottom: 8px;
          transition: all 0.18s;
        }
        .bd-back:hover { background: rgba(99,102,241,0.08); color: #6366f1; }
        .dark .bd-back { background: rgba(255,255,255,0.05); color: #9ca3af; }
        .dark .bd-back:hover { background: rgba(99,102,241,0.1); color: #a5b4fc; }

        /* Cover image */
        .bd-cover {
          width: 100%; height: 320px;
          object-fit: cover; border-radius: 20px;
          margin-bottom: 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        @media (min-width: 640px) { .bd-cover { height: 400px; } }

        /* Meta row */
        .bd-meta-top {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap; margin-bottom: 16px;
        }

        .bd-category {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 13px; border-radius: 99px;
          background: rgba(99,102,241,0.1);
          color: #6366f1; font-size: 0.76rem; font-weight: 700;
          letter-spacing: 0.01em;
        }

        .bd-stat {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.75rem; color: #9ca3af; font-weight: 500;
        }
        .bd-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: #d1d5db; }

        /* Title */
        .bd-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.6rem, 4.5vw, 2.4rem);
          font-weight: 900; letter-spacing: -0.04em;
          line-height: 1.15; color: #0f172a;
          margin: 0 0 20px;
        }
        .dark .bd-title { color: #f8fafc; }

        /* Author bar */
        .bd-author-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px; border-radius: 16px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
          margin-bottom: 32px;
        }
        .dark .bd-author-bar {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
        }
        .bd-author-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; font-weight: 800; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(99,102,241,0.3);
        }
        .bd-author-name {
          font-size: 0.9rem; font-weight: 800;
          color: #1f2937; letter-spacing: -0.02em;
        }
        .dark .bd-author-name { color: #f3f4f6; }
        .bd-author-date {
          font-size: 0.73rem; color: #9ca3af;
          display: flex; align-items: center; gap: 4px; margin-top: 2px;
        }

        /* Divider */
        .bd-divider {
          height: 1px; background: rgba(0,0,0,0.07);
          margin: 28px 0;
        }
        .dark .bd-divider { background: rgba(255,255,255,0.07); }

        /* Body prose */
        .bd-content {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.05rem; line-height: 1.82;
          color: #334155; letter-spacing: 0.005em;
        }
        .dark .bd-content { color: #cbd5e1; }
        .bd-content p { margin-bottom: 1.4em; }
        .bd-content h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.35rem; font-weight: 800;
          color: #0f172a; letter-spacing: -0.03em;
          margin: 1.8em 0 0.6em;
        }
        .dark .bd-content h2 { color: #f8fafc; }
        .bd-content h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.12rem; font-weight: 700;
          color: #1e293b; margin: 1.4em 0 0.5em;
        }
        .dark .bd-content h3 { color: #e2e8f0; }
        .bd-content strong { font-weight: 700; color: #1e293b; }
        .dark .bd-content strong { color: #e2e8f0; }
        .bd-content a { color: #6366f1; text-decoration: underline; }
        .bd-content blockquote {
          border-left: 3px solid #6366f1;
          margin: 1.5em 0; padding: 0.8em 1.2em;
          background: rgba(99,102,241,0.05);
          border-radius: 0 10px 10px 0;
          font-style: italic;
          color: #64748b;
        }

        /* Actions */
        .bd-actions {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 0; flex-wrap: wrap;
        }
        .bd-action-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 12px; border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem; font-weight: 700; cursor: pointer;
          transition: all 0.18s ease; white-space: nowrap;
          text-decoration: none;
        }

        .bd-btn-like {
          background: rgba(0,0,0,0.05); color: #6b7280;
        }
        .bd-btn-like:hover { background: rgba(239,68,68,0.08); color: #ef4444; transform: scale(1.02); }
        .bd-btn-like.active { background: rgba(239,68,68,0.1); color: #ef4444; }
        .dark .bd-btn-like { background: rgba(255,255,255,0.06); color: #9ca3af; }
        .dark .bd-btn-like:hover { background: rgba(239,68,68,0.12); color: #f87171; }
        .dark .bd-btn-like.active { background: rgba(239,68,68,0.14); color: #f87171; }

        .bd-btn-save {
          background: rgba(0,0,0,0.05); color: #6b7280;
        }
        .bd-btn-save:hover { background: rgba(99,102,241,0.08); color: #6366f1; transform: scale(1.02); }
        .bd-btn-save.active { background: rgba(99,102,241,0.1); color: #6366f1; }
        .dark .bd-btn-save { background: rgba(255,255,255,0.06); color: #9ca3af; }
        .dark .bd-btn-save.active { background: rgba(99,102,241,0.14); color: #a5b4fc; }

        .bd-btn-share {
          background: rgba(0,0,0,0.05); color: #6b7280;
        }
        .bd-btn-share:hover { background: rgba(16,185,129,0.08); color: #10b981; transform: scale(1.02); }
        .dark .bd-btn-share { background: rgba(255,255,255,0.06); color: #9ca3af; }
        .dark .bd-btn-share:hover { background: rgba(16,185,129,0.1); color: #34d399; }

        .bd-btn-danger {
          background: rgba(0,0,0,0.05); color: #6b7280;
        }
        .bd-btn-danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; transform: scale(1.02); }
        .dark .bd-btn-danger { background: rgba(255,255,255,0.06); color: #9ca3af; }

        .bd-action-count {
          font-size: 0.78rem; font-weight: 800;
          min-width: 18px; text-align: center;
        }

        /* Tags */
        .bd-tags {
          display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
        }
        .bd-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 8px;
          background: rgba(0,0,0,0.05);
          font-size: 0.75rem; font-weight: 600; color: #6b7280;
          transition: all 0.15s;
        }
        .bd-tag:hover { background: rgba(99,102,241,0.08); color: #6366f1; }
        .dark .bd-tag { background: rgba(255,255,255,0.06); color: #9ca3af; }
        .dark .bd-tag:hover { background: rgba(99,102,241,0.1); color: #a5b4fc; }

        /* ── Enhanced Comments Section ── */
        .bd-comments-title {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem; font-weight: 800;
          color: #0f172a; margin: 32px 0 20px;
        }
        .dark .bd-comments-title { color: #f8fafc; }

        .bd-comment-form-wrapper {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 28px;
          backdrop-filter: blur(8px);
        }
        .dark .bd-comment-form-wrapper {
          background: rgba(17,17,34,0.5);
          border-color: rgba(255,255,255,0.06);
        }

        .bd-comment-form {
          display: flex; flex-direction: column; gap: 12px;
        }

        .bd-comment-textarea-wrap {
          position: relative;
        }

        .bd-comment-input {
          width: 100%; padding: 12px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.8);
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem; resize: vertical;
          min-height: 90px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          color: #1f2937;
        }
        .dark .bd-comment-input {
          background: rgba(30,30,50,0.8);
          border-color: rgba(255,255,255,0.08);
          color: #e2e8f0;
        }
        .bd-comment-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        .bd-comment-toolbar {
          display: flex; align-items: center; justify-content: space-between;
        }

        .bd-emoji-btn {
          display: flex; align-items: center; gap: 4px;
          background: rgba(99,102,241,0.05);
          border: none; border-radius: 8px;
          padding: 6px 12px; font-size: 0.8rem; font-weight: 600;
          color: #6366f1; cursor: pointer;
          transition: background 0.15s;
        }
        .bd-emoji-btn:hover { background: rgba(99,102,241,0.1); }

        .bd-emoji-picker-container {
          position: absolute; bottom: 50px; left: 0;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          border-radius: 16px; overflow: hidden;
        }

        .bd-comment-submit {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 22px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none;
          font-family: 'Outfit', sans-serif;
          font-weight: 700; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        .bd-comment-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.4); }
        .bd-comment-submit:disabled { opacity: 0.6; cursor: default; transform: none; }

        .bd-char-count {
          font-size: 0.75rem; color: #9ca3af;
        }

        .bd-reply-indicator {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 8px; font-size: 0.8rem; color: #6b7280;
          background: rgba(99,102,241,0.04);
          padding: 6px 12px; border-radius: 8px;
        }
        .bd-reply-indicator button {
          background: none; border: none; color: #ef4444; cursor: pointer;
          font-weight: 600; font-size: 0.8rem;
        }

        .bd-comment {
          display: flex; gap: 12px; padding: 16px 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .dark .bd-comment { border-color: rgba(255,255,255,0.04); }
        .bd-comment-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; flex-shrink: 0;
        }
        .bd-comment-body { flex: 1; }
        .bd-comment-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
        }
        .bd-comment-author {
          font-size: 0.85rem; font-weight: 700; color: #1f2937;
        }
        .dark .bd-comment-author { color: #f3f4f6; }
        .bd-comment-date {
          font-size: 0.7rem; color: #9ca3af;
        }
        .bd-comment-text {
          font-size: 0.9rem; color: #374151; line-height: 1.5;
          margin-bottom: 6px; white-space: pre-wrap;
        }
        .dark .bd-comment-text { color: #d1d5db; }
        .bd-comment-reply-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.75rem; font-weight: 600; color: #6366f1;
          background: none; border: none; cursor: pointer; padding: 2px 0;
        }
        .bd-comment-reply-btn:hover { text-decoration: underline; }

        .bd-reply-thread {
          margin-left: 28px; padding-left: 16px;
          border-left: 2px solid rgba(99,102,241,0.15);
        }
      `}</style>

      {/* Reading Progress Bar */}
      <div className="bd-progress-bar" style={{ width: `${readingProgress}%` }} />

      <div className="bd-root">
        {/* Breadcrumb */}
        <nav className="bd-breadcrumb">
          <Link to="/"><FiHome size={13} /> Home</Link>
          <FiChevronRight size={12} />
          <Link to="/blog"><FiBookOpen size={13} /> Blog</Link>
          <FiChevronRight size={12} />
          <span>{post.title?.substring(0, 40)}{post.title?.length > 40 ? '...' : ''}</span>
        </nav>

        {/* Back button */}
        <button className="bd-back" onClick={() => navigate('/blog')}>
          <FiArrowLeft size={15} /> Back to Blog
        </button>

        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} className="bd-cover" />
        )}

        {/* Top meta */}
        <div className="bd-meta-top">
          {post.category && (
            <span className="bd-category">
              {post.category.icon} {post.category.name}
            </span>
          )}
          <span className="bd-meta-dot" />
          <span className="bd-stat"><FiClock size={12} /> {post.reading_time} min read</span>
          <span className="bd-meta-dot" />
          <span className="bd-stat"><FiEye size={12} /> {post.view_count?.toLocaleString()} views</span>
        </div>

        {/* Title */}
        <h1 className="bd-title">{post.title}</h1>

        {/* Author */}
        <div className="bd-author-bar">
          <div className="bd-author-avatar">{authorInitial}</div>
          <div>
            <p className="bd-author-name">{post.author?.full_name}</p>
            {pubDate && (
              <p className="bd-author-date">
                <FiCalendar size={11} /> {pubDate}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className="bd-content"
          dangerouslySetInnerHTML={{ __html: post.content?.replace(/\n/g, '<br/>') || '' }}
        />

        <div className="bd-divider" />

        {/* Actions */}
        <div className="bd-actions">
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className={`bd-action-btn bd-btn-like ${post.is_liked ? 'active' : ''}`}
          >
            <FiHeart size={15} style={{ fill: post.is_liked ? 'currentColor' : 'none' }} />
            <span className="bd-action-count">{post.likes_count ?? 0}</span>
            Likes
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={`bd-action-btn bd-btn-save ${post.is_saved ? 'active' : ''}`}
          >
            <FiBookmark size={15} style={{ fill: post.is_saved ? 'currentColor' : 'none' }} />
            {post.is_saved ? 'Saved' : 'Save'}
          </button>

          <button onClick={handleShare} className="bd-action-btn bd-btn-share">
            <FiShare2 size={15} /> Share
          </button>

          {/* Edit/Delete for Admin/Author */}
          {canEdit && (
            <>
              <Link to={`/blog/${post.slug}/edit`} className="bd-action-btn bd-btn-save">
                <FiEdit3 size={15} /> Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bd-action-btn bd-btn-danger"
                style={{ color: '#ef4444' }}
              >
                <FiTrash2 size={15} /> {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>

        {/* Tags */}
        {post.tag_list?.length > 0 && (
          <>
            <div className="bd-divider" />
            <div className="bd-tags">
              {post.tag_list.map(tag => (
                <span key={tag} className="bd-tag">
                  <FiTag size={11} /> {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ── Enhanced Comments Section ── */}
        <h2 className="bd-comments-title">
          <FiMessageCircle size={20} /> Comments ({comments.length})
        </h2>

        <div className="bd-comment-form-wrapper">
          <form onSubmit={handleCommentSubmit} className="bd-comment-form">
            {replyTo && (
              <div className="bd-reply-indicator">
                Replying to a comment
                <button type="button" onClick={() => setReplyTo(null)}>
                  <FiX size={14} /> Cancel
                </button>
              </div>
            )}

            <div className="bd-comment-textarea-wrap">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? 'Write a reply…' : 'Join the conversation…'}
                className="bd-comment-input"
                rows={3}
                required
                maxLength={1000}
              />

              {showEmoji && (
                <div className="bd-emoji-picker-container">
                  <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                </div>
              )}
            </div>

            <div className="bd-comment-toolbar">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="bd-emoji-btn"
                  ref={emojiBtnRef}
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  <FiSmile size={16} /> Emoji
                </button>
                <span className="bd-char-count">
                  {newComment.length}/1000
                </span>
              </div>

              <button type="submit" disabled={commenting || !newComment.trim()} className="bd-comment-submit">
                <FiSend size={16} /> {commenting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments list */}
        {comments.length > 0 ? (
          <div>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={(id) => {
                  setReplyTo(id);
                  // Smooth scroll to the comment box
                  textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Auto-focus the textarea after scroll
                  setTimeout(() => textareaRef.current?.focus(), 300);
                }}
              />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: '0.9rem' }}>
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          className="bd-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
        >
          <FiArrowUp size={20} />
        </button>
      )}
    </>
  );
}