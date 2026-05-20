import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import toast from 'react-hot-toast';
import {
  FiZap, FiUser, FiPhone, FiHash, FiMail, FiBookOpen, FiHome,
  FiArrowRight, FiShield, FiUsers, FiCheck, FiAlertCircle,
  FiCheckCircle, FiInfo,
} from 'react-icons/fi';

const KENYAN_INSTITUTIONS = [
  'Kenyatta University',
  'University of Nairobi',
  'Jomo Kenyatta University of Agriculture and Technology',
  'Moi University',
  'Egerton University',
  'Maseno University',
  'Technical University of Kenya',
  'Strathmore University',
  'United States International University Africa',
  'Mount Kenya University',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    admission_number: '',
    full_name: '',
    email: '',
    class_name: '',
    institution: '',
  });
  const [errors, setErrors] = useState({});

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) return 'Phone number is required';
    if (!/^\+?254\d{9}$/.test(cleaned) && !/^0\d{9}$/.test(cleaned)) {
      return 'Use format: +254 700 000 000 or 0700 000 000';
    }
    return null;
  };

  const validateAdmission = (adm) => {
    if (!adm.trim()) return 'Admission number is required';
    if (adm.trim().length < 5) return 'Admission number seems too short';
    return null;
  };

  const validate = () => {
    const newErrors = {};
    newErrors.phone_number = validatePhone(formData.phone_number);
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    newErrors.admission_number = validateAdmission(formData.admission_number);
    if (!formData.class_name.trim()) newErrors.class_name = 'Class/year is required';
    if (!formData.institution.trim()) newErrors.institution = 'Institution is required';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms';
    // Remove null errors
    Object.keys(newErrors).forEach(k => { if (!newErrors[k]) delete newErrors[k]; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    // Auto-format: if starts with 07, suggest +254
    setFormData({ ...formData, phone_number: value });
    if (errors.phone_number) setErrors({ ...errors, phone_number: null });
  };

  const handleInstitutionChange = (e) => {
    setFormData({ ...formData, institution: e.target.value });
    setShowInstitutionDropdown(true);
    if (errors.institution) setErrors({ ...errors, institution: null });
  };

  const selectInstitution = (inst) => {
    setFormData({ ...formData, institution: inst });
    setShowInstitutionDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await accountsApi.signup(formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center" style={{ fontFamily: 'Outfit, sans-serif', maxWidth: 400, animation: 'signupFadeIn 0.6s ease both' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FiCheckCircle size={40} style={{ color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Account Created! 🎉</h1>
          <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
            Welcome to Academe, {formData.full_name.split(' ')[0]}! Redirecting you to login...
          </p>
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 99, animation: 'progressShrink 2.5s linear forwards' }} />
          </div>
          <style>{`@keyframes progressShrink { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');

        .signup-container {
          font-family: 'Outfit', sans-serif;
          width: 100%;
          max-width: 480px;
          animation: signupFadeIn 0.6s ease both;
        }
        @keyframes signupFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .signup-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 28px;
          padding: 40px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          max-height: 90vh; overflow-y: auto;
        }
        .dark .signup-card {
          background: rgba(17,17,34,0.85);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        .signup-logo {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.35);
        }
        .signup-title {
          font-size: 1.6rem; font-weight: 800; text-align: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 4px;
        }
        .signup-subtitle {
          text-align: center; font-size: 0.85rem; color: #9ca3af; margin-bottom: 28px;
        }

        .signup-form { display: flex; flex-direction: column; gap: 16px; }

        .signup-input-group { position: relative; }
        .signup-label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
        .dark .signup-label { color: #d1d5db; }
        .signup-input-wrapper { position: relative; }
        .signup-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; z-index: 1; }
        .signup-input {
          width: 100%; padding: 11px 16px 11px 42px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.6);
          font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s; color: #1f2937;
        }
        .dark .signup-input { background: rgba(30,30,50,0.6); border-color: rgba(255,255,255,0.08); color: #f3f4f6; }
        .signup-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .signup-input.error { border-color: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,0.1); }
        .signup-error-msg { font-size: 0.7rem; color: #ef4444; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

        .signup-inst-dropdown {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 20;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 160px; overflow-y: auto;
        }
        .dark .signup-inst-dropdown { background: #1e293b; border-color: #334155; }
        .signup-inst-item { padding: 9px 14px; cursor: pointer; font-size: 0.82rem; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
        .signup-inst-item:hover { background: rgba(99,102,241,0.06); }
        .dark .signup-inst-item { color: #f8fafc; border-color: #334155; }

        .signup-check-row { display: flex; align-items: flex-start; gap: 10px; }
        .signup-check-row input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; accent-color: #6366f1; }
        .signup-check-label { font-size: 0.8rem; color: #64748b; font-weight: 500; line-height: 1.4; }
        .dark .signup-check-label { color: #94a3b8; }
        .signup-check-label a { color: #6366f1; text-decoration: none; font-weight: 600; }

        .signup-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          transition: all 0.25s; font-family: 'Outfit', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          margin-top: 4px;
        }
        .signup-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
        .signup-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .signup-footer { text-align: center; margin-top: 20px; font-size: 0.85rem; color: #6b7280; }
        .dark .signup-footer { color: #9ca3af; }
        .signup-footer a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .signup-footer a:hover { text-decoration: underline; }

        .signup-features { display: flex; justify-content: center; gap: 16px; margin-top: 16px; font-size: 0.7rem; color: #9ca3af; }
        .signup-features span { display: flex; align-items: center; gap: 4px; }

        @media (max-width: 480px) {
          .signup-card { padding: 24px 20px; border-radius: 24px; }
        }
      `}</style>

      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-logo">
            <FiZap size={28} className="text-white" />
          </div>
          <h1 className="signup-title">Join Academe</h1>
          <p className="signup-subtitle">Create your student account in seconds</p>

          <form onSubmit={handleSubmit} className="signup-form">
            {/* Full Name */}
            <div className="signup-input-group">
              <label className="signup-label">Full Name *</label>
              <div className="signup-input-wrapper">
                <FiUser size={18} className="signup-input-icon" />
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="e.g. Alice Wanjiku" className={`signup-input ${errors.full_name ? 'error' : ''}`} required />
              </div>
              {errors.full_name && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.full_name}</span>}
            </div>

            {/* Phone Number */}
            <div className="signup-input-group">
              <label className="signup-label">Phone Number *</label>
              <div className="signup-input-wrapper">
                <FiPhone size={18} className="signup-input-icon" />
                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handlePhoneChange} placeholder="+254 700 000 000" className={`signup-input ${errors.phone_number ? 'error' : ''}`} required />
              </div>
              {errors.phone_number && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.phone_number}</span>}
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 3 }}>You'll receive an OTP for verification</p>
            </div>

            {/* Admission Number */}
            <div className="signup-input-group">
              <label className="signup-label">Admission Number *</label>
              <div className="signup-input-wrapper">
                <FiHash size={18} className="signup-input-icon" />
                <input type="text" name="admission_number" value={formData.admission_number} onChange={handleChange} placeholder="e.g. I81/1229/2020" className={`signup-input ${errors.admission_number ? 'error' : ''}`} required />
              </div>
              {errors.admission_number && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.admission_number}</span>}
            </div>

            {/* Email */}
            <div className="signup-input-group">
              <label className="signup-label">Email (optional)</label>
              <div className="signup-input-wrapper">
                <FiMail size={18} className="signup-input-icon" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="signup-input" />
              </div>
            </div>

            {/* Class */}
            <div className="signup-input-group">
              <label className="signup-label">Class / Year of Study *</label>
              <div className="signup-input-wrapper">
                <FiBookOpen size={18} className="signup-input-icon" />
                <input type="text" name="class_name" value={formData.class_name} onChange={handleChange} placeholder="e.g. 3rd year Microbiology" className={`signup-input ${errors.class_name ? 'error' : ''}`} required />
              </div>
              {errors.class_name && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.class_name}</span>}
            </div>

            {/* Institution with Autocomplete */}
            <div className="signup-input-group" style={{ position: 'relative' }}>
              <label className="signup-label">Institution *</label>
              <div className="signup-input-wrapper">
                <FiHome size={18} className="signup-input-icon" />
                <input type="text" name="institution" value={formData.institution} onChange={handleInstitutionChange} onFocus={() => setShowInstitutionDropdown(true)} onBlur={() => setTimeout(() => setShowInstitutionDropdown(false), 200)} placeholder="e.g. Kenyatta University" className={`signup-input ${errors.institution ? 'error' : ''}`} required />
              </div>
              {errors.institution && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.institution}</span>}
              {showInstitutionDropdown && formData.institution.length >= 2 && (
                <div className="signup-inst-dropdown">
                  {KENYAN_INSTITUTIONS.filter(i => i.toLowerCase().includes(formData.institution.toLowerCase())).map(inst => (
                    <div key={inst} className="signup-inst-item" onMouseDown={() => selectInstitution(inst)}>🏫 {inst}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="signup-check-row">
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => { setAgreedToTerms(e.target.checked); if (errors.terms) setErrors({ ...errors, terms: null }); }} />
              <label className="signup-check-label">
                I agree to the <Link to="/terms" onClick={(e) => e.stopPropagation()}>Terms of Service</Link> and <Link to="/privacy" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && <span className="signup-error-msg"><FiAlertCircle size={12} /> {errors.terms}</span>}

            <button type="submit" disabled={loading} className="signup-btn">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="signup-footer">
            Already have an account?{' '}
            <Link to="/login">Login here</Link>
          </p>

          <div className="signup-features">
            <span><FiShield size={10} /> Secure</span>
            <span><FiUsers size={10} /> 5,000+ Students</span>
            <span><FiCheck size={10} /> Free Forever</span>
          </div>
        </div>
      </div>
    </div>
  );
}