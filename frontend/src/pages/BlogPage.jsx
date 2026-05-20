import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogApi } from '../api/blogApi';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import { FiBookOpen, FiTrendingUp, FiStar, FiClock, FiHeart, FiBookmark, FiSearch, FiPlus, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function BlogPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadPosts();
  }, [category, sort]);

  useEffect(() => {
    loadCategories();
    loadTrending();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await blogApi.listPosts({ category, search, sort });
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await blogApi.listCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTrending = async () => {
    try {
      const data = await blogApi.getTrending();
      setTrending(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load trending:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      await blogApi.toggleLike(postId);
      loadPosts();
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async (postId) => {
    try {
      await blogApi.toggleSave(postId);
      toast.success('Post saved!');
      loadPosts();
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPosts();
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FiBookOpen className="text-pink-500" />
            Student Blog
          </h1>
          <p className="text-gray-500 text-sm mt-1">Course critiques, marketplace, tips & student stories</p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-48 md:w-64 focus:ring-2 focus:ring-pink-500 outline-none"
            />
          </form>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="latest">Latest</option>
            <option value="popular">Popular</option>
            <option value="trending">Trending</option>
          </select>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/blog/create')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 shadow-md"
            >
              <FiPlus size={16} />
              <span className="hidden sm:inline">Write Post</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Category Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                !category ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600'
              }`}
            >
              🌟 All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id || cat.slug}
                onClick={() => setCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  category === cat.slug ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <SkeletonLoader key={i} type="card" />)}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-5 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/blog/${post.slug}`)}>
                  <div className="flex gap-4">
                    {post.cover_image && (
                      <img src={post.cover_image} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.category && (
                          <span className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full">
                            {post.category.icon} {post.category.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FiClock size={10} /> {post.reading_time} min read
                        </span>
                        {post.is_featured && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded-full flex items-center gap-1">
                            <FiStar size={10} /> Featured
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg hover:text-pink-600 transition-colors">{post.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt || post.content?.substring(0, 150)}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} 
                          className={`flex items-center gap-1 text-sm ${post.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <FiHeart size={14} className={post.is_liked ? 'fill-current' : ''} /> {post.likes_count || 0}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSave(post.id); }} 
                          className={`flex items-center gap-1 text-sm ${post.is_saved ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                        >
                          <FiBookmark size={14} className={post.is_saved ? 'fill-current' : ''} /> {post.saves_count || 0}
                        </button>
                        <span className="text-xs text-gray-400">by {post.author?.full_name || 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-500 mb-2">No blog posts yet</h3>
              <p className="text-gray-400 text-sm mb-4">Check back later or create the first post!</p>
              {user?.role === 'admin' && (
                <button onClick={() => navigate('/blog/create')} className="btn-primary">
                  <FiPlus size={16} className="inline mr-1" /> Create First Post
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {user?.role === 'admin' && (
            <Card className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10">
              <FiEdit3 className="text-pink-500 mb-3" size={24} />
              <h3 className="font-semibold mb-2">Share Knowledge</h3>
              <p className="text-sm text-gray-500 mb-4">Write a blog post to help fellow students.</p>
              <button onClick={() => navigate('/blog/create')} className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium">
                Create New Post
              </button>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-red-500" /> Trending
            </h3>
            {trending.length > 0 ? (
              trending.slice(0, 5).map((post, i) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 -mx-2">
                  <span className="text-lg font-bold text-gray-300 w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-xs text-gray-400">{post.likes_count || 0} likes</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No trending posts yet</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
