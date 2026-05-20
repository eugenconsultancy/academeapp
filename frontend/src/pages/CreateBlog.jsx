import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { blogApi } from '../api/blogApi';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiSave, FiEye, FiSend, FiX, FiPlus,
  FiHome, FiBookOpen, FiChevronRight, FiImage,
  FiClock, FiType, FiAlertCircle, FiInfo,
} from 'react-icons/fi';

export default function CreateBlog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    cover_image: '',
    category_id: '',
    tags: '',
    is_featured: false,
    is_published: false,
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: blogApi.listCategories,
  });

  // Redirect if not admin
  if (user?.role !== 'admin') {
    navigate('/blog');
    return null;
  }

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Update cover preview when URL changes
  useEffect(() => {
    if (formData.cover_image && formData.cover_image.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i)) {
      setCoverPreview(formData.cover_image);
    } else {
      setCoverPreview('');
    }
  }, [formData.cover_image]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    setHasChanges(true);
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setFormData({ ...formData, tags: newTags.join(',') });
      setHasChanges(true);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    setFormData({ ...formData, tags: newTags.join(',') });
  };

  // Calculate reading time
  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      await blogApi.createPost(formData);
      setHasChanges(false);
      toast.success('Blog post created successfully!');
      navigate('/blog');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast.error('At least a title is required to save draft');
      return;
    }
    setLoading(true);
    try {
      await blogApi.createPost({ ...formData, is_published: false });
      setHasChanges(false);
      toast.success('Draft saved!');
      navigate('/blog');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .cb-root { font-family: 'Outfit', sans-serif; max-width: 860px; margin: 0 auto; padding: 28px 20px 80px; animation: cbIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cbIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .cb-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .cb-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .cb-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .cb-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .cb-header h1 { color: #f8fafc; }

        .cb-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 28px; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
        .dark .cb-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .cb-field { margin-bottom: 20px; }
        .cb-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
        .cb-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #0f172a; outline: none; transition: all 0.15s; }
        .cb-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .dark .cb-input { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }
        .cb-textarea { resize: vertical; min-height: 250px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85rem; line-height: 1.7; }
        .cb-preview { min-height: 250px; padding: 20px; background: rgba(0,0,0,0.02); border-radius: 12px; font-size: 0.9rem; line-height: 1.8; color: #334155; white-space: pre-wrap; }
        .dark .cb-preview { background: rgba(255,255,255,0.03); color: #cbd5e1; }

        .cb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .cb-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.25); }
        .cb-btn-primary:hover { transform: translateY(-1px); }
        .cb-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .cb-btn-outline:hover { background: rgba(0,0,0,0.03); }
        .cb-btn-ghost { background: transparent; color: #6366f1; }
        .cb-btn-ghost:hover { background: rgba(99,102,241,0.06); }
        .dark .cb-btn-outline { border-color: #334155; color: #94a3b8; }

        .cb-meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; font-size: 0.8rem; color: #94a3b8; }
        .cb-meta-row span { display: flex; align-items: center; gap: 4px; }

        .cb-cover-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-top: 8px; }
        .cb-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .cb-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 99px; background: rgba(99,102,241,0.08); color: #6366f1; font-size: 0.78rem; font-weight: 600; }
        .cb-tag button { background: none; border: none; cursor: pointer; color: #6366f1; padding: 0; display: flex; }
        .cb-tag button:hover { color: #ef4444; }

        .cb-markdown-help { background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 16px; margin-top: 12px; font-size: 0.8rem; color: #64748b; }
        .dark .cb-markdown-help { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); }

        .cb-check-row { display: flex; align-items: center; gap: 8px; }
        .cb-check-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #6366f1; }
      `}</style>

      <div className="cb-root">
        {/* Breadcrumb */}
        <nav className="cb-breadcrumb">
          <Link to="/"><FiHome size={13} /> Home</Link>
          <FiChevronRight size={12} />
          <Link to="/blog"><FiBookOpen size={13} /> Blog</Link>
          <FiChevronRight size={12} />
          <span>New Post</span>
        </nav>

        {/* Header */}
        <div className="cb-header">
          <div>
            <h1>Create Blog Post</h1>
            <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
              Share knowledge with the student community
            </p>
          </div>
          <button onClick={() => setPreviewMode(!previewMode)} className="cb-btn cb-btn-outline">
            {previewMode ? <><FiEye size={15} /> Edit</> : <><FiEye size={15} /> Preview</>}
          </button>
        </div>

        {/* Meta info */}
        <div className="cb-meta-row">
          <span><FiType size={13} /> {wordCount} words</span>
          <span><FiClock size={13} /> ~{readingTime} min read</span>
          {formData.category_id && categories?.find(c => c.id === formData.category_id) && (
            <span>{categories.find(c => c.id === formData.category_id).icon} {categories.find(c => c.id === formData.category_id).name}</span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-card">
            {/* Title */}
            <div className="cb-field">
              <label className="cb-label">Post Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., How to Survive Microbiology 301" className="cb-input" style={{ fontSize: '1.1rem', fontWeight: 700 }} required />
            </div>

            {/* Category */}
            <div className="cb-field">
              <label className="cb-label">Category</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} className="cb-input">
                <option value="">Select a category</option>
                {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
            </div>

            {/* Cover Image */}
            <div className="cb-field">
              <label className="cb-label">Cover Image URL</label>
              <input type="url" name="cover_image" value={formData.cover_image} onChange={handleChange} placeholder="https://example.com/image.jpg" className="cb-input" />
              {coverPreview && <img src={coverPreview} alt="Cover preview" className="cb-cover-preview" onError={() => setCoverPreview('')} />}
            </div>

            {/* Excerpt */}
            <div className="cb-field">
              <label className="cb-label">Excerpt (short summary)</label>
              <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2} placeholder="A brief summary of your post..." className="cb-input" style={{ resize: 'none' }} />
            </div>

            {/* Content */}
            <div className="cb-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label className="cb-label" style={{ marginBottom: 0 }}>Content *</label>
                <button type="button" onClick={() => setShowMarkdownHelp(!showMarkdownHelp)} className="cb-btn cb-btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  <FiInfo size={12} /> Formatting Help
                </button>
              </div>
              {previewMode ? (
                <div className="cb-preview">{formData.content || 'Nothing to preview yet...'}</div>
              ) : (
                <textarea name="content" value={formData.content} onChange={handleChange} rows={14} placeholder="Write your post content here..." className={`cb-input cb-textarea`} required />
              )}
            </div>

            {/* Markdown Help */}
            {showMarkdownHelp && (
              <div className="cb-markdown-help">
                <p style={{ fontWeight: 700, marginBottom: 8 }}>Formatting Guide:</p>
                <p><code># Heading 1</code> — Large heading</p>
                <p><code>## Heading 2</code> — Medium heading</p>
                <p><code>**bold text**</code> — <strong>Bold</strong></p>
                <p><code>*italic text*</code> — <em>Italic</em></p>
                <p><code>- bullet point</code> — List item</p>
                <p><code>1. numbered item</code> — Numbered list</p>
                <p><code>[link text](url)</code> — Hyperlink</p>
              </div>
            )}

            {/* Tags */}
            <div className="cb-field">
              <label className="cb-label">Tags</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add a tag and press Enter" className="cb-input" style={{ flex: 1 }} />
                <button type="button" onClick={addTag} className="cb-btn cb-btn-primary"><FiPlus size={15} /></button>
              </div>
              {tags.length > 0 && (
                <div className="cb-tags">
                  {tags.map(tag => (
                    <span key={tag} className="cb-tag">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)}><FiX size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', gap: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <label className="cb-check-row">
                <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Featured post</span>
              </label>
              <label className="cb-check-row">
                <input type="checkbox" name="is_published" checked={formData.is_published} onChange={handleChange} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Publish immediately</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="button" onClick={() => navigate('/blog')} className="cb-btn cb-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSaveDraft} disabled={loading} className="cb-btn cb-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
              <FiSave size={15} /> Save Draft
            </button>
            <button type="submit" disabled={loading} className="cb-btn cb-btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
              {loading ? 'Creating...' : <><FiSend size={15} /> Publish Post</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}