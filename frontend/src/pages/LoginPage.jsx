import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FiZap, FiPhone, FiArrowRight, FiArrowLeft,
  FiWifiOff, FiCamera, FiBookOpen, FiUsers,
  FiTrendingUp, FiMessageSquare, FiStar, FiShield,
  FiSun, FiMoon, FiCheckCircle,
} from 'react-icons/fi';

// ------------------------------------------------------------
// Camera capture helper
// ------------------------------------------------------------
async function captureImageFromCamera() {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:9999;background:#000;';
    document.body.appendChild(video);

    const captureBtn = document.createElement('button');
    captureBtn.innerText = 'Capture Face';
    captureBtn.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:10000;padding:12px 32px;border-radius:999px;background:#6366f1;color:#fff;border:none;font-size:1rem;font-weight:600;cursor:pointer;';
    document.body.appendChild(captureBtn);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕ Cancel';
    closeBtn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;padding:8px 16px;border-radius:8px;background:rgba(255,255,255,0.2);color:#fff;border:none;cursor:pointer;';
    document.body.appendChild(closeBtn);

    let stream = null;
    const cleanup = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      [video, captureBtn, closeBtn].forEach(el => el.parentNode?.removeChild(el));
    };

    const handleCapture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      cleanup();
      resolve(base64);
    };

    captureBtn.addEventListener('click', handleCapture);
    closeBtn.addEventListener('click', () => { cleanup(); resolve(null); });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then(s => { stream = s; video.srcObject = s; video.play().catch(() => { cleanup(); reject(new Error('Camera failed')); }); })
      .catch(err => { cleanup(); reject(err); });
  });
}

// ------------------------------------------------------------
// Feature Carousel Data
// ------------------------------------------------------------
const FEATURES = [
  { icon: '📚', title: 'Academics', desc: 'Access notes, timetables, and learning resources in one place.' },
  { icon: '👥', title: 'Community', desc: 'Connect with classmates, join groups, and collaborate.' },
  { icon: '🚀', title: 'Opportunities', desc: 'Discover internships, scholarships, and campus events.' },
  { icon: '📢', title: 'Announcements', desc: 'Never miss important updates from your institution.' },
];

// ------------------------------------------------------------
// Segmented OTP Input
// ------------------------------------------------------------
function OTPInput({ value, onChange, onComplete }) {
  const inputs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newVal = value.slice(0, idx) + value.slice(idx + 1);
      onChange(newVal);
      if (idx > 0) inputs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) { inputs.current[idx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { inputs.current[idx + 1]?.focus(); return; }
  };

  const handleInput = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const arr = value.padEnd(6, ' ').split('');
    arr[idx] = char;
    const newVal = arr.join('').replace(/ /g, '').slice(0, 6);
    onChange(newVal);
    if (idx < 5) inputs.current[idx + 1]?.focus();
    if (newVal.length === 6) onComplete?.(newVal);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    if (pasted.length === 6) { inputs.current[5]?.focus(); onComplete?.(pasted); }
    else inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '0.75rem 0' }}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={el => inputs.current[idx] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onKeyDown={e => handleKey(e, idx)}
          onInput={e => handleInput(e, idx)}
          onPaste={handlePaste}
          onClick={() => inputs.current[idx]?.select()}
          style={{
            width: 44, height: 52,
            borderRadius: 12,
            border: value[idx] ? '2px solid #6366f1' : '2px solid #e5e7eb',
            background: value[idx] ? 'rgba(99,102,241,0.06)' : '#f9fafb',
            textAlign: 'center',
            fontSize: '1.3rem',
            fontWeight: 700,
            outline: 'none',
            transition: 'all 0.15s ease',
            caretColor: 'transparent',
            color: '#1f2937',
            boxShadow: value[idx] ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
            fontFamily: 'Outfit, sans-serif',
          }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Step Progress
// ------------------------------------------------------------
function StepProgress({ step }) {
  const steps = [
    { id: 'phone', label: 'Phone' },
    { id: 'otp', label: 'Verify' },
    { id: 'done', label: 'Access' },
  ];
  const current = step === 'phone' ? 0 : step === 'otp' ? 1 : 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '1.5rem' }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: done ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e5e7eb',
                border: active ? '3px solid rgba(99,102,241,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s ease',
                boxShadow: (done || active) ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
              }}>
                {done
                  ? <FiCheckCircle size={16} color="#fff" />
                  : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? '#fff' : '#9ca3af' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: (done || active) ? '#6366f1' : '#9ca3af', letterSpacing: '0.02em' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 48, height: 2, margin: '-12px 4px 0',
                background: done ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#e5e7eb',
                borderRadius: 99,
                transition: 'background 0.35s ease',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Auth Method Selector
// ------------------------------------------------------------
function AuthMethodTabs({ method, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: '#f3f4f6',
      borderRadius: 12,
      padding: 4,
      marginBottom: '1rem',
      gap: 2,
    }}>
      {[
        { id: 'otp', icon: <FiMessageSquare size={14} />, label: 'SMS Code' },
        { id: 'face', icon: <FiCamera size={14} />, label: 'Face ID' },
      ].map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, padding: '8px 12px', border: 'none', borderRadius: 10,
            background: method === tab.id ? '#fff' : 'transparent',
            color: method === tab.id ? '#6366f1' : '#6b7280',
            fontWeight: method === tab.id ? 700 : 500,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s ease',
            boxShadow: method === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Main Login Page
// ------------------------------------------------------------
export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authMethod, setAuthMethod] = useState('otp');
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [greeting, setGreeting] = useState({ text: '', icon: null });

  const { login, biometricLogin } = useAuth();
  const navigate = useNavigate();

  // Greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting({ text: 'Good Morning', icon: '☀️' });
    else if (hour >= 12 && hour < 17) setGreeting({ text: 'Good Afternoon', icon: '🌤️' });
    else setGreeting({ text: 'Good Evening', icon: '🌙' });
  }, []);

  // Online/offline
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setInterval(() => setResendTimer(v => v - 1), 1000);
      return () => clearInterval(t);
    }
  }, [resendTimer]);

  // Carousel rotation
  useEffect(() => {
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % FEATURES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const requestOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!phone.trim() || phone.length < 10) { toast.error('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setStep('otp');
      setResendTimer(30);
      toast.success('OTP sent! Check your messages.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (otp.length < 6) { toast.error('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      await login(phone, otp);
      setStep('done');
      toast.success('Welcome back! 🎉');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      toast.error(err.message || 'Invalid OTP. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!phone.trim() || phone.length < 10) { toast.error('Enter your phone number first'); return; }
    setLoading(true);
    try {
      const img = await captureImageFromCamera();
      if (!img) { toast('Biometric login cancelled', { icon: '📷' }); setLoading(false); return; }
      await biometricLogin(phone, img);
      toast.success('Face recognised! ✨');
      navigate('/');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied.');
      } else {
        toast.error(err.response?.data?.error || err.message || 'Biometric failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = (val) => {
    setOtp(val);
    if (val.length === 6) setTimeout(() => verifyOTP(), 100);
  };

  const feat = FEATURES[carouselIdx];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes lp-float {
          0%,100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(1deg); }
          66% { transform: translateY(-9px) rotate(-0.5deg); }
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 24px rgba(99,102,241,0.35), 0 0 64px rgba(99,102,241,0.12); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.55), 0 0 90px rgba(139,92,246,0.22); }
        }
        @keyframes lp-grad {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes lp-slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-carousel {
          0% { opacity: 0; transform: translateY(10px); }
          10%,90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes lp-spin {
          to { transform: rotate(360deg); }
        }

        .lp-wrap {
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f172a 100%);
          background-size: 400% 400%;
          animation: lp-grad 18s ease infinite;
        }

        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .lp-orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%);
          top: -120px; left: -120px;
          animation: lp-float 9s ease-in-out infinite;
        }
        .lp-orb-2 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%);
          bottom: -90px; right: -90px;
          animation: lp-float 11s ease-in-out infinite reverse;
        }
        .lp-orb-3 {
          width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          animation: lp-float 14s ease-in-out infinite;
        }

        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .lp-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 28px;
          padding: 2.25rem 2rem 2rem;
          box-shadow: 0 28px 64px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12);
          animation: lp-slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .lp-greeting {
          text-align: center;
          font-size: 0.78rem;
          font-weight: 600;
          color: #6366f1;
          letter-spacing: 0.01em;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .lp-logo-mark {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          border-radius: 17px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 0.9rem;
          animation: lp-pulse 3s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(99,102,241,0.4);
        }
        .lp-brand-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.75rem; font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
          margin-bottom: 0.15rem;
          line-height: 1.1;
        }
        .lp-tagline {
          text-align: center;
          font-size: 0.78rem;
          color: #6b7280;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 0.6rem;
        }
        .lp-tagline-hl { color: #6366f1; font-weight: 600; }

        /* Social proof */
        .lp-social-proof {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }
        .lp-proof-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.68rem;
          font-weight: 600;
          color: #6b7280;
        }
        .lp-proof-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 700;
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          border: 1px solid rgba(99,102,241,0.15);
          white-space: nowrap;
        }

        /* Carousel */
        .lp-carousel {
          background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06));
          border: 1px solid rgba(99,102,241,0.12);
          border-radius: 14px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
          min-height: 68px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .lp-carousel-icon {
          font-size: 1.6rem;
          line-height: 1;
          flex-shrink: 0;
        }
        .lp-carousel-content {
          animation: lp-carousel 4.5s ease-in-out infinite;
        }
        .lp-carousel-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 2px;
        }
        .lp-carousel-desc {
          font-size: 0.72rem;
          color: #6b7280;
          line-height: 1.4;
        }
        .lp-carousel-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: -0.5rem;
          margin-bottom: 1rem;
        }
        .lp-carousel-dot {
          width: 6px; height: 6px;
          border-radius: 99px;
          transition: all 0.3s ease;
        }

        /* Offline */
        .lp-offline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 0.9rem;
          border-radius: 12px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: #d97706;
          font-size: 0.76rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        /* Form */
        .lp-label {
          display: block;
          font-size: 0.76rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.45rem;
          letter-spacing: 0.01em;
        }
        .lp-helper {
          font-size: 0.68rem;
          color: #9ca3af;
          font-weight: 400;
          margin-top: 2px;
          display: block;
        }
        .lp-input-wrap {
          position: relative;
        }
        .lp-input-wrap svg {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .lp-input {
          width: 100%;
          padding: 0.78rem 1rem 0.78rem 2.6rem;
          border-radius: 13px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Outfit', sans-serif;
          font-size: 0.92rem;
          font-weight: 500;
          color: #111827;
          outline: none;
          transition: all 0.2s ease;
        }
        .lp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
          background: #fff;
        }
        .lp-input::placeholder { color: #9ca3af; }

        .lp-btn {
          width: 100%;
          padding: 0.82rem;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(99,102,241,0.35);
          margin-bottom: 0.75rem;
        }
        .lp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.45);
        }
        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lp-resend {
          background: none; border: none;
          color: #6366f1; font-size: 0.76rem; font-weight: 600;
          cursor: pointer; padding: 0;
          transition: color 0.15s;
        }
        .lp-resend:hover:not(:disabled) { color: #4f46e5; text-decoration: underline; }
        .lp-resend:disabled { color: #9ca3af; cursor: not-allowed; }

        .lp-back {
          width: 100%; padding: 0.55rem; border: none;
          background: transparent; color: #9ca3af;
          font-family: 'Outfit', sans-serif; font-size: 0.78rem;
          font-weight: 500; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          transition: color 0.15s; margin-top: 0.2rem;
        }
        .lp-back:hover { color: #6366f1; }

        .lp-divider {
          display: flex; align-items: center; gap: 0.6rem;
          margin: 0.75rem 0;
          color: #9ca3af; font-size: 0.68rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .lp-divider::before, .lp-divider::after {
          content: ''; flex: 1; height: 1px; background: #e5e7eb;
        }

        .lp-footer {
          text-align: center; margin-top: 1.1rem;
          font-size: 0.8rem; color: #6b7280;
        }
        .lp-footer a {
          color: #6366f1; font-weight: 700;
          text-decoration: none; transition: color 0.15s;
        }
        .lp-footer a:hover { color: #4f46e5; text-decoration: underline; }

        .lp-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.75s linear infinite;
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .lp-card { padding: 1.75rem 1.25rem 1.5rem; border-radius: 22px; }
        }
      `}</style>

      <div className="lp-wrap">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-grid" />

        <div className="lp-card">

          {/* Greeting */}
          <div className="lp-greeting">
            {greeting.icon} {greeting.text}
          </div>

          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div className="lp-logo-mark">
              <FiZap size={26} color="#fff" />
            </div>
            <h1 className="lp-brand-name">Academe</h1>
            <p className="lp-tagline">
              Where <span className="lp-tagline-hl">education</span> meets{' '}
              <span className="lp-tagline-hl">innovation</span>
            </p>

            {/* Social proof */}
            <div className="lp-social-proof">
              <span className="lp-proof-badge">⭐ 15,000+ Students</span>
              <span className="lp-proof-badge">🎓 20 Universities</span>
              <span className="lp-proof-badge">🚀 95% Satisfaction</span>
            </div>
          </div>

          {/* Feature Carousel */}
          <div className="lp-carousel">
            <div className="lp-carousel-icon">{feat.icon}</div>
            <div className="lp-carousel-content" key={carouselIdx}>
              <div className="lp-carousel-title">{feat.title}</div>
              <div className="lp-carousel-desc">{feat.desc}</div>
            </div>
          </div>
          <div className="lp-carousel-dots">
            {FEATURES.map((_, i) => (
              <div
                key={i}
                className="lp-carousel-dot"
                style={{
                  width: i === carouselIdx ? 18 : 6,
                  background: i === carouselIdx ? '#6366f1' : '#e5e7eb',
                }}
              />
            ))}
          </div>

          {/* Step Progress */}
          <StepProgress step={step} />

          {/* Offline banner */}
          {!isOnline && (
            <div className="lp-offline">
              <FiWifiOff size={15} /> You're offline — limited functionality available
            </div>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <form onSubmit={requestOTP}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="lp-label">Phone Number</label>
                <div className="lp-input-wrap">
                  <FiPhone size={16} />
                  <input
                    type="tel"
                    className="lp-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    required
                  />
                </div>
                <span className="lp-helper">We'll send a secure one-time code. No passwords required.</span>
              </div>
              <button type="submit" className="lp-btn" disabled={loading}>
                {loading ? <><div className="lp-spinner" /> Sending OTP…</> : <>Get OTP <FiArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={verifyOTP}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label className="lp-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Verification Code</span>
                  {resendTimer > 0 && (
                    <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.7rem' }}>Resend in {resendTimer}s</span>
                  )}
                </label>
                <span className="lp-helper" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Enter the 6-digit code sent to <strong style={{ color: '#374151' }}>{phone}</strong>
                </span>

                <OTPInput value={otp} onChange={setOtp} onComplete={handleOTPComplete} />

                <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className="lp-resend"
                    disabled={resendTimer > 0}
                    onClick={requestOTP}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-btn" disabled={loading || otp.length < 6}>
                {loading ? <><div className="lp-spinner" /> Verifying…</> : 'Verify & Sign In'}
              </button>

              <div className="lp-divider">or choose another method</div>

              <AuthMethodTabs method={authMethod} onChange={setAuthMethod} />

              {authMethod === 'face' && (
                <button
                  type="button"
                  className="lp-btn"
                  style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', marginBottom: 0 }}
                  onClick={handleBiometricLogin}
                  disabled={loading}
                >
                  <FiCamera size={16} /> Authenticate with Face ID
                </button>
              )}

              <button type="button" className="lp-back" onClick={() => setStep('phone')}>
                <FiArrowLeft size={13} /> Change phone number
              </button>
            </form>
          )}

          {/* Trust row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem', marginTop: '0.85rem',
            fontSize: '0.68rem', color: '#9ca3af', fontWeight: 500,
          }}>
            <FiShield size={11} /> End-to-end encrypted &nbsp;·&nbsp; No passwords stored
          </div>

          <div className="lp-footer">
            Don't have an account?{' '}
            <Link to="/signup">Create one free</Link>
          </div>
        </div>
      </div>
    </>
  );
}