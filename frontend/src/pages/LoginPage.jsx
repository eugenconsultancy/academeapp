import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FiZap, FiPhone, FiLock, FiArrowRight, FiArrowLeft,
  FiShield, FiUsers, FiRefreshCw, FiWifi, FiWifiOff,
} from 'react-icons/fi';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { login } = useAuth();
  const navigate = useNavigate();
  const otpRef = useRef(null);

  // Online/offline detection
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

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp' && otpRef.current) {
      otpRef.current.focus();
    }
  }, [step]);

  const requestOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!isOnline) {
      toast.error('You are offline. Please check your connection.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setStep('otp');
      setResendTimer(30);
      toast.success('OTP sent to your phone');
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await login(phone, otp);
      toast.success('Welcome back! 🎉');
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.error || 'Invalid OTP. Please try again.';
      toast.error(msg);
      setOtp('');
      if (otpRef.current) otpRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    try {
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setResendTimer(30);
      toast.success('OTP resent!');
      setOtp('');
      if (otpRef.current) otpRef.current.focus();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');

        .login-container {
          font-family: 'Sora', sans-serif;
          width: 100%;
          max-width: 440px;
          animation: loginFadeIn 0.6s ease both;
        }
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 28px;
          padding: 40px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        }
        .dark .login-card {
          background: rgba(17,17,34,0.85);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        .login-logo {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.35);
        }
        .login-logo svg { color: white; width: 28px; height: 28px; }

        .login-title {
          font-size: 1.6rem; font-weight: 800; text-align: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 4px;
        }
        .login-subtitle {
          text-align: center; font-size: 0.85rem; color: #9ca3af; margin-bottom: 32px;
        }

        .login-steps {
          display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px;
        }
        .login-step-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #e5e7eb; transition: all .3s;
        }
        .dark .login-step-dot { background: #374151; }
        .login-step-dot.active {
          background: #6366f1; box-shadow: 0 0 8px rgba(99,102,241,.4);
          transform: scale(1.3);
        }
        .login-step-line {
          width: 32px; height: 2px; background: #e5e7eb; border-radius: 1px;
        }
        .dark .login-step-line { background: #374151; }
        .login-step-line.done { background: #6366f1; }

        .login-input-group { margin-bottom: 20px; }
        .login-label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 8px; letter-spacing: 0.02em; }
        .dark .login-label { color: #d1d5db; }
        .login-input-wrapper { position: relative; }
        .login-input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
        .login-input {
          width: 100%; padding: 14px 16px 14px 46px;
          border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.6);
          font-size: 0.95rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all .2s; color: #1f2937;
        }
        .dark .login-input { background: rgba(30,30,50,0.6); border-color: rgba(255,255,255,0.08); color: #f3f4f6; }
        .login-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .login-input.otp-input {
          text-align: center; font-size: 1.5rem; letter-spacing: 0.5em;
          padding-left: 16px; font-weight: 700;
        }

        .login-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          transition: all .25s; font-family: 'Sora', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .login-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
        .login-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
        .login-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .login-btn-ghost { background: transparent; color: #6366f1; font-size: 0.85rem; margin-top: 12px; }
        .login-btn-ghost:hover { background: rgba(99,102,241,0.06); }
        .login-btn-resend { background: transparent; color: #6366f1; font-size: 0.82rem; padding: 8px; margin-top: 4px; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-weight: 600; }
        .login-btn-resend:disabled { color: #9ca3af; cursor: not-allowed; }

        .login-footer { text-align: center; margin-top: 24px; font-size: 0.85rem; color: #6b7280; }
        .dark .login-footer { color: #9ca3af; }
        .login-footer a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .login-footer a:hover { text-decoration: underline; }

        .login-features { display: flex; justify-content: center; gap: 16px; margin-top: 20px; font-size: 0.7rem; color: #9ca3af; }
        .login-features span { display: flex; align-items: center; gap: 4px; }

        .login-offline-banner {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px; margin-bottom: 16px;
          background: #fef3c7; color: #92400e; font-size: 0.78rem; font-weight: 600;
        }
        .dark .login-offline-banner { background: rgba(251,191,36,0.1); color: #fbbf24; }

        .login-forgot-link { display: block; text-align: center; font-size: 0.82rem; color: #6366f1; text-decoration: none; font-weight: 600; margin-top: 8px; }
        .login-forgot-link:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .login-card { padding: 28px 20px; border-radius: 24px; }
        }
      `}</style>

      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <FiZap />
          </div>
          <h1 className="login-title">Academe</h1>
          <p className="login-subtitle">Student Ecosystem</p>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="login-offline-banner">
              <FiWifiOff size={14} /> You are offline — check your connection
            </div>
          )}

          {/* Step Indicator */}
          <div className="login-steps">
            <div className={`login-step-dot ${step === 'phone' ? 'active' : ''}`} />
            <div className={`login-step-line ${step === 'otp' ? 'done' : ''}`} />
            <div className={`login-step-dot ${step === 'otp' ? 'active' : ''}`} />
          </div>

          {step === 'phone' ? (
            <form onSubmit={requestOTP}>
              <div className="login-input-group">
                <label className="login-label">Phone Number</label>
                <div className="login-input-wrapper">
                  <FiPhone size={18} className="login-input-icon" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="login-input"
                    autoFocus
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || !isOnline} className="login-btn login-btn-primary">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Get OTP <FiArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              <div className="login-input-group">
                <label className="login-label">Enter OTP Code</label>
                <div className="login-input-wrapper">
                  <FiLock size={18} className="login-input-icon" />
                  <input
                    ref={otpRef}
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    className="login-input otp-input"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Sent to {phone}
                </p>
              </div>

              <button type="submit" disabled={loading} className="login-btn login-btn-primary">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Login <FiArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend OTP */}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0 || loading}
                className="login-btn-resend"
              >
                {resendTimer > 0 ? (
                  <>Resend OTP in {resendTimer}s</>
                ) : (
                  <><FiRefreshCw size={12} /> Resend OTP</>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                className="login-btn login-btn-ghost"
              >
                <FiArrowLeft size={14} /> Change phone number
              </button>
            </form>
          )}

          {/* Forgot Password Link */}
          <Link to="/forgot-password" className="login-forgot-link">
            Forgot your password?
          </Link>

          {/* Footer */}
          <p className="login-footer">
            Don't have an account?{' '}
            <Link to="/signup">Create one</Link>
          </p>

          {/* Trust badges */}
          <div className="login-features">
            <span><FiShield size={10} /> Secure</span>
            <span><FiUsers size={10} /> 5,000+ Students</span>
            <span><FiZap size={10} /> Fast</span>
          </div>
        </div>
      </div>
    </div>
  );
}