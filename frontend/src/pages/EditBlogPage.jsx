import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { blogApi } from '../api/blogApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiArrowLeft, FiSave, FiSend, FiX, FiPlus,
    FiHome, FiBookOpen, FiChevronRight, FiClock, FiType, FiInfo,
} from 'react-icons/fi';

export default function EditBlogPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: '', content: '', excerpt: '', cover_image: '',
        category_id: '', tags: '', is_featured: false, is_published: false,
    });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);

    const { data: post, isLoading } = useQuery({
        queryKey: ['blog-post', slug],
        queryFn: () => blogApi.getPost(slug),
        enabled: !!slug,
    });

    const { data: categories } = useQuery({
        queryKey: ['blog-categories'],
        queryFn: blogApi.listCategories,
    });

    const updateMutation = useMutation({
        mutationFn: (data) => blogApi.updatePost(post.id, data),
        onSuccess: () => {
            toast.success('Post updated!');
            navigate(`/blog/${slug}`);
        },
        onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update'),
    });

    useEffect(() => {
        if (post) {
            setFormData({
                title: post.title || '',
                content: post.content || '',
                excerpt: post.excerpt || '',
                cover_image: post.cover_image || '',
                category_id: post.category?.id || '',
                tags: post.tags || '',
                is_featured: post.is_featured || false,
                is_published: post.is_published || false,
            });
            if (post.tag_list) setTags(post.tag_list);
        }
    }, [post]);

    if (user?.role !== 'admin' && user?.id !== post?.author?.id) {
        navigate('/blog');
        return null;
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const addTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            const newTags = [...tags, trimmed];
            setTags(newTags);
            setFormData({ ...formData, tags: newTags.join(',') });
        }
        setTagInput('');
    };

    const removeTag = (tag) => {
        const newTags = tags.filter(t => t !== tag);
        setTags(newTags);
        setFormData({ ...formData, tags: newTags.join(',') });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        setSaving(true);
        try {
            await updateMutation.mutateAsync(formData);
        } catch { /* error handled in mutation */ }
        finally { setSaving(false); }
    };

    const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    if (isLoading) return <SkeletonLoader type="page" />;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .eb-root { font-family: 'Outfit', sans-serif; max-width: 860px; margin: 0 auto; padding: 28px 20px 80px; animation: ebIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ebIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .eb-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .eb-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .eb-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 28px; backdrop-filter: blur(20px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
        .dark .eb-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }
        .eb-field { margin-bottom: 20px; }
        .eb-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
        .eb-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #0f172a; outline: none; }
        .eb-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .dark .eb-input { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }
        .eb-textarea { resize: vertical; min-height: 250px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.7; }
        .eb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .eb-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.25); }
        .eb-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .eb-meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; font-size: 0.8rem; color: #94a3b8; }
        .eb-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .eb-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 99px; background: rgba(99,102,241,0.08); color: #6366f1; font-size: 0.78rem; font-weight: 600; }
        .eb-tag button { background: none; border: none; cursor: pointer; color: #6366f1; padding: 0; display: flex; }
        .eb-check-row { display: flex; align-items: center; gap: 8px; }
        .eb-check-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #6366f1; }
      `}</style>

            <div className="eb-root">
                <nav className="eb-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/blog"><FiBookOpen size={13} /> Blog</Link>
                    <FiChevronRight size={12} />
                    <Link to={`/blog/${slug}`}>{post?.title?.substring(0, 30)}</Link>
                    <FiChevronRight size={12} />
                    <span>Edit</span>
                </nav>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Edit Blog Post</h1>
                    <Link to={`/blog/${slug}`} className="eb-btn eb-btn-outline"><FiArrowLeft size={14} /> View Post</Link>
                </div>

                <div className="eb-meta-row">
                    <span><FiType size={13} /> {wordCount} words</span>
                    <span><FiClock size={13} /> ~{readingTime} min read</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="eb-card">
                        <div className="eb-field">
                            <label className="eb-label">Title *</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} className="eb-input" style={{ fontSize: '1.1rem', fontWeight: 700 }} required />
                        </div>
                        <div className="eb-field">
                            <label className="eb-label">Category</label>
                            <select name="category_id" value={formData.category_id} onChange={handleChange} className="eb-input">
                                <option value="">Select category</option>
                                {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                            </select>
                        </div>
                        <div className="eb-field">
                            <label className="eb-label">Excerpt</label>
                            <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2} className="eb-input" style={{ resize: 'none' }} />
                        </div>
                        <div className="eb-field">
                            <label className="eb-label">Content *</label>
                            <textarea name="content" value={formData.content} onChange={handleChange} rows={14} className={`eb-input eb-textarea`} required />
                        </div>
                        <div className="eb-field">
                            <label className="eb-label">Tags</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add tag and press Enter" className="eb-input" style={{ flex: 1 }} />
                                <button type="button" onClick={addTag} className="eb-btn eb-btn-primary"><FiPlus size={15} /></button>
                            </div>
                            {tags.length > 0 && (
                                <div className="eb-tags">{tags.map(tag => (<span key={tag} className="eb-tag">#{tag}<button type="button" onClick={() => removeTag(tag)}><FiX size={12} /></button></span>))}</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <label className="eb-check-row"><input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} /><span style={{ fontSize: '0.85rem', color: '#64748b' }}>Featured</span></label>
                            <label className="eb-check-row"><input type="checkbox" name="is_published" checked={formData.is_published} onChange={handleChange} /><span style={{ fontSize: '0.85rem', color: '#64748b' }}>Published</span></label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Link to={`/blog/${slug}`} className="eb-btn eb-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</Link>
                        <button type="submit" disabled={saving} className="eb-btn eb-btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                            {saving ? 'Saving...' : <><FiSave size={15} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}