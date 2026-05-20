import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { foundItemsApi } from '../api/foundItemsApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiHome, FiPackage, FiChevronRight,
  FiCheckCircle, FiShield, FiCreditCard, FiTruck,
  FiClock, FiAlertCircle, FiRefreshCw, FiDownload,
} from 'react-icons/fi';

const STEPS = [
  { key: 'claim', label: 'Claim', icon: FiPackage },
  { key: 'security', label: 'Verify', icon: FiShield },
  { key: 'evidence', label: 'Evidence', icon: FiCheckCircle },
  { key: 'payment', label: 'Payment', icon: FiCreditCard },
  { key: 'confirm', label: 'Receipt', icon: FiTruck },
  { key: 'done', label: 'Done', icon: FiCheckCircle },
];

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('claim');
  const [answer, setAnswer] = useState('');
  const [claimId, setClaimId] = useState(null);

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['found-item', id],
    queryFn: async () => {
      const response = await foundItemsApi.getItem(id);
      return response.data || response;
    },
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await foundItemsApi.claimItem(id);
      // apiClient returns axios response, so response.data is the API data
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Claim success data:', data);
      const cid = data.id;
      if (cid) {
        setClaimId(cid);
        toast.success('Claim submitted!');
        if (data.requires_security && item?.security_question) {
          setStep('security');
        } else if (data.requires_payment || item?.is_fee_required) {
          setStep('payment');
        } else {
          setStep('evidence');
        }
      } else {
        // Fallback: if no ID but success, proceed anyway
        toast.success('Claim submitted!');
        if (item?.is_fee_required) setStep('payment');
        else setStep('evidence');
      }
    },
    onError: (err) => {
      console.error('Claim error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to claim item';
      toast.error(errorMsg);
    },
  });

  const securityMutation = useMutation({
    mutationFn: async () => {
      if (!claimId) return;
      const response = await foundItemsApi.answerSecurity(claimId, answer);
      return response.data || response;
    },
    onSuccess: (data) => {
      if (data.correct) {
        toast.success('Security verified!');
        setStep('evidence');
      } else {
        toast.error(data.error || 'Incorrect answer');
      }
    },
    onError: () => toast.error('Verification failed'),
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      console.log('Submitting evidence for claimId:', claimId); // Debug
      if (!claimId) {
        throw new Error('No claim ID available');
      }
      const response = await foundItemsApi.submitEvidence(claimId);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Evidence success:', data); // Debug
      toast.success('Evidence submitted!');
      if (data.requires_payment || item?.is_fee_required) setStep('payment');
      else setStep('done');
    },
    onError: (err) => {
      console.error('Evidence error:', err); // Debug
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to submit evidence';
      toast.error(errorMsg);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!claimId) return;
      const response = await foundItemsApi.initiatePayment(claimId);
      return response.data || response;
    },
    onSuccess: () => {
      toast.success('Payment initiated! Check your phone for M-Pesa prompt.');
      setStep('confirm');
    },
    onError: () => toast.error('Payment failed'),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!claimId) return;
      const response = await foundItemsApi.confirmReceipt(claimId);
      return response.data || response;
    },
    onSuccess: () => {
      toast.success('Receipt confirmed! Thank you.');
      setStep('done');
    },
    onError: () => toast.error('Confirmation failed'),
  });

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto"><SkeletonLoader type="detail" /></div>
      </div>
    );
  }

  // Error / Not found
  if (isError || !item) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Item Not Found</h2>
          <p className="text-gray-500 mb-6">This item may have been removed or the link is invalid.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => refetch()} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2">
              <FiRefreshCw size={16} /> Try Again
            </button>
            <Link to="/found-items" className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
              Back to Items
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .cd-root { font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 20px 80px; animation: cdIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cdIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .cd-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .cd-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .cd-breadcrumb a:hover { text-decoration: underline; }

        .cd-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 28px; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
        .dark .cd-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .cd-item-info { padding: 14px; background: rgba(0,0,0,0.02); border-radius: 14px; margin-bottom: 24px; }
        .dark .cd-item-info { background: rgba(255,255,255,0.03); }
        .cd-item-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .dark .cd-item-title { color: #f8fafc; }
        .cd-item-meta { font-size: 0.8rem; color: #94a3b8; display: flex; gap: 12px; flex-wrap: wrap; }

        /* Progress */
        .cd-progress { display: flex; align-items: center; gap: 0; margin-bottom: 24px; }
        .cd-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
        .cd-step-circle { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: #e2e8f0; color: #94a3b8; transition: all 0.3s; z-index: 1; }
        .cd-step.active .cd-step-circle { background: #6366f1; color: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
        .cd-step.done .cd-step-circle { background: #10b981; color: #fff; }
        .cd-step-label { font-size: 0.6rem; font-weight: 700; color: #94a3b8; margin-top: 6px; text-align: center; }
        .cd-step.active .cd-step-label { color: #6366f1; }
        .cd-step.done .cd-step-label { color: #10b981; }
        .cd-step-line { flex: none; width: 100%; height: 2px; background: #e2e8f0; position: absolute; top: 18px; left: 50%; z-index: 0; }
        .cd-step:last-child .cd-step-line { display: none; }
        .cd-step.done .cd-step-line { background: #10b981; }

        /* Step content */
        .cd-step-content { padding: 20px 0; }
        .cd-step-content h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .dark .cd-step-content h3 { color: #f8fafc; }
        .cd-step-content p { color: #64748b; font-size: 0.9rem; margin-bottom: 16px; line-height: 1.6; }

        .cd-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.9); font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #0f172a; outline: none; margin-bottom: 12px; }
        .cd-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .dark .cd-input { background: rgba(15,23,42,0.9); border-color: #334155; color: #f8fafc; }

        .cd-btn { width: 100%; padding: 14px; border-radius: 14px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .cd-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); box-shadow: 0 6px 20px rgba(99,102,241,0.28); }
        .cd-btn-primary:hover { transform: translateY(-1px); }
        .cd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .cd-btn-green { background: linear-gradient(135deg, #10b981, #059669); }
        .cd-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .cd-btn-outline:hover { background: rgba(0,0,0,0.03); }

        .cd-done { text-align: center; padding: 30px 0; }
        .cd-done-icon { font-size: 4rem; margin-bottom: 16px; }
      `}</style>

      <div className="cd-root">
        {/* Breadcrumb */}
        <nav className="cd-breadcrumb">
          <Link to="/"><FiHome size={13} /> Home</Link>
          <FiChevronRight size={12} />
          <Link to="/found-items"><FiPackage size={13} /> Found Items</Link>
          <FiChevronRight size={12} />
          <span>Claim Item</span>
        </nav>

        <div className="cd-card">
          {/* Item Info */}
          <div className="cd-item-info">
            <h2 className="cd-item-title">{item?.title}</h2>
            <div className="cd-item-meta">
              <span>📂 {item?.category}</span>
              <span>📍 {item?.location_found}</span>
              {item?.is_fee_required && <span>💰 KES 100 Fee</span>}
            </div>
          </div>

          {/* Progress Steps */}
          {step !== 'done' && (
            <div className="cd-progress">
              {STEPS.filter(s => s.key !== 'done').map((s, i) => {
                const isActive = s.key === step;
                const isDone = currentStepIndex > i;
                const Icon = s.icon;
                return (
                  <div key={s.key} className={`cd-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                    <div className="cd-step-line" />
                    <div className="cd-step-circle">{isDone ? '✓' : <Icon size={14} />}</div>
                    <span className="cd-step-label">{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step: Claim */}
          {step === 'claim' && (
            <div className="cd-step-content">
              <h3>Claim This Item</h3>
              <p>By claiming, you confirm this item belongs to you. You may need to verify your identity and pay a recovery fee if applicable.</p>
              <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="cd-btn cd-btn-primary">
                {claimMutation.isPending ? 'Submitting...' : '✅ This is My Item — Start Claim'}
              </button>
              <button onClick={() => navigate('/found-items')} className="cd-btn cd-btn-outline" style={{ marginTop: 8 }}>
                Cancel
              </button>
            </div>
          )}

          {/* Step: Security */}
          {step === 'security' && (
            <div className="cd-step-content">
              <h3>🔐 Security Verification</h3>
              <p style={{ background: 'rgba(99,102,241,0.06)', padding: 12, borderRadius: 10, fontWeight: 500 }}>
                {item?.security_question}
              </p>
              <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer..." className="cd-input" />
              <button onClick={() => securityMutation.mutate()} disabled={securityMutation.isPending || !answer.trim()} className="cd-btn cd-btn-primary">
                {securityMutation.isPending ? 'Verifying...' : 'Submit Answer'}
              </button>
            </div>
          )}

          {/* Step: Evidence */}
          {step === 'evidence' && (
            <div className="cd-step-content">
              <h3>📎 Submit Evidence</h3>
              <p>Provide any evidence that proves this item belongs to you (photo of similar item, description of unique features, etc.).</p>
              <button onClick={() => evidenceMutation.mutate()} disabled={evidenceMutation.isPending} className="cd-btn cd-btn-primary">
                {evidenceMutation.isPending ? 'Submitting...' : 'Submit Evidence'}
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="cd-step-content">
              <h3>💳 Recovery Fee</h3>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#6366f1' }}>KES 100</p>
                <p style={{ color: '#94a3b8', marginBottom: 20 }}>M-Pesa payment will be prompted on your phone</p>
              </div>
              <button onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending} className="cd-btn cd-btn-green">
                {paymentMutation.isPending ? 'Processing...' : '💳 Pay KES 100 via M-Pesa'}
              </button>
            </div>
          )}

          {/* Step: Confirm Receipt */}
          {step === 'confirm' && (
            <div className="cd-step-content">
              <h3>📦 Confirm Receipt</h3>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                <p style={{ color: '#059669', fontWeight: 700, marginBottom: 8 }}>Payment Received!</p>
                <p>Click below once you have physically received your item.</p>
              </div>
              <button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} className="cd-btn cd-btn-green">
                {confirmMutation.isPending ? 'Confirming...' : '📦 I Have Received My Item'}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="cd-done">
              <div className="cd-done-icon">🎉</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>All Done!</h3>
              <p style={{ color: '#64748b', marginBottom: 24 }}>Your claim has been completed successfully.</p>
              <button onClick={() => navigate('/found-items')} className="cd-btn cd-btn-primary">
                Back to Found Items
              </button>
              <button onClick={() => navigate('/claims')} className="cd-btn cd-btn-outline" style={{ marginTop: 8 }}>
                View My Claims
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}