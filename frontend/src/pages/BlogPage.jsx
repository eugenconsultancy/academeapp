import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogApi } from '../api/blogApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
  FiBookOpen, FiTrendingUp, FiStar, FiClock, FiHeart,
  FiBookmark, FiSearch, FiPlus, FiEdit3, FiEye,
  FiShare2, FiUser, FiArrowRight, FiChevronRight,
  FiCalendar, FiRefreshCw, FiAlertCircle,
  FiFileText, FiFlag,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

/* ─────────── MOCK DATA (DEV ONLY) ─────────── */
const MOCK_POSTS = [
  {
    id: '1', title: 'How to Ace Your Final Exams: A Complete Guide',
    slug: 'ace-final-exams', excerpt: 'Discover proven study techniques...',
    reading_time: 8, likes_count: 156, saves_count: 42, view_count: 1200,
    flags_count: 2, is_flagged: false, is_liked: false, is_saved: false,
    is_featured: true, created_at: new Date(Date.now() - 86400000).toISOString(),
    author: { full_name: 'Jane Muthoni' },
    category: { name: 'Academics', icon: '📚', slug: 'academics' },
    cover_image: null,
  },
  {
    id: '2', title: 'Best Cafeterias on Campus: A Food Guide',
    slug: 'campus-food-guide', excerpt: 'Where to find the best chapati...',
    reading_time: 5, likes_count: 89, saves_count: 23, view_count: 890,
    flags_count: 1, is_flagged: true, is_liked: true, is_saved: false,
    is_featured: false, created_at: new Date(Date.now() - 172800000).toISOString(),
    author: { full_name: 'Kevin Odhiambo' },
    category: { name: 'Campus Life', icon: '🏫', slug: 'campus-life' },
    cover_image: null,
  },
  {
    id: '3', title: 'Making Money as a Student: Side Hustles That Work',
    slug: 'student-side-hustles', excerpt: 'Legit ways to earn extra cash...',
    reading_time: 6, likes_count: 234, saves_count: 67, view_count: 2100,
    flags_count: 0, is_flagged: false, is_liked: false, is_saved: true,
    is_featured: true, created_at: new Date(Date.now() - 259200000).toISOString(),
    author: { full_name: 'Grace Akinyi' },
    category: { name: 'Finance', icon: '💰', slug: 'finance' },
    cover_image: null,
  },
];

const MOCK_CATEGORIES = [
  { name: 'Academics', icon: '📚', slug: 'academics', post_count: 45 },
  { name: 'Campus Life', icon: '🏫', slug: 'campus-life', post_count: 32 },
  { name: 'Technology', icon: '💻', slug: 'tech', post_count: 28 },
  { name: 'Finance', icon: '💰', slug: 'finance', post_count: 15 },
  { name: 'Health', icon: '💪', slug: 'health', post_count: 12 },
];

export default function BlogPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // ═══════════════ Load data ═══════════════
  useEffect(() => {
    setPage(1);
    setPosts([]);
    loadPosts(1, true);
  }, [category, sort, search]);

  useEffect(() => {
    loadCategories();
    loadTrending();
  }, []);

  const loadPosts = async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await blogApi.listPosts({
        category,
        search: search || undefined,
        sort,
        page: pageNum,
        limit: 10,
      });
      const results = Array.isArray(data) ? data : data?.results || data?.data || [];
      const total = data?.count || data?.total || results.length;
      if (reset) setPosts(results);
      else setPosts(prev => [...prev, ...results]);
      setTotalPosts(total);
      setHasMore(results.length === 10);
    } catch (err) {
      console.warn('Failed to load posts, using mock data:', err);
      if (import.meta.env.DEV) {
        const filtered = MOCK_POSTS.filter(p => !category || p.category?.slug === category);
        if (reset) setPosts(filtered);
        else setPosts(prev => [...prev, ...filtered]);
        setTotalPosts(MOCK_POSTS.length);
        setHasMore(false);
      } else {
        setError('Failed to load blog posts. Please try again.');
        if (reset) setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await blogApi.listCategories();
      setCategories(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.warn('Failed to load categories, using mock data:', error);
      if (import.meta.env.DEV) setCategories(MOCK_CATEGORIES);
    }
  };

  const loadTrending = async () => {
    try {
      const data = await blogApi.getTrending();
      setTrending(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (error) {
      console.error('Failed to load trending:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadPosts(1, true);
    loadTrending();
    toast.success('Refreshed!');
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, false);
  };

  // ═══════════════ Interactions ═══════════════
  const handleLike = async (e, postId) => {
    e.stopPropagation();
    try {
      await blogApi.toggleLike(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1 } : p));
    } catch (error) {
      toast.error('Failed to like post');
      loadPosts(page, true);
    }
  };

  const handleSave = async (e, postId) => {
    e.stopPropagation();
    try {
      await blogApi.toggleSave(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: !p.is_saved, saves_count: p.is_saved ? (p.saves_count || 1) - 1 : (p.saves_count || 0) + 1 } : p));
      toast.success(posts.find(p => p.id === postId)?.is_saved ? 'Post unsaved' : 'Post saved!');
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const handleShare = async (e, post) => {
    e.stopPropagation();
    const url = `${window.location.origin}/blog/${post.slug}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, text: `Check out "${post.title}" on Academe Blog!`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  // ═══════════════ FLAG HANDLER ═══════════════
  const handleFlag = async (e, postId) => {
    e.stopPropagation();
    try {
      const response = await blogApi.flagPost(postId);
      const { flagged, flags_count } = response;
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        is_flagged: flagged,
        flags_count: flags_count,
      } : p));
      toast.success(flagged ? 'Post flagged' : 'Flag removed');
      if (flags_count >= 10) {
        loadPosts(1, true);  // remove the post after threshold
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to flag post');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadPosts(1, true);
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch { return dateStr; }
  };

  // ═══════════════ Glass style (reactive) ═══════════════
  const glassStyle = {
    background: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    borderWidth: '1px',
    borderStyle: 'solid',
  };

  // ═══════════════ RENDER ═══════════════
  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 relative overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[30rem] h-[30rem] bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-[150px] pointer-events-none" />

      <style>{`
        @keyframes blogFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .blog-animate-in {
            animation: blogFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .blog-card-arrow {
            opacity: 0;
            transform: translateX(-8px);
            transition: all 0.3s ease;
        }
        .group:hover .blog-card-arrow {
            opacity: 1;
            transform: translateX(0);
        }
        .blog-sidebar {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.3s ease,
                      width 0.3s ease;
        }
        @media (min-width: 1024px) {
          .blog-main-grid {
            transition: grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
        @media (max-width: 1023px) {
          .blog-sidebar {
            position: relative;
            width: 100%;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 relative z-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-6 blog-animate-in">
          <Link to="/" className="hover:text-pink-500 dark:hover:text-pink-400 transition-colors flex items-center gap-1">
            <FiBookOpen size={13} /> Home
          </Link>
          <FiChevronRight size={12} />
          <span className="text-gray-700 dark:text-slate-200 font-medium">Blog</span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-6 md:p-10 mb-8 text-white shadow-xl blog-animate-in" style={{ animationDelay: '0.05s' }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-yellow-300 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgb(207, 250, 244) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4 border border-white/20">
                <FiBookOpen size={14} /> Student Blog
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{totalPosts} posts</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-3">
                Share Knowledge, <span className="text-yellow-200">Grow Together</span>
              </h1>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed">
                Course critiques, marketplace tips, student stories, and campus life experiences — all written by students, for students.
              </p>
            </div>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/blog/create')}
                className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-pink-600 rounded-xl font-bold text-sm hover:bg-pink-50 transition-all hover:scale-105 shadow-lg">
                <FiPlus size={18} /> Write New Post
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 blog-animate-in" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts by title or content..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500" />
          </form>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-gray-800 dark:text-white text-sm font-medium cursor-pointer focus:border-pink-500 outline-none">
            <option value="latest">📅 Latest</option>
            <option value="popular">🔥 Popular</option>
            <option value="trending">📈 Trending</option>
          </select>
          <button onClick={handleRefresh} disabled={refreshing}
            className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-500 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 hover:border-pink-300 dark:hover:border-pink-500/30 transition-all disabled:opacity-50" title="Refresh">
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 flex-wrap blog-animate-in" style={{ animationDelay: '0.15s' }}>
          <button onClick={() => setCategory('')}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${!category
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 scale-105 border-transparent'
              : 'bg-white dark:bg-white/[0.03] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.08]'}`}>
            🌟 All Posts
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${!category ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-300'}`}>{totalPosts}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat.id || cat.slug} onClick={() => setCategory(cat.slug)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${category === cat.slug
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 scale-105 border-transparent'
                : 'bg-white dark:bg-white/[0.03] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.08]'}`}>
              {cat.icon && <span className="mr-1.5">{cat.icon}</span>}{cat.name}
              {cat.post_count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${category === cat.slug ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-300'}`}>{cat.post_count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="blog-main-grid grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Posts Column */}
          <div className="lg:col-span-2 min-w-0">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 backdrop-blur-md rounded-2xl flex items-center gap-3 blog-animate-in">
                <FiAlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={20} />
                <p className="text-sm text-red-600 dark:text-red-300 flex-1">{error}</p>
                <button onClick={handleRefresh} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline">Retry</button>
              </div>
            )}

            {loading && posts.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl p-5 blog-animate-in" style={{ animationDelay: `${i * 0.08}s`, ...glassStyle }}>
                    <div className="flex gap-4">
                      <div className="w-28 h-28 bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse flex-shrink-0 hidden sm:block" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-1/4 animate-pulse" />
                        <div className="h-6 bg-gray-200 dark:bg-white/5 rounded-full w-3/4 animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-1/2 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <div key={post.id}
                    className="group cursor-pointer overflow-hidden blog-animate-in shadow-sm hover:shadow-xl hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 rounded-2xl"
                    style={{ animationDelay: `${i * 0.06}s`, ...glassStyle }}
                    onClick={() => navigate(`/blog/${post.slug}`)}>
                    <div className="flex flex-col sm:flex-row gap-0 sm:gap-5">
                      {post.cover_image && (
                        <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        </div>
                      )}
                      <div className="flex-1 p-5 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {post.category && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-300 rounded-full font-medium">
                              {post.category.icon} {post.category.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1"><FiClock size={10} /> {post.reading_time || 5} min read</span>
                          {post.is_featured && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 rounded-full font-medium">
                              <FiStar size={10} /> Featured
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-4">{post.excerpt || post.content?.substring(0, 150)}</p>

                        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-4">
                            <button onClick={(e) => handleLike(e, post.id)}
                              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.is_liked ? 'text-red-500' : 'text-gray-400 dark:text-slate-400 hover:text-red-500'}`}>
                              <FiHeart size={16} className={`transition-transform ${post.is_liked ? 'fill-current scale-110' : ''}`} />
                              <span>{post.likes_count || 0}</span>
                            </button>
                            <button onClick={(e) => handleSave(e, post.id)}
                              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.is_saved ? 'text-pink-500' : 'text-gray-400 dark:text-slate-400 hover:text-pink-500'}`}>
                              <FiBookmark size={16} className={post.is_saved ? 'fill-current' : ''} />
                              <span>{post.saves_count || 0}</span>
                            </button>
                            <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-slate-400"><FiEye size={16} /><span>{post.view_count || 0}</span></span>
                            <button onClick={(e) => handleShare(e, post)} className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-slate-400 hover:text-pink-500 transition-colors">
                              <FiShare2 size={16} />
                            </button>
                            {/* ═══ FLAG BUTTON (hidden for own posts) ═══ */}
                            {user?.id !== post.author?.id && (
                              <button onClick={(e) => handleFlag(e, post.id)}
                                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.is_flagged ? 'text-orange-500' : 'text-gray-400 dark:text-slate-400 hover:text-orange-500'}`}>
                                <FiFlag size={16} className={post.is_flagged ? 'fill-current' : ''} />
                                <span>{post.flags_count || 0}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-pink-500/20">
                                {post.author?.full_name?.charAt(0) || 'A'}
                              </div>
                              <span className="text-xs text-gray-600 dark:text-slate-300">{post.author?.full_name || 'Anonymous'}</span>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-slate-400 flex items-center gap-1"><FiCalendar size={11} />{getRelativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center pr-5">
                        <FiArrowRight className="blog-card-arrow text-pink-500 dark:text-pink-400" size={20} />
                      </div>
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button onClick={loadMore} disabled={loading}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-105 transition-all border border-white/10">
                      {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Loading...
                        </span>
                      ) : 'Load More Posts'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 rounded-3xl blog-animate-in" style={glassStyle}>
                <div className="w-24 h-24 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-pink-500/20">
                  <FiBookOpen className="w-10 h-10 text-pink-500 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200 mb-2">{search ? 'No posts match your search' : 'No blog posts yet'}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">{search ? 'Try adjusting your search terms or browse by category.' : 'Be the first to share your knowledge with the community!'}</p>
                {user?.role === 'admin' && (
                  <button onClick={() => navigate('/blog/create')} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25 border border-white/10">
                    <FiPlus size={18} /> Create First Post
                  </button>
                )}
                {search && (
                  <button onClick={() => { setSearch(''); setCategory(''); }} className="ml-3 inline-flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="blog-sidebar space-y-6 lg:sticky lg:top-24 lg:self-start">
            {user?.role === 'admin' && (
              <div className="p-6 rounded-3xl shadow-xl blog-animate-in" style={{
                animationDelay: '0.2s',
                ...glassStyle,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(244,63,94,0.06), rgba(30,41,59,0.45))'
                  : 'linear-gradient(135deg, rgba(244,63,94,0.04), rgba(255,255,255,0.65))'
              }}>
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-pink-500/25 border border-white/10">
                  <FiEdit3 className="text-white" size={22} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Share Your Knowledge</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Write a blog post to help fellow students with course tips, marketplace guides, or campus stories.</p>
                <button onClick={() => navigate('/blog/create')} className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25 hover:scale-105 border border-white/10">
                  Create New Post
                </button>
              </div>
            )}

            <div className="p-6 rounded-3xl shadow-xl blog-animate-in" style={{ animationDelay: '0.25s', ...glassStyle }}>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center"><FiTrendingUp className="text-red-500 dark:text-red-400" size={16} /></span>
                Trending Posts
              </h3>
              {trending.length > 0 ? (
                <div className="space-y-1">
                  {trending.map((post, i) => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/5 transition-all group -mx-3">
                      <span className={`text-lg font-black w-8 text-center flex-shrink-0 ${i === 0 ? 'text-amber-500 dark:text-amber-400' : i === 1 ? 'text-gray-400 dark:text-slate-400' : i === 2 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-300 dark:text-slate-600'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{post.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 dark:text-slate-400 flex items-center gap-1"><FiHeart size={10} /> {post.likes_count || 0}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-400 flex items-center gap-1"><FiEye size={10} /> {post.view_count || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-6">No trending posts yet</p>
              )}
            </div>

            <div className="p-6 rounded-3xl shadow-xl blog-animate-in" style={{ animationDelay: '0.3s', ...glassStyle }}>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/blog/create" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-300 transition-all"><FiEdit3 size={16} className="text-pink-500 dark:text-pink-400" />Write a Post</Link>
                <Link to="/blog/my-posts" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-300 transition-all"><FiFileText size={16} className="text-pink-500 dark:text-pink-400" />My Posts & Drafts</Link>
                <Link to="/announcements" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-300 transition-all"><FiBookOpen size={16} className="text-purple-500 dark:text-purple-400" />Announcements</Link>
                <Link to="/opportunities" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-300 transition-all"><FiStar size={16} className="text-amber-500 dark:text-amber-400" />Opportunities</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}