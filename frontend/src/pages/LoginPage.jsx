import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FiZap, FiPhone, FiArrowRight, FiArrowLeft,
  FiWifiOff, FiCamera, FiMessageSquare, FiShield, FiCheckCircle,
  FiLock, FiEye, FiEyeOff, FiUser,
} from 'react-icons/fi';

// ─── Camera capture helper ────────────────────────────────────────────────
async function captureImageFromCamera() {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:9999;background:#000;';
    document.body.appendChild(video);

    const captureBtn = document.createElement('button');
    captureBtn.innerText = 'Capture Face';
    captureBtn.style.cssText =
      'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:10000;padding:12px 32px;border-radius:999px;background:#6366f1;color:#fff;border:none;font-size:1rem;font-weight:600;cursor:pointer;';
    document.body.appendChild(captureBtn);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕ Cancel';
    closeBtn.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:10000;padding:8px 16px;border-radius:8px;background:rgba(255,255,255,0.2);color:#fff;border:none;cursor:pointer;';
    document.body.appendChild(closeBtn);

    let stream = null;
    const cleanup = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      [video, captureBtn, closeBtn].forEach(el => el.parentNode?.removeChild(el));
    };

    captureBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      cleanup();
      resolve(base64);
    });
    closeBtn.addEventListener('click', () => { cleanup(); resolve(null); });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then(s => { stream = s; video.srcObject = s; video.play().catch(() => { cleanup(); reject(new Error('Camera failed')); }); })
      .catch(err => { cleanup(); reject(err); });
  });
}

// ─── Feature carousel data ────────────────────────────────────────────────
const FEATURES = [
  { icon: '🎓', title: 'Opportunities', desc: 'Scholarships, internships, attachments and career openings.' },
  { icon: '📅', title: 'Smart Classes', desc: 'Attendance tracking, schedules and venue guidance.' },
  { icon: '💬', title: 'Student Network', desc: 'Real-time messaging, voice notes and collaboration.' },
  { icon: '📢', title: 'Campus Updates', desc: 'Announcements, blogs and academic alerts.' },
  { icon: '📍', title: 'Campus Navigation', desc: 'Locate classes and facilities with guided directions.' },
  { icon: '🔎', title: 'Found & Lost', desc: 'Recover IDs, documents, keys and belongings.' },
  { icon: '🎫', title: 'Student Support', desc: 'Submit tickets and receive responses within 24–48 hours.' },
];

// ─── OTP input ────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, onComplete }) {
  const inputs = useRef([]);
  const calledComplete = useRef(false);

  useEffect(() => { if (value.length < 6) calledComplete.current = false; }, [value]);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = value.slice(0, idx) + value.slice(idx + 1);
      onChange(next);
      if (idx > 0) inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleInput = (e, idx) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    if (!ch) return;
    const arr = value.padEnd(6, ' ').split('');
    arr[idx] = ch;
    const next = arr.join('').replace(/ /g, '').slice(0, 6);
    onChange(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
    if (next.length === 6 && !calledComplete.current) {
      calledComplete.current = true;
      onComplete?.(next);
    }
  };

  const handlePaste = e => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p);
    if (p.length === 6) {
      inputs.current[5]?.focus();
      if (!calledComplete.current) { calledComplete.current = true; onComplete?.(p); }
    } else {
      inputs.current[Math.min(p.length, 5)]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '0.6rem 0' }}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={el => inputs.current[idx] = el}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] || ''}
          onKeyDown={e => handleKey(e, idx)}
          onInput={e => handleInput(e, idx)}
          onPaste={handlePaste}
          onClick={() => inputs.current[idx]?.select()}
          style={{
            width: 42, height: 50,
            borderRadius: 11,
            border: value[idx] ? '2px solid #6366f1' : '2px solid #e5e7eb',
            background: value[idx] ? 'rgba(99,102,241,0.06)' : '#f9fafb',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            caretColor: '#6366f1',
            color: '#1f2937',
            boxShadow: value[idx] ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
            fontFamily: 'Outfit, sans-serif',
          }}
        />
      ))}
    </div>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────
function StepDots({ step }) {
  const idx = step === 'phone' ? 0 : step === 'otp' ? 1 : 2;
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1.1rem' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: i === idx ? 20 : 6,
          height: 6,
          borderRadius: 99,
          background: i <= idx ? '#6366f1' : '#e5e7eb',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      ))}
    </div>
  );
}

// ─── Auth method tabs ─────────────────────────────────────────────────────
function AuthMethodTabs({ method, onChange }) {
  return (
    <div style={{
      display: 'flex', background: '#f3f4f6',
      borderRadius: 11, padding: 3, gap: 2, marginBottom: '0.85rem',
    }}>
      {[
        { id: 'otp', icon: <FiMessageSquare size={13} />, label: 'SMS Code' },
        { id: 'face', icon: <FiCamera size={13} />, label: 'Face ID' },
        { id: 'password', icon: <FiLock size={13} />, label: 'Password' },
      ].map(tab => (
        <button key={tab.id} type="button" onClick={() => onChange(tab.id)} style={{
          flex: 1, padding: '7px 10px', border: 'none', borderRadius: 9,
          background: method === tab.id ? '#fff' : 'transparent',
          color: method === tab.id ? '#6366f1' : '#6b7280',
          fontWeight: method === tab.id ? 700 : 500,
          fontSize: '0.8rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all 0.18s ease',
          boxShadow: method === tab.id ? '0 2px 6px rgba(0,0,0,0.07)' : 'none',
          fontFamily: 'Outfit, sans-serif',
        }}>
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authMethod, setAuthMethod] = useState('otp');
  const [featIdx, setFeatIdx] = useState(0);
  const [featVisible, setFeatVisible] = useState(true);

  // Password login state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  const verifyingRef = useRef(false);
  const { login, passwordLogin, biometricLogin, verify2FALogin } = useAuth();
  const navigate = useNavigate();

  // Auto-fill last used identifier
  useEffect(() => {
    const lastId = localStorage.getItem('last_login_identifier');
    if (lastId) {
      setPhone(lastId);
    }
  }, []);

  // Online status
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // Carousel — cross-fade between items
  useEffect(() => {
    const cycle = setInterval(() => {
      setFeatVisible(false);
      setTimeout(() => {
        setFeatIdx(i => (i + 1) % FEATURES.length);
        setFeatVisible(true);
      }, 350);
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  const requestOTP = async e => {
    e?.preventDefault?.();
    if (!phone.trim() || phone.length < 10) { toast.error('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setStep('otp');
      setResendTimer(30);
      toast.success('OTP sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async e => {
    e?.preventDefault?.();
    if (verifyingRef.current) return;
    if (otp.length < 6) { toast.error('Enter all 6 digits'); return; }
    verifyingRef.current = true;
    setLoading(true);
    try {
      const result = await login(phone, otp);
      if (result?.require_2fa) {
        setTempToken(result.temp_token);
        setShow2FAModal(true);
        return;
      }
      setStep('done');
      toast.success('Welcome back! 🎉');
      setTimeout(() => navigate('/'), 700);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Invalid OTP. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
      verifyingRef.current = false;
    }
  };

  const handleBiometricLogin = async () => {
    if (!phone.trim() || phone.length < 10) { toast.error('Enter your phone number first'); return; }
    setLoading(true);
    try {
      const img = await captureImageFromCamera();
      if (!img) { toast('Biometric cancelled', { icon: '📷' }); return; }
      const result = await biometricLogin(phone, img);
      if (result?.require_2fa) { setTempToken(result.temp_token); setShow2FAModal(true); return; }
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

  const handlePasswordLogin = async e => {
    e?.preventDefault?.();
    if (!phone.trim() || !password.trim()) { toast.error('Enter both identifier and password'); return; }
    setLoading(true);
    try {
      const result = await passwordLogin(phone, password);
      if (result?.require_2fa) {
        setTempToken(result.temp_token);
        setShow2FAModal(true);
        return;
      }
      toast.success('Welcome back! 🎉');
      setTimeout(() => navigate('/'), 700);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Invalid credentials');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFactorCode.length < 6) { toast.error('Enter 6-digit code'); return; }
    setVerifying2FA(true);
    try {
      await verify2FALogin(tempToken, twoFactorCode);
      setShow2FAModal(false);
      toast.success('Welcome back! 🎉');
      setTimeout(() => navigate('/'), 700);
    } catch (err) {
      toast.error(err.message || 'Invalid 2FA code');
      setTwoFactorCode('');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleOTPComplete = useCallback(val => setOtp(val), []);

  const feat = FEATURES[featIdx];

  // ─── Render auth method content ───────────────────────────────────────
  const renderAuthContent = () => {
    if (authMethod === 'otp') {
      return (
        <>
          {step === 'phone' ? (
            <form onSubmit={requestOTP}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label className="lp-label">Phone number</label>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon"><FiPhone size={15} /></span>
                  <input
                    type="tel"
                    className="lp-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    required
                    autoFocus
                  />
                </div>
                <span className="lp-helper">We'll send a one-time code. No passwords stored.</span>
              </div>

              <button type="submit" className="lp-btn" disabled={loading}>
                {loading
                  ? <><div className="lp-spinner" /> Sending…</>
                  : <>Continue <FiArrowRight size={15} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              <div style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="lp-label" style={{ marginBottom: 0 }}>6-digit code</label>
                  {resendTimer > 0 && (
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Resend in {resendTimer}s</span>
                  )}
                </div>
                <OTPInput value={otp} onChange={setOtp} onComplete={handleOTPComplete} />
                <div style={{ textAlign: 'right', marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    className="lp-resend"
                    disabled={resendTimer > 0 || loading}
                    onClick={requestOTP}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-btn" disabled={loading || otp.length < 6}>
                {loading
                  ? <><div className="lp-spinner" /> Verifying…</>
                  : 'Verify & sign in'}
              </button>

              <button type="button" className="lp-back" onClick={() => setStep('phone')}>
                <FiArrowLeft size={12} /> Change number
              </button>
            </form>
          )}
        </>
      );
    }

    if (authMethod === 'face') {
      return (
        <div>
          <div style={{ marginBottom: '0.9rem' }}>
            <label className="lp-label">Phone number</label>
            <div className="lp-input-wrap">
              <span className="lp-input-icon"><FiPhone size={15} /></span>
              <input
                type="tel"
                className="lp-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
                required
              />
            </div>
            <span className="lp-helper">We'll match your face with your enrolled biometric.</span>
          </div>

          <button
            type="button"
            className="lp-btn"
            onClick={handleBiometricLogin}
            disabled={loading}
          >
            {loading ? <><div className="lp-spinner" /> Capturing…</> : <><FiCamera size={15} /> Use Face ID</>}
          </button>

          <button type="button" className="lp-back" onClick={() => setAuthMethod('otp')}>
            <FiArrowLeft size={12} /> Back to OTP
          </button>
        </div>
      );
    }

    // Password login
    return (
      <form onSubmit={handlePasswordLogin}>
        <div style={{ marginBottom: '0.9rem' }}>
          <label className="lp-label">Phone or Admission number</label>
          <div className="lp-input-wrap">
            <span className="lp-input-icon"><FiUser size={15} /></span>
            <input
              type="text"
              className="lp-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+254 700 000 000 or I81/1001/2020"
              required
              autoFocus
            />
          </div>
          <span className="lp-helper">Use your phone number or admission number.</span>
        </div>

        <div style={{ marginBottom: '0.9rem' }}>
          <label className="lp-label">Password</label>
          <div className="lp-input-wrap">
            <span className="lp-input-icon"><FiLock size={15} /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="lp-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '0.8rem', top: '50%',
                transform: 'translateY(-50%)', background: 'none', border: 'none',
                color: '#9ca3af', cursor: 'pointer'
              }}
            >
              {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: '0.35rem' }}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button type="submit" className="lp-btn" disabled={loading || !phone.trim() || !password.trim()}>
          {loading ? <><div className="lp-spinner" /> Signing in…</> : 'Sign in'}
        </button>

        <button type="button" className="lp-back" onClick={() => setAuthMethod('otp')}>
          <FiArrowLeft size={12} /> Back to OTP
        </button>
      </form>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Keyframes ── */
        @keyframes lp-grad {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes lp-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-22px); }
        }
        @keyframes lp-in {
          from { opacity: 0; transform: translateY(22px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes lp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes lp-modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        /* ── Layout ── */
        .lp-page {
          font-family: 'Outfit', sans-serif;
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          overflow: hidden;
          background: #0f172a;
        }
        @media (max-width: 800px) {
          .lp-page { grid-template-columns: 1fr; }
          .lp-hero  { display: none; }
        }

        /* ── Left hero panel ── */
        .lp-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 3.5rem;
          background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
          background-size: 200% 200%;
          animation: lp-grad 14s ease infinite;
          overflow: hidden;
        }
        .lp-orb {
          position: absolute;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 68%);
          filter: blur(72px);
          bottom: -140px; right: -140px;
          animation: lp-float 10s ease-in-out infinite;
          pointer-events: none;
        }
        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }
        .lp-hero-content { position: relative; z-index: 2; }

        .lp-hero-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(167,139,250,0.8);
          margin-bottom: 0.9rem;
        }
        .lp-hero-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2.2rem, 3.5vw, 3rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.08;
          letter-spacing: -0.04em;
          margin-bottom: 1rem;
        }
        .lp-hero-title span {
          background: linear-gradient(135deg, #a78bfa, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-hero-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.65;
          font-weight: 400;
          max-width: 340px;
          margin-bottom: 2rem;
        }

        .lp-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }
        .lp-stat { display: flex; flex-direction: column; gap: 2px; }
        .lp-stat-val {
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .lp-stat-label { font-size: 0.67rem; color: rgba(255,255,255,0.45); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }

        .lp-ticker {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 1rem 1.1rem;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px);
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .lp-ticker.hidden { opacity: 0; transform: translateY(6px); }
        .lp-ticker.visible { opacity: 1; transform: translateY(0); }
        .lp-ticker-icon { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
        .lp-ticker-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 3px;
        }
        .lp-ticker-desc { font-size: 0.72rem; color: rgba(255,255,255,0.5); line-height: 1.45; }

        .lp-ticker-dots {
          display: flex;
          gap: 5px;
          margin-top: 0.8rem;
        }
        .lp-ticker-dot {
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,0.2);
          transition: width 0.3s ease, background 0.3s ease;
        }
        .lp-ticker-dot.active { background: #a78bfa; }

        /* ── Right login panel ── */
        .lp-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fc;
          padding: 2rem 1.5rem;
          position: relative;
        }
        .lp-card {
          width: 100%;
          max-width: 380px;
          background: #fff;
          border-radius: 24px;
          padding: 2rem 1.75rem 1.75rem;
          box-shadow: 0 4px 40px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.04);
          animation: lp-in 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }

        .lp-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 1.3rem;
        }
        .lp-logo {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          flex-shrink: 0;
        }
        .lp-brand-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-brand-sub {
          font-size: 0.7rem;
          color: #9ca3af;
          font-weight: 500;
          margin-top: 1px;
        }

        .lp-card-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.025em;
          margin-bottom: 0.2rem;
        }
        .lp-card-sub {
          font-size: 0.78rem;
          color: #9ca3af;
          font-weight: 400;
          margin-bottom: 1.25rem;
        }

        .lp-offline {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: #d97706;
          font-size: 0.74rem; font-weight: 600;
          margin-bottom: 0.9rem;
        }

        .lp-label {
          display: block;
          font-size: 0.74rem; font-weight: 700;
          color: #374151;
          margin-bottom: 0.4rem;
          letter-spacing: 0.005em;
        }
        .lp-helper {
          font-size: 0.68rem; color: #9ca3af;
          font-weight: 400; margin-top: 4px;
          display: block; line-height: 1.4;
        }

        .lp-input-wrap { position: relative; }
        .lp-input-icon {
          position: absolute;
          left: 0.8rem; top: 50%;
          transform: translateY(-50%);
          color: #9ca3af; pointer-events: none;
          display: flex; align-items: center;
        }
        .lp-input {
          width: 100%;
          padding: 0.72rem 0.9rem 0.72rem 2.5rem;
          border-radius: 11px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem; font-weight: 500;
          color: #1f2937; outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .lp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: #fff;
        }
        .lp-input::placeholder { color: #9ca3af; }

        .lp-btn {
          width: 100%;
          padding: 0.78rem;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 0.87rem; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          transition: opacity 0.18s, transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 5px 18px rgba(99,102,241,0.32);
          margin-bottom: 0.6rem;
        }
        .lp-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.42);
        }
        .lp-btn:active:not(:disabled) { transform: scale(0.98); }
        .lp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-btn-ghost {
          width: 100%;
          padding: 0.72rem;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: transparent;
          color: #374151;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          margin-bottom: 0.6rem;
        }
        .lp-btn-ghost:hover:not(:disabled) {
          border-color: #6366f1;
          color: #6366f1;
          background: rgba(99,102,241,0.04);
        }
        .lp-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

        .lp-divider {
          display: flex; align-items: center; gap: 0.55rem;
          margin: 0.6rem 0;
          color: #9ca3af; font-size: 0.68rem;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .lp-divider::before, .lp-divider::after {
          content: ''; flex: 1; height: 1px; background: #e5e7eb;
        }

        .lp-resend {
          background: none; border: none;
          color: #6366f1; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; padding: 0;
          font-family: 'Outfit', sans-serif;
          transition: color 0.15s;
        }
        .lp-resend:hover:not(:disabled) { color: #4f46e5; text-decoration: underline; }
        .lp-resend:disabled { color: #9ca3af; cursor: default; }

        .lp-back {
          width: 100%; padding: 0.45rem; border: none;
          background: transparent; color: #9ca3af;
          font-family: 'Outfit', sans-serif; font-size: 0.76rem; font-weight: 500;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.35rem;
          transition: color 0.15s;
        }
        .lp-back:hover { color: #6366f1; }

        .lp-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 0.4rem; margin-top: 0.8rem;
          font-size: 0.67rem; color: #9ca3af; font-weight: 500;
        }

        .lp-footer {
          text-align: center; margin-top: 0.85rem;
          font-size: 0.78rem; color: #9ca3af;
        }
        .lp-footer a { color: #6366f1; font-weight: 700; text-decoration: none; }
        .lp-footer a:hover { color: #4f46e5; text-decoration: underline; }

        .lp-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* ── 2FA Modal ── */
        .lp-overlay {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
        }
        .lp-modal {
          background: #fff;
          border-radius: 22px;
          max-width: 380px; width: 100%;
          padding: 1.5rem;
          box-shadow: 0 20px 48px rgba(0,0,0,0.18);
          animation: lp-modal-in 0.22s cubic-bezier(0.34,1.3,0.64,1) both;
        }
        .lp-modal-head {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 1rem;
        }
        .lp-modal-icon {
          width: 44px; height: 44px; border-radius: 11px;
          background: rgba(99,102,241,0.1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lp-modal-title { font-size: 1rem; font-weight: 800; color: #111827; }
        .lp-modal-sub   { font-size: 0.75rem; color: #6b7280; margin-top: 2px; }
        .lp-2fa-input {
          width: 100%;
          padding: 0.9rem;
          text-align: center;
          font-size: 1.5rem;
          letter-spacing: 6px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          outline: none;
          margin-bottom: 1rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .lp-2fa-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .lp-modal-actions { display: flex; gap: 10px; }
        .lp-modal-cancel {
          flex: 1; padding: 0.72rem;
          border-radius: 11px;
          border: 1.5px solid #e5e7eb;
          background: transparent;
          color: #6b7280; font-weight: 600; font-size: 0.85rem;
          cursor: pointer; font-family: 'Outfit', sans-serif;
          transition: border-color 0.15s;
        }
        .lp-modal-cancel:hover { border-color: #d1d5db; }
        .lp-modal-verify {
          flex: 1; padding: 0.72rem;
          border-radius: 11px; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-weight: 700; font-size: 0.85rem;
          cursor: pointer; font-family: 'Outfit', sans-serif;
          transition: opacity 0.15s;
        }
        .lp-modal-verify:disabled { opacity: 0.5; cursor: not-allowed; }
        .lp-modal-verify:hover:not(:disabled) { opacity: 0.9; }

        @media (max-width: 480px) {
          .lp-card { padding: 1.5rem 1.25rem 1.4rem; border-radius: 20px; }
          .lp-panel { padding: 1rem; background: #fff; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-orb, .lp-hero { animation: none; }
          .lp-card { animation: none; }
        }
      `}</style>

      <div className="lp-page">

        {/* ── Left hero ── */}
        <div className="lp-hero">
          <div className="lp-orb" />
          <div className="lp-grid" />

          <div className="lp-hero-content">
            <p className="lp-hero-eyebrow">Welcome to Academe</p>
            <h1 className="lp-hero-title">
              Learn.<br />
              Connect.<br />
              <span>Grow.</span>
            </h1>
            <p className="lp-hero-sub">
              Your complete student ecosystem — academics, community, and campus life in one place.
            </p>

            <div className="lp-stats">
              <div className="lp-stat">
                <span className="lp-stat-val">15,000+</span>
                <span className="lp-stat-label">Students</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-val">20</span>
                <span className="lp-stat-label">Universities</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-val">95%</span>
                <span className="lp-stat-label">Satisfaction</span>
              </div>
            </div>

            {/* Feature ticker */}
            <div className={`lp-ticker ${featVisible ? 'visible' : 'hidden'}`}>
              <span className="lp-ticker-icon">{feat.icon}</span>
              <div>
                <div className="lp-ticker-title">{feat.title}</div>
                <div className="lp-ticker-desc">{feat.desc}</div>
              </div>
            </div>

            <div className="lp-ticker-dots">
              {FEATURES.map((_, i) => (
                <div
                  key={i}
                  className={`lp-ticker-dot${i === featIdx ? ' active' : ''}`}
                  style={{ width: i === featIdx ? 18 : 5 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="lp-panel">
          <div className="lp-card">

            {/* Brand */}
            <div className="lp-brand">
              <div className="lp-logo">
                <FiZap size={22} color="#fff" />
              </div>
              <div>
                <div className="lp-brand-name">Academe</div>
                <div className="lp-brand-sub">Your complete student ecosystem</div>
              </div>
            </div>

            {/* Step heading */}
            {authMethod === 'otp' && (
              <>
                {step === 'phone' ? (
                  <>
                    <div className="lp-card-title">Sign in with OTP</div>
                    <div className="lp-card-sub">No password needed – we use secure SMS.</div>
                  </>
                ) : (
                  <>
                    <div className="lp-card-title">Verify your number</div>
                    <div className="lp-card-sub">Code sent to <strong style={{ color: '#374151' }}>{phone}</strong></div>
                  </>
                )}
              </>
            )}
            {authMethod === 'face' && (
              <>
                <div className="lp-card-title">Face ID Login</div>
                <div className="lp-card-sub">Use your enrolled face to sign in.</div>
              </>
            )}
            {authMethod === 'password' && (
              <>
                <div className="lp-card-title">Password Login</div>
                <div className="lp-card-sub">Use your phone/admission number and password.</div>
              </>
            )}

            {/* Step dots only for OTP flow */}
            {authMethod === 'otp' && <StepDots step={step} />}

            {/* Offline */}
            {!isOnline && (
              <div className="lp-offline">
                <FiWifiOff size={13} /> You're offline — limited functionality
              </div>
            )}

            {/* ─── Auth method tabs ─── */}
            <AuthMethodTabs method={authMethod} onChange={setAuthMethod} />

            {/* ─── Render content based on selected method ─── */}
            {renderAuthContent()}

            {/* Trust */}
            <div className="lp-trust">
              <FiShield size={11} />
              End-to-end encrypted &nbsp;·&nbsp; No passwords stored
            </div>

            <div className="lp-footer">
              No account yet?{' '}
              <Link to="/signup">Create one free</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2FA Modal ── */}
      {show2FAModal && (
        <div className="lp-overlay">
          <div className="lp-modal">
            <div className="lp-modal-head">
              <div className="lp-modal-icon">
                <FiShield size={22} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <div className="lp-modal-title">Two-Factor Authentication</div>
                <div className="lp-modal-sub">Enter the code from your authenticator app</div>
              </div>
            </div>

            <input
              type="text"
              className="lp-2fa-input"
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && twoFactorCode.length === 6) handleVerify2FA(); }}
            />

            <div className="lp-modal-actions">
              <button
                className="lp-modal-cancel"
                onClick={() => { setShow2FAModal(false); setTwoFactorCode(''); }}
              >
                Cancel
              </button>
              <button
                className="lp-modal-verify"
                onClick={handleVerify2FA}
                disabled={verifying2FA || twoFactorCode.length < 6}
              >
                {verifying2FA ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}