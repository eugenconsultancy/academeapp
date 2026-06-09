import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FiZap, FiPhone, FiArrowRight, FiArrowLeft,
  FiWifiOff, FiCamera, FiBookOpen, FiUsers,
  FiTrendingUp,
} from 'react-icons/fi';

// ------------------------------------------------------------
// Camera capture helper (used for biometric login)
// ------------------------------------------------------------
async function captureImageFromCamera() {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.zIndex = '9999';
    video.style.background = '#000';
    document.body.appendChild(video);

    const captureBtn = document.createElement('button');
    captureBtn.innerText = 'Capture Face';
    captureBtn.style.position = 'fixed';
    captureBtn.style.bottom = '30px';
    captureBtn.style.left = '50%';
    captureBtn.style.transform = 'translateX(-50%)';
    captureBtn.style.zIndex = '10000';
    captureBtn.style.padding = '12px 32px';
    captureBtn.style.borderRadius = '999px';
    captureBtn.style.background = '#6366f1';
    captureBtn.style.color = '#fff';
    captureBtn.style.border = 'none';
    captureBtn.style.fontSize = '1rem';
    captureBtn.style.fontWeight = '600';
    captureBtn.style.cursor = 'pointer';
    document.body.appendChild(captureBtn);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Cancel';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.background = 'rgba(255,255,255,0.2)';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    document.body.appendChild(closeBtn);

    let stream = null;

    const cleanup = () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (video.parentNode) video.parentNode.removeChild(video);
      if (captureBtn.parentNode) captureBtn.parentNode.removeChild(captureBtn);
      if (closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
    };

    const handleCapture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      cleanup();
      resolve(base64);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    captureBtn.addEventListener('click', handleCapture);
    closeBtn.addEventListener('click', handleCancel);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        video.play().catch(() => {
          cleanup();
          reject(new Error('Unable to start camera'));
        });
      })
      .catch((err) => {
        cleanup();
        reject(err);
      });
  });
}

// ------------------------------------------------------------
// Login Page Component
// ------------------------------------------------------------
export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { login, biometricLogin } = useAuth();
  const navigate = useNavigate();
  const otpRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const requestOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      // ✅ No /api/ prefix – baseURL already provides it
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setStep('otp');
      setResendTimer(30);
      toast.success('OTP sent to your phone');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, otp);
      toast.success('Welcome back! 🎉');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter your phone number first');
      return;
    }

    setLoading(true);
    try {
      const base64Image = await captureImageFromCamera();

      if (!base64Image) {
        toast('Biometric login cancelled', { icon: '📷' });
        setLoading(false);
        return;
      }

      await biometricLogin(phone, base64Image);
      toast.success('Biometric login successful! ✨');
      navigate('/');
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access.');
      } else {
        toast.error(error.response?.data?.error || error.message || 'Biometric authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 0 35px rgba(99,102,241,0.5), 0 0 80px rgba(139,92,246,0.2); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .login-page-wrapper {
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
          animation: gradient-shift 15s ease infinite;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
        }
        .login-bg-orb-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: float 8s ease-in-out infinite;
        }
        .login-bg-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: float 10s ease-in-out infinite reverse;
        }
        .login-bg-orb-3 {
          width: 250px; height: 250px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: float 12s ease-in-out infinite;
          opacity: 0.15;
        }

        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 28px;
          padding: 2.5rem 2rem;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .dark .login-card {
          background: rgba(15,15,30,0.92);
          border-color: rgba(255,255,255,0.08);
        }

        .login-brand {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .login-logo-mark {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          animation: pulse-glow 3s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(99,102,241,0.4);
        }
        .login-logo-mark svg {
          color: white;
          width: 28px;
          height: 28px;
        }
        .login-brand-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.25rem;
        }
        .login-tagline {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.5;
        }
        .login-tagline-highlight {
          color: #6366f1;
          font-weight: 600;
        }

        .dark .login-tagline {
          color: #9ca3af;
        }
        .dark .login-tagline-highlight {
          color: #818cf8;
        }

        .login-features {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        .login-feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 600;
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          border: 1px solid rgba(99,102,241,0.15);
        }
        .dark .login-feature-pill {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.2);
          color: #a5b4fc;
        }

        .login-form-group {
          margin-bottom: 1rem;
        }
        .login-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
        }
        .dark .login-label {
          color: #d1d5db;
        }
        .login-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 14px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #111827;
          outline: none;
          transition: all 0.2s ease;
        }
        .login-input:focus {
          border-color: #3e40b3;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
          background: white;
        }
        .login-input::placeholder {
          color: #576d92;
        }
        .login-input-icon {
          position: relative;
        }
        .login-input-icon svg {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          z-index: 1;
        }
        .login-input-icon input {
          padding-left: 2.6rem;
        }
        .dark .login-input {
          background: rgba(30,30,50,0.8);
          border-color: rgba(255,255,255,0.1);
          color: #f3f4f6;
        }
        .dark .login-input:focus {
          background: rgba(40,40,60,0.9);
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(129,140,248,0.15);
        }

        .login-otp-input {
          text-align: center;
          font-size: 1.5rem;
          letter-spacing: 0.6em;
          font-weight: 700;
          padding: 0.9rem 0.5rem;
        }

        .login-btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
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
        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.45);
        }
        .login-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-secondary {
          width: 100%;
          padding: 0.75rem;
          border-radius: 14px;
          border: 1.5px solid rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.04);
          color: #6366f1;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .login-btn-secondary:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.5);
        }
        .dark .login-btn-secondary {
          color: #a5b4fc;
          border-color: rgba(129,140,248,0.3);
          background: rgba(129,140,248,0.06);
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .dark .login-divider::before,
        .dark .login-divider::after {
          background: rgba(255,255,255,0.1);
        }

        .login-footer {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.82rem;
          color: #6b7280;
        }
        .login-footer a {
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-footer a:hover {
          color: #4f46e5;
          text-decoration: underline;
        }
        .dark .login-footer {
          color: #9ca3af;
        }
        .dark .login-footer a {
          color: #818cf8;
        }

        .login-offline-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.25);
          color: #d97706;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .login-resend-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }
        .login-resend-btn:hover:not(:disabled) {
          color: #4f46e5;
          text-decoration: underline;
        }
        .login-resend-btn:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .login-back-btn {
          width: 100%;
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: #6b7280;
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: color 0.15s;
          margin-top: 0.25rem;
        }
        .login-back-btn:hover {
          color: #6366f1;
        }
        .dark .login-back-btn {
          color: #9ca3af;
        }
      `}</style>

      <div className="login-page-wrapper">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />

        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo-mark">
              <FiZap size={28} />
            </div>
            <h1 className="login-brand-name">Academe</h1>
            <p className="login-tagline">
              Where <span className="login-tagline-highlight">education</span> meets{' '}
              <span className="login-tagline-highlight">innovation</span>
            </p>
            <p className="login-tagline" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Your all-in-one campus companion — announcements, classes, opportunities & more.
            </p>
            <div className="login-features">
              <span className="login-feature-pill"><FiBookOpen size={11} /> Academics</span>
              <span className="login-feature-pill"><FiUsers size={11} /> Community</span>
              <span className="login-feature-pill"><FiTrendingUp size={11} /> Growth</span>
            </div>
          </div>

          {!isOnline && (
            <div className="login-offline-banner">
              <FiWifiOff size={16} /> You're offline — limited functionality
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={requestOTP}>
              <div className="login-form-group">
                <label className="login-label">Phone Number</label>
                <div className="login-input-icon">
                  <FiPhone size={16} />
                  <input
                    type="tel"
                    className="login-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : (
                  <>Get OTP <FiArrowRight size={18} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              <div className="login-form-group">
                <label className="login-label">
                  Enter OTP Code
                  {resendTimer > 0 && (
                    <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontWeight: 400 }}>
                      ({resendTimer}s)
                    </span>
                  )}
                </label>
                <input
                  ref={otpRef}
                  className="login-input login-otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="login-resend-btn"
                    disabled={resendTimer > 0}
                    onClick={requestOTP}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="login-divider">or continue with</div>

              <button
                type="button"
                className="login-btn-secondary"
                onClick={handleBiometricLogin}
                disabled={loading}
              >
                <FiCamera size={18} /> Face ID
              </button>

              <button
                type="button"
                className="login-back-btn"
                onClick={() => setStep('phone')}
              >
                <FiArrowLeft size={14} /> Change phone number
              </button>
            </form>
          )}

          <div className="login-footer">
            Don't have an account?{' '}
            <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </>
  );
}