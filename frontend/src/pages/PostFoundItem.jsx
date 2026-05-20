import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { foundItemsApi } from '../api/foundItemsApi';
import GeoService from '../api/geoService';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiHome, FiPackage, FiChevronRight,
  FiUpload, FiCamera, FiX, FiImage, FiInfo,
  FiMapPin, FiPhone, FiUser, FiShield, FiDollarSign,
  FiAlertCircle, FiCheckCircle,
} from 'react-icons/fi';

const categories = [
  { value: 'id', label: '🪪 Student ID Card', icon: '🪪' },
  { value: 'bank_card', label: '💳 Bank/ATM Card', icon: '💳' },
  { value: 'keys', label: '🔑 Keys', icon: '🔑' },
  { value: 'document', label: '📄 Document/Transcript', icon: '📄' },
  { value: 'gadget', label: '📱 Phone/Gadget', icon: '📱' },
  { value: 'other', label: '📦 Other Item', icon: '📦' },
];

const INITIAL_FORM = {
  title: '',
  category: 'id',
  description: '',
  location_found: '',
  found_date: new Date().toISOString().split('T')[0],
  is_fee_required: false,
  security_question: '',
  security_answer: '',
  admission_number_on_item: '',
  finder_name: '',
  finder_phone: '',
  image: null,
};

export default function PostFoundItem() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [imagePreview, setImagePreview] = useState(null);
  const [venueSuggestions, setVenueSuggestions] = useState([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Warn before leaving with unsaved changes
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setHasChanges(true);
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setFormData({ ...formData, image: file });
    setHasChanges(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Venue autocomplete
  const handleLocationChange = async (value) => {
    setFormData({ ...formData, location_found: value });
    if (value.length >= 2) {
      try {
        const res = await GeoService.listVenues({ search: value, limit: 5 });
        setVenueSuggestions(res?.data || res || []);
        setShowVenueDropdown(true);
      } catch {
        setVenueSuggestions([]);
      }
    } else {
      setShowVenueDropdown(false);
    }
  };

  const selectVenue = (venue) => {
    setFormData({ ...formData, location_found: venue.name });
    setShowVenueDropdown(false);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.location_found.trim()) newErrors.location_found = 'Location is required';
    if (formData.title.length > 255) newErrors.title = 'Title must be under 255 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location_found: formData.location_found.trim(),
        found_date: new Date(formData.found_date).toISOString(),
        is_fee_required: formData.is_fee_required,
        security_question: formData.security_question.trim(),
        security_answer: formData.security_answer.trim(),
        admission_number_on_item: formData.admission_number_on_item.trim(),
      };

      await foundItemsApi.createItem(payload);
      toast.success('Item posted successfully! It will be reviewed and published.');
      setHasChanges(false);
      navigate('/found-items');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Failed to post item. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .pfi-root { font-family: 'Outfit', sans-serif; max-width: 680px; margin: 0 auto; padding: 28px 20px 80px; animation: pfiIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes pfiIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .pfi-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .pfi-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .pfi-breadcrumb a:hover { text-decoration: underline; }

        .pfi-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 28px; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
        .dark .pfi-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .pfi-title { font-size: clamp(1.3rem, 3vw, 1.6rem); font-weight: 900; color: #0f172a; margin-bottom: 6px; letter-spacing: -0.03em; }
        .dark .pfi-title { color: #f8fafc; }
        .pfi-subtitle { font-size: 0.85rem; color: #94a3b8; margin-bottom: 24px; }

        .pfi-form { display: flex; flex-direction: column; gap: 16px; }
        .pfi-field label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
        .pfi-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #0f172a; outline: none; transition: all 0.15s; }
        .pfi-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .pfi-input.error { border-color: #ef4444; }
        .dark .pfi-input { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }
        .pfi-textarea { resize: vertical; min-height: 80px; }
        .pfi-error { font-size: 0.7rem; color: #ef4444; margin-top: 4px; font-weight: 500; }

        .pfi-venue-wrap { position: relative; }
        .pfi-venue-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 20; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 180px; overflow-y: auto; }
        .dark .pfi-venue-dropdown { background: #1e293b; border-color: #334155; }
        .pfi-venue-item { padding: 10px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 500; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
        .pfi-venue-item:hover { background: rgba(99,102,241,0.06); }
        .dark .pfi-venue-item { color: #f8fafc; border-color: #334155; }

        /* Image upload */
        .pfi-image-upload { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .pfi-image-upload:hover { border-color: #6366f1; background: rgba(99,102,241,0.02); }
        .dark .pfi-image-upload { border-color: #334155; }
        .pfi-image-preview { position: relative; display: inline-block; }
        .pfi-image-preview img { max-width: 100%; max-height: 300px; border-radius: 12px; }
        .pfi-image-remove { position: absolute; top: -8px; right: -8px; width: 28px; height: 28px; border-radius: 50%; background: #ef4444; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }

        /* Checkbox row */
        .pfi-check-row { display: flex; align-items: flex-start; gap: 10px; }
        .pfi-check-row input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; accent-color: #6366f1; }
        .pfi-check-label { font-size: 0.82rem; color: #64748b; font-weight: 500; }
        .dark .pfi-check-label { color: #94a3b8; }

        /* Info box */
        .pfi-info-box { display: flex; align-items: flex-start; gap: 10px; padding: 14px; border-radius: 12px; background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.12); font-size: 0.78rem; color: #0891b2; margin-bottom: 16px; }
        .dark .pfi-info-box { background: rgba(6,182,212,0.1); }

        .pfi-buttons { display: flex; gap: 10px; padding-top: 8px; }
        .pfi-btn { flex: 1; padding: 14px; border-radius: 14px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .pfi-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 6px 20px rgba(99,102,241,0.28); }
        .pfi-btn-primary:hover { transform: translateY(-1px); }
        .pfi-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pfi-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .pfi-btn-outline:hover { background: rgba(0,0,0,0.03); }
        .dark .pfi-btn-outline { border-color: #334155; color: #94a3b8; }
      `}</style>

      <div className="pfi-root">
        {/* Breadcrumb */}
        <nav className="pfi-breadcrumb">
          <Link to="/"><FiHome size={13} /> Home</Link>
          <FiChevronRight size={12} />
          <Link to="/found-items"><FiPackage size={13} /> Found Items</Link>
          <FiChevronRight size={12} />
          <span>Post Item</span>
        </nav>

        <div className="pfi-card">
          <h1 className="pfi-title">Post Found Item</h1>
          <p className="pfi-subtitle">Found something on campus? Post it here to help it find its owner.</p>

          {/* Privacy Notice */}
          <div className="pfi-info-box">
            <FiShield size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Photos are automatically blurred to protect privacy. Sensitive info (admission numbers) is only visible to admins.</span>
          </div>

          <form onSubmit={handleSubmit} className="pfi-form">
            {/* Image Upload */}
            <div className="pfi-field">
              <label>Photo of Item (Optional)</label>
              {imagePreview ? (
                <div className="pfi-image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button type="button" className="pfi-image-remove" onClick={removeImage}>✕</button>
                </div>
              ) : (
                <div className="pfi-image-upload" onClick={() => fileInputRef.current?.click()}>
                  <FiCamera size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>Click to upload photo</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 4 }}>JPG, PNG up to 10MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Title */}
            <div className="pfi-field">
              <label>Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Blue Student ID Card - John M." className={`pfi-input ${errors.title ? 'error' : ''}`} maxLength={255} />
              {errors.title && <p className="pfi-error">{errors.title}</p>}
            </div>

            {/* Category */}
            <div className="pfi-field">
              <label>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} className="pfi-input">
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>

            {/* Admission Number on Item (for IDs) */}
            {(formData.category === 'id' || formData.category === 'bank_card') && (
              <div className="pfi-field">
                <label>Admission Number on Item</label>
                <input type="text" name="admission_number_on_item" value={formData.admission_number_on_item} onChange={handleChange} placeholder="e.g., I81/1001/2020 (visible on the ID)" className="pfi-input" />
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                  This helps verify the rightful owner. Only admins can see this.
                </p>
              </div>
            )}

            {/* Description */}
            <div className="pfi-field">
              <label>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Any distinguishing features, color, brand..." className="pfi-input pfi-textarea" />
            </div>

            {/* Location Found */}
            <div className="pfi-field pfi-venue-wrap">
              <label>Location Found *</label>
              <input type="text" name="location_found" value={formData.location_found} onChange={e => handleLocationChange(e.target.value)} onFocus={() => venueSuggestions.length > 0 && setShowVenueDropdown(true)} onBlur={() => setTimeout(() => setShowVenueDropdown(false), 200)} placeholder="e.g., Library, 2nd Floor" className={`pfi-input ${errors.location_found ? 'error' : ''}`} />
              {errors.location_found && <p className="pfi-error">{errors.location_found}</p>}
              {showVenueDropdown && venueSuggestions.length > 0 && (
                <div className="pfi-venue-dropdown">
                  {venueSuggestions.map(v => (
                    <div key={v.id} className="pfi-venue-item" onMouseDown={() => selectVenue(v)}>🏫 {v.name}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Found */}
            <div className="pfi-field">
              <label>Date Found</label>
              <input type="date" name="found_date" value={formData.found_date} onChange={handleChange} className="pfi-input" />
            </div>

            {/* Finder Info */}
            <div className="pfi-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiUser size={12} /> Your Name (Optional)
              </label>
              <input type="text" name="finder_name" value={formData.finder_name} onChange={handleChange} placeholder="Your name for the locator record" className="pfi-input" />
            </div>

            <div className="pfi-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiPhone size={12} /> M-Pesa Number (for recovery fee)
              </label>
              <input type="tel" name="finder_phone" value={formData.finder_phone} onChange={handleChange} placeholder="+254712345678" className="pfi-input" />
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                If a recovery fee applies, you'll receive KES 30 when the owner claims the item.
              </p>
            </div>

            {/* Fee Toggle */}
            <div className="pfi-check-row">
              <input type="checkbox" name="is_fee_required" checked={formData.is_fee_required} onChange={handleChange} />
              <label className="pfi-check-label">
                <strong>Recovery Fee Required (KES 100)</strong> — For IDs, bank cards, and valuable items. Finder receives KES 30.
              </label>
            </div>

            {/* Security Question */}
            <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: 12 }}>
                🔐 Security Verification (Optional)
              </p>
              <div className="pfi-field">
                <label>Security Question</label>
                <input type="text" name="security_question" value={formData.security_question} onChange={handleChange} placeholder="e.g., What sticker is on the back of the ID?" className="pfi-input" />
              </div>
              <div className="pfi-field">
                <label>Security Answer</label>
                <input type="text" name="security_answer" value={formData.security_answer} onChange={handleChange} placeholder="Answer only the owner would know" className="pfi-input" />
              </div>
            </div>

            {/* Buttons */}
            <div className="pfi-buttons">
              <button type="button" onClick={() => navigate('/found-items')} className="pfi-btn pfi-btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="pfi-btn pfi-btn-primary">
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Posting...
                  </span>
                ) : '📦 Post Found Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}