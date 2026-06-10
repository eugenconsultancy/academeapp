import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import toast from 'react-hot-toast';
import {
  FiZap, FiUser, FiPhone, FiHash, FiMail, FiBookOpen, FiHome,
  FiArrowRight, FiArrowLeft, FiShield, FiUsers, FiCheck, FiAlertCircle,
  FiCheckCircle, FiLock, FiStar, FiTrendingUp,
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

const BENEFITS = [
  { icon: '📢', text: 'Instant campus announcements' },
  { icon: '📚', text: 'Course notes & resources' },
  { icon: '🎯', text: 'Internships & scholarships' },
  { icon: '👥', text: 'Connect with classmates' },
];

// ------------------------------------------------------------
// Step Progress Bar
// ------------------------------------------------------------
function StepBar({ step }) {
  const steps = ['Personal', 'Academic', 'Confirm'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem' }}>
      {steps.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s ease',
                boxShadow: (done || active) ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                flexShrink: 0,
              }}>
                {done
                  ? <FiCheckCircle size={14} color="#fff" />
                  : <span style={{ fontSize: '0.7rem', fontWeight: 700, color: active ? '#fff' : '#9ca3af' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: (done || active) ? '#6366f1' : '#9ca3af', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '-10px 6px 0',
                background: done ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#e5e7eb',
                borderRadius: 99, transition: 'background 0.35s ease',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Field component
// ------------------------------------------------------------
function Field({ label, error, helper, icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            size={16}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
          />
        )}
        {children}
      </div>
      {error && (
        <span style={{ fontSize: '0.68rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
          <FiAlertCircle size={11} /> {error}
        </span>
      )}
      {helper && !error && (
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{helper}</span>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Main Signup Page
// ------------------------------------------------------------
export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(0); // 0 = Personal, 1 = Academic, 2 = Confirm
  const [showInstDropdown, setShowInstDropdown] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '', admission_number: '', full_name: '',
    email: '', class_name: '', institution: '',
  });
  const [errors, setErrors] = useState({});

  const firstName = formData.full_name.trim().split(' ')[0] || '';

  const inputStyle = (hasErr) => ({
    width: '100%',
    padding: '10px 14px 10px 38px',
    borderRadius: 12,
    border: `1.5px solid ${hasErr ? '#ef4444' : '#e5e7eb'}`,
    background: hasErr ? 'rgba(239,68,68,0.04)' : '#f9fafb',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: '#1f2937',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: hasErr ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
  });

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!formData.full_name.trim()) errs.full_name = 'Full name is required';
      const ph = formData.phone_number.replace(/\s/g, '');
      if (!ph) errs.phone_number = 'Phone number is required';
      else if (!/^\+?254\d{9}$/.test(ph) && !/^0\d{9}$/.test(ph)) errs.phone_number = 'Use format: +254 700 000 000';
    }
    if (s === 1) {
      if (!formData.institution.trim()) errs.institution = 'Institution is required';
      if (!formData.admission_number.trim() || formData.admission_number.trim().length < 5) errs.admission_number = 'Valid admission number required';
      if (!formData.class_name.trim()) errs.class_name = 'Class / year is required';
    }
    if (s === 2) {
      if (!agreedToTerms) errs.terms = 'You must agree to the terms';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep(s => s + 1);
  };

  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    try {
      await accountsApi.signup(formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2800);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = KENYAN_INSTITUTIONS.filter(i =>
    i.toLowerCase().includes(formData.institution.toLowerCase())
  );

  // ------------------------------------------------------------
  // Success State
  // ------------------------------------------------------------
  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%)',
        fontFamily: 'Outfit, sans-serif', padding: '1.5rem',
      }}>
        <style>{`
          @keyframes sp-popIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
          @keyframes sp-progress { from { width:100%; } to { width:0%; } }
        `}</style>
        <div style={{ textAlign: 'center', maxWidth: 380, animation: 'sp-popIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid rgba(16,185,129,0.2)',
          }}>
            <FiCheckCircle size={44} style={{ color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.03em' }}>
            You're in{firstName ? `, ${firstName}` : ''}! 🎉
          </h1>
          <p style={{ color: '#64748b', marginBottom: 8, lineHeight: 1.6, fontSize: '0.9rem' }}>
            Your Academe account has been created. Redirecting to login…
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: 24 }}>
            Welcome to your campus community.
          </p>
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: '100%',
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: 99,
              animation: 'sp-progress 2.8s linear forwards',
            }} />
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Main Render
  // ------------------------------------------------------------
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes sp-slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-spin { to { transform: rotate(360deg); } }
        @keyframes sp-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes sp-stepIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .sp-page {
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          display: flex;
          background: #f8faff;
        }

        /* Left panel — desktop only */
        .sp-left {
          display: none;
        }
        @media (min-width: 1024px) {
          .sp-left {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem 3.5rem;
            flex: 1;
            background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%);
            position: sticky;
            top: 0;
            height: 100vh;
            overflow: hidden;
          }
        }

        .sp-left-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }

        .sp-left-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 3rem;
        }
        .sp-left-logo-mark {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 24px rgba(99,102,241,0.4);
        }
        .sp-left-brand {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.4rem; font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #a5b4fc, #c4b5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sp-left-headline {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(1.8rem, 2.5vw, 2.4rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #f8fafc;
          line-height: 1.15;
          margin-bottom: 1rem;
        }
        .sp-left-headline span {
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sp-left-sub {
          color: #94a3b8;
          font-size: 0.88rem;
          line-height: 1.7;
          margin-bottom: 2rem;
          max-width: 360px;
        }

        .sp-benefit {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 1rem;
          animation: sp-slideUp 0.5s ease both;
        }
        .sp-benefit-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .sp-benefit-text {
          font-size: 0.85rem;
          color: #cbd5e1;
          font-weight: 500;
          line-height: 1.5;
          padding-top: 8px;
        }

        .sp-left-stats {
          display: flex;
          gap: 1.5rem;
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          flex-wrap: wrap;
        }
        .sp-stat { }
        .sp-stat-num {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.5rem; font-weight: 800;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
        }
        .sp-stat-label {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 1px;
        }

        /* Right side */
        .sp-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          flex: none;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .sp-right {
            width: 480px;
            flex-shrink: 0;
            overflow-y: auto;
            max-height: 100vh;
          }
        }

        .sp-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 26px;
          padding: 2rem 1.75rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          animation: sp-slideUp 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sp-card-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .sp-card-logo {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 0.75rem;
          box-shadow: 0 8px 28px rgba(99,102,241,0.35);
        }
        .sp-card-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.5rem; font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 4px;
        }
        .sp-card-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 500;
        }

        /* Personalised banner */
        .sp-personal-banner {
          padding: 0.7rem 1rem;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.07));
          border: 1px solid rgba(99,102,241,0.12);
          margin-bottom: 1.25rem;
          font-size: 0.8rem;
          color: #4f46e5;
          font-weight: 600;
          line-height: 1.4;
        }

        .sp-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #1f2937;
          outline: none;
          transition: all 0.2s ease;
        }
        .sp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
          background: #fff;
        }
        .sp-input.err {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
          background: rgba(239,68,68,0.03);
        }
        .sp-input::placeholder { color: #9ca3af; }
        .sp-input:focus::placeholder { color: #c4b5fd; }

        .sp-step-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: sp-stepIn 0.3s ease both;
        }

        .sp-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #374151;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          display: block;
          margin-bottom: 5px;
        }
        .sp-helper {
          font-size: 0.65rem;
          color: #94a3b8;
          margin-top: 3px;
          display: block;
        }
        .sp-err-msg {
          font-size: 0.68rem;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
          margin-top: 3px;
        }

        .sp-inst-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          z-index: 50;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          max-height: 160px;
          overflow-y: auto;
        }
        .sp-inst-item {
          padding: 9px 14px;
          cursor: pointer;
          font-size: 0.82rem;
          color: #1f2937;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.12s;
          font-family: 'Outfit', sans-serif;
        }
        .sp-inst-item:hover { background: rgba(99,102,241,0.06); color: #6366f1; }
        .sp-inst-item:last-child { border-bottom: none; }

        .sp-check-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .sp-check-row input[type="checkbox"] {
          width: 18px; height: 18px;
          margin-top: 1px;
          accent-color: #6366f1;
          flex-shrink: 0;
          cursor: pointer;
        }
        .sp-check-label {
          font-size: 0.8rem;
          color: #6b7280;
          font-weight: 500;
          line-height: 1.5;
        }
        .sp-check-label a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .sp-check-label a:hover { text-decoration: underline; }

        .sp-trust-row {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sp-trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          color: #6b7280;
          font-weight: 500;
        }
        .sp-trust-check {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Review card */
        .sp-review-card {
          background: #f8faff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 0.5rem;
        }
        .sp-review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
        }
        .sp-review-key { color: #9ca3af; font-weight: 500; }
        .sp-review-val { color: #1f2937; font-weight: 600; text-align: right; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .sp-btn {
          width: 100%; padding: 0.82rem; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-family: 'Outfit', sans-serif;
          font-size: 0.9rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(99,102,241,0.3);
          margin-top: 0.5rem;
        }
        .sp-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99,102,241,0.4); }
        .sp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .sp-btn-ghost {
          width: 100%; padding: 0.72rem; border-radius: 14px;
          border: 1.5px solid #e5e7eb;
          background: transparent; color: #6b7280;
          font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: all 0.2s ease; margin-top: 0.4rem;
        }
        .sp-btn-ghost:hover { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.04); }

        .sp-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: sp-spin 0.75s linear infinite;
          flex-shrink: 0;
        }

        .sp-social-proof {
          text-align: center;
          margin-top: 1rem;
          font-size: 0.68rem;
          color: #9ca3af;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sp-social-proof span {
          display: flex; align-items: center; gap: 4px; font-weight: 500;
        }

        .sp-footer {
          text-align: center;
          margin-top: 1.1rem;
          font-size: 0.8rem;
          color: #6b7280;
        }
        .sp-footer a { color: #6366f1; font-weight: 700; text-decoration: none; }
        .sp-footer a:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .sp-card { padding: 1.5rem 1.25rem; border-radius: 20px; }
        }
      `}</style>

      <div className="sp-page">

        {/* ── Left Panel (desktop) ── */}
        <div className="sp-left">
          <div className="sp-left-orb" style={{ width: 320, height: 320, background: 'radial-gradient(circle,rgba(99,102,241,0.35) 0%,transparent 70%)', top: -80, left: -80 }} />
          <div className="sp-left-orb" style={{ width: 280, height: 280, background: 'radial-gradient(circle,rgba(139,92,246,0.3) 0%,transparent 70%)', bottom: -60, right: -60 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="sp-left-logo">
              <div className="sp-left-logo-mark">
                <FiZap size={22} color="#fff" />
              </div>
              <span className="sp-left-brand">Academe</span>
            </div>

            <h2 className="sp-left-headline">
              Your campus<br />
              <span>smarter than ever.</span>
            </h2>

            <p className="sp-left-sub">
              Join thousands of students who manage their academic lives, discover opportunities, and stay connected — all in one place.
            </p>

            <div>
              {BENEFITS.map((b, i) => (
                <div key={b.text} className="sp-benefit" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="sp-benefit-icon">{b.icon}</div>
                  <div className="sp-benefit-text">{b.text}</div>
                </div>
              ))}
            </div>

            <div className="sp-left-stats">
              {[
                { num: '15K+', label: 'Active Students' },
                { num: '20', label: 'Universities' },
                { num: '95%', label: 'Satisfaction' },
              ].map(s => (
                <div key={s.label} className="sp-stat">
                  <div className="sp-stat-num">{s.num}</div>
                  <div className="sp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 24, padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex' }}>
                {['🟣', '🔵', '🟢'].map((c, i) => (
                  <div key={i} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: ['#818cf8', '#60a5fa', '#34d399'][i],
                    marginLeft: i > 0 ? -8 : 0,
                    border: '2px solid rgba(15,23,42,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: 700, color: '#fff',
                  }}>
                    {['KU', 'UoN', 'JK'][i]}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                Trusted by students at JKUAT, KU, UoN & more
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="sp-right">
          <div className="sp-card">

            {/* Header */}
            <div className="sp-card-header">
              <div className="sp-card-logo">
                <FiZap size={24} color="#fff" />
              </div>
              <div className="sp-card-title">
                {step === 0 && 'Create Account'}
                {step === 1 && (firstName ? `Great choice, ${firstName}!` : 'Academic Details')}
                {step === 2 && 'Almost there!'}
              </div>
              <div className="sp-card-subtitle">
                {step === 0 && 'Your student profile starts here'}
                {step === 1 && 'Tell us about your studies'}
                {step === 2 && 'Review and confirm your details'}
              </div>
            </div>

            {/* Personalised banner */}
            {step === 1 && formData.institution && (
              <div className="sp-personal-banner">
                🎓 You're joining from <strong>{formData.institution}</strong> — welcome to the community!
              </div>
            )}
            {step === 2 && firstName && (
              <div className="sp-personal-banner">
                👋 Hey <strong>{firstName}</strong>! You're just one tap away from joining Academe.
              </div>
            )}

            {/* Step Progress */}
            <StepBar step={step} />

            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div className="sp-step-body">
                <div>
                  <label className="sp-label">Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <FiUser size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className={`sp-input${errors.full_name ? ' err' : ''}`}
                      value={formData.full_name}
                      onChange={e => handleChange('full_name', e.target.value)}
                      placeholder="e.g. Alice Wanjiku"
                    />
                  </div>
                  {errors.full_name && <span className="sp-err-msg"><FiAlertCircle size={11} /> {errors.full_name}</span>}
                </div>

                <div>
                  <label className="sp-label">Phone Number *</label>
                  <div style={{ position: 'relative' }}>
                    <FiPhone size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="tel"
                      className={`sp-input${errors.phone_number ? ' err' : ''}`}
                      value={formData.phone_number}
                      onChange={e => handleChange('phone_number', e.target.value)}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                  {errors.phone_number && <span className="sp-err-msg"><FiAlertCircle size={11} /> {errors.phone_number}</span>}
                  <span className="sp-helper">You'll receive a one-time code for verification — no passwords needed.</span>
                </div>

                <button className="sp-btn" onClick={next}>
                  Continue <FiArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── Step 1: Academic ── */}
            {step === 1 && (
              <div className="sp-step-body">
                <div style={{ position: 'relative' }}>
                  <label className="sp-label">Institution *</label>
                  <div style={{ position: 'relative' }}>
                    <FiHome size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
                    <input
                      type="text"
                      className={`sp-input${errors.institution ? ' err' : ''}`}
                      value={formData.institution}
                      onChange={e => { handleChange('institution', e.target.value); setShowInstDropdown(true); }}
                      onFocus={() => setShowInstDropdown(true)}
                      onBlur={() => setTimeout(() => setShowInstDropdown(false), 180)}
                      placeholder="e.g. Kenyatta University"
                    />
                  </div>
                  {errors.institution && <span className="sp-err-msg"><FiAlertCircle size={11} /> {errors.institution}</span>}
                  {showInstDropdown && formData.institution.length >= 2 && filteredInstitutions.length > 0 && (
                    <div className="sp-inst-dropdown">
                      {filteredInstitutions.map(inst => (
                        <div key={inst} className="sp-inst-item" onMouseDown={() => { handleChange('institution', inst); setShowInstDropdown(false); }}>
                          🏫 {inst}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="sp-label">Admission Number *</label>
                  <div style={{ position: 'relative' }}>
                    <FiHash size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className={`sp-input${errors.admission_number ? ' err' : ''}`}
                      value={formData.admission_number}
                      onChange={e => handleChange('admission_number', e.target.value)}
                      placeholder="e.g. I81/1229/2020"
                    />
                  </div>
                  {errors.admission_number && <span className="sp-err-msg"><FiAlertCircle size={11} /> {errors.admission_number}</span>}
                </div>

                <div>
                  <label className="sp-label">Class / Year of Study *</label>
                  <div style={{ position: 'relative' }}>
                    <FiBookOpen size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className={`sp-input${errors.class_name ? ' err' : ''}`}
                      value={formData.class_name}
                      onChange={e => handleChange('class_name', e.target.value)}
                      placeholder="e.g. 3rd Year Microbiology"
                    />
                  </div>
                  {errors.class_name && <span className="sp-err-msg"><FiAlertCircle size={11} /> {errors.class_name}</span>}
                </div>

                <button className="sp-btn" onClick={next}>
                  Continue <FiArrowRight size={16} />
                </button>
                <button className="sp-btn-ghost" onClick={back}>
                  <FiArrowLeft size={14} /> Back
                </button>
              </div>
            )}

            {/* ── Step 2: Confirm ── */}
            {step === 2 && (
              <div className="sp-step-body">
                <div>
                  <label className="sp-label">Email (optional)</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      className="sp-input"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <span className="sp-helper">For account recovery only — completely optional.</span>
                </div>

                {/* Review */}
                <div>
                  <label className="sp-label" style={{ marginBottom: 8 }}>Review your details</label>
                  <div className="sp-review-card">
                    {[
                      { k: 'Name', v: formData.full_name },
                      { k: 'Phone', v: formData.phone_number },
                      { k: 'Institution', v: formData.institution },
                      { k: 'Admission No.', v: formData.admission_number },
                      { k: 'Class', v: formData.class_name },
                    ].map(r => (
                      <div key={r.k} className="sp-review-row">
                        <span className="sp-review-key">{r.k}</span>
                        <span className="sp-review-val">{r.v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <div className="sp-check-row">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => { setAgreedToTerms(e.target.checked); if (errors.terms) setErrors(p => ({ ...p, terms: null })); }}
                    />
                    <label className="sp-check-label">
                      I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                    </label>
                  </div>
                  {errors.terms && <span className="sp-err-msg" style={{ marginTop: 4 }}><FiAlertCircle size={11} /> {errors.terms}</span>}
                </div>

                {/* Trust indicators */}
                <div className="sp-trust-row">
                  {[
                    { icon: <FiPhone size={10} />, text: 'Phone verification — no passwords' },
                    { icon: <FiLock size={10} />, text: 'Your data is encrypted at rest' },
                    { icon: <FiShield size={10} />, text: 'We never share personal data' },
                  ].map(t => (
                    <div key={t.text} className="sp-trust-item">
                      <div className="sp-trust-check" style={{ color: '#10b981' }}>
                        <FiCheck size={9} color="#10b981" />
                      </div>
                      {t.text}
                    </div>
                  ))}
                </div>

                <button className="sp-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><div className="sp-spinner" /> Creating account…</> : <>Create Account <FiArrowRight size={15} /></>}
                </button>
                <button className="sp-btn-ghost" onClick={back}>
                  <FiArrowLeft size={14} /> Back
                </button>
              </div>
            )}

            {/* Social Proof */}
            <div className="sp-social-proof">
              <span><FiStar size={10} color="#f59e0b" /> Rated by students</span>
              <span><FiUsers size={10} /> JKUAT · KU · UoN</span>
              <span><FiCheck size={10} color="#10b981" /> Free Forever</span>
            </div>

            <div className="sp-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}