import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { foundItemsApi } from '../api/foundItemsApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiHome, FiPackage, FiChevronRight,
  FiCheckCircle, FiShield, FiCreditCard, FiTruck,
  FiClock, FiAlertCircle, FiRefreshCw,
  FiUploadCloud, FiX, FiAlertTriangle
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
  const [claimId, setClaimId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending' | 'completed' | 'failed' | 'timeout'
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);

  // Step persistence via sessionStorage
  useEffect(() => {
    if (claimId) {
      const savedStep = sessionStorage.getItem(`claim_${claimId}_step`);
      if (savedStep && STEPS.some(s => s.key === savedStep)) {
        setStep(savedStep);
      }
    }
  }, [claimId]);

  useEffect(() => {
    if (claimId && step) {
      sessionStorage.setItem(`claim_${claimId}_step`, step);
    }
  }, [claimId, step]);

  // Clean up evidence preview URL
  useEffect(() => {
    return () => {
      if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
    };
  }, [evidencePreviewUrl]);

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['found-item', id],
    queryFn: async () => {
      const response = await foundItemsApi.getItem(id);
      return response.data || response;
    },
    retry: false,
  });

  // ----- Claim Mutation -----
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await foundItemsApi.claimItem(id);
      return response.data;
    },
    onSuccess: (data) => {
      const cid = data.id;
      if (cid) setClaimId(cid);
      toast.success('Claim submitted!');
      if (data.requires_security && item?.security_question) {
        setStep('security');
      } else if (data.requires_payment || item?.is_fee_required) {
        setStep('payment');
      } else {
        setStep('evidence');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to start claim');
    },
  });

  // ----- Security Mutation -----
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

  // ----- Evidence Mutation -----
  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!claimId) throw new Error('No claim ID');
      const formData = new FormData();
      if (evidenceFile) formData.append('file', evidenceFile);
      formData.append('description', evidenceDescription);
      const response = await foundItemsApi.submitEvidence(claimId, formData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Evidence submitted!');
      if (data.requires_payment || item?.is_fee_required) setStep('payment');
      else setStep('done');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to submit evidence');
    },
  });

  // ----- Payment Initiation -----
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!claimId) return;
      const response = await foundItemsApi.initiatePayment(claimId, {
        phone: mpesaPhone.startsWith('254') ? mpesaPhone : `254${mpesaPhone}`,
      });
      return response.data || response;
    },
    onSuccess: (data) => {
      toast.success('STK Push sent! Check your phone.');
      setPaymentStatus('pending');
      if (data.checkout_request_id) {
        setCheckoutRequestId(data.checkout_request_id);
        pollPaymentStatus(data.checkout_request_id);
      }
    },
    onError: () => toast.error('Payment initiation failed'),
  });

  // ----- Payment Polling -----
  const pollPaymentStatus = async (checkoutReqId, attempts = 0) => {
    if (attempts >= 30) {
      setPaymentStatus('timeout');
      toast.error('Payment timed out. Try again.');
      return;
    }
    try {
      const result = await foundItemsApi.checkPaymentStatus(checkoutReqId);
      if (result.status === 'completed') {
        setPaymentStatus('completed');
        toast.success('Payment confirmed!');
        setStep('confirm');
      } else if (result.status === 'failed') {
        setPaymentStatus('failed');
        toast.error('Payment failed. Please try again.');
      } else {
        setTimeout(() => pollPaymentStatus(checkoutReqId, attempts + 1), 5000);
      }
    } catch (error) {
      setTimeout(() => pollPaymentStatus(checkoutReqId, attempts + 1), 5000);
    }
  };

  // ----- Confirm Receipt -----
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

  // ----- Cancel Claim -----
  const cancelClaim = async () => {
    if (!claimId) {
      navigate('/found-items');
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this claim? This action cannot be undone.')) return;
    try {
      await foundItemsApi.cancelClaim(claimId);
      sessionStorage.removeItem(`claim_${claimId}_step`);
      toast.success('Claim cancelled');
      navigate('/found-items');
    } catch (err) {
      toast.error('Failed to cancel claim');
    }
  };

  // ----- Helpers -----
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEvidenceFile(file);
    if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
    setEvidencePreviewUrl(URL.createObjectURL(file));
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === step);
  const isStepBefore = (key) => STEPS.findIndex(s => s.key === key) < currentStepIndex;

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <SkeletonLoader type="detail" /> {/* assuming this type works */}
        </div>
      </div>
    );
  }

  // Error state
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
    <main
      className="min-h-screen font-['Outfit'] py-8 px-4 bg-gray-50 dark:bg-gray-950 transition-colors"
      aria-label="Claim process"
    >
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            <FiHome size={13} /> Home
          </Link>
          <FiChevronRight size={12} />
          <Link to="/found-items" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            <FiPackage size={13} /> Found Items
          </Link>
          <FiChevronRight size={12} />
          <span className="text-gray-600 dark:text-gray-300">Claim Item</span>
        </nav>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/20 backdrop-blur-sm">
          {/* Item Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
              {item.title}
            </h2>
            <div className="flex gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 flex-wrap">
              <span>📂 {item.category}</span>
              <span>📍 {item.location_found}</span>
              {item.is_fee_required && (
                <span className="text-indigo-600 dark:text-indigo-400">💰 KES 100 Fee</span>
              )}
            </div>
          </div>

          {/* Progress Steps (not shown on 'done') */}
          {step !== 'done' && (
            <div className="flex items-center mb-8" role="progressbar" aria-valuenow={currentStepIndex} aria-valuemin="0" aria-valuemax={STEPS.length - 2}>
              {STEPS.filter(s => s.key !== 'done').map((s, i) => {
                const isActive = s.key === step;
                const isCompleted = isStepBefore(s.key);
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex-1 relative flex flex-col items-center">
                    {i !== 0 && (
                      <div
                        className={`absolute top-5 left-0 w-full h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        style={{ left: '-50%', width: '100%' }}
                      />
                    )}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                    >
                      {isCompleted ? '✓' : <Icon size={15} />}
                    </div>
                    <span className={`mt-1.5 text-[0.65rem] font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                      }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step: Claim */}
          {step === 'claim' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Claim This Item</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                By continuing, you confirm that this item belongs to you. You may need to verify your identity and pay a recovery fee if applicable.
              </p>
              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Start claim process"
              >
                {claimMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={16} /> Submitting...
                  </>
                ) : (
                  '✅ This is My Item — Start Claim'
                )}
              </button>
              {claimMutation.isError && (
                <button
                  onClick={() => claimMutation.reset()}
                  className="mt-3 w-full py-2.5 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle size={14} /> Something went wrong — Tap to retry
                </button>
              )}
              <button
                onClick={() => cancelClaim()}
                className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Step: Security */}
          {step === 'security' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">🔐 Security Verification</h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg font-medium mb-4">
                {item.security_question}
              </p>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition mb-4"
                aria-label="Security answer"
              />
              <button
                onClick={() => securityMutation.mutate()}
                disabled={securityMutation.isPending || !answer.trim()}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {securityMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={16} /> Verifying...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
              {securityMutation.isError && (
                <button
                  onClick={() => securityMutation.reset()}
                  className="mt-3 w-full py-2.5 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle size={14} /> Verification failed — Tap to retry
                </button>
              )}
              <button
                onClick={() => cancelClaim()}
                className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel Claim
              </button>
            </div>
          )}

          {/* Step: Evidence */}
          {step === 'evidence' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">📎 Submit Evidence</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                Upload a photo or document that proves this item belongs to you. A detailed description helps.
              </p>

              {/* File upload */}
              <label
                htmlFor="evidence-upload"
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 block ${evidenceFile
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                  }`}
              >
                <input
                  type="file"
                  id="evidence-upload"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload evidence file"
                />
                {evidenceFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                      <FiCheckCircle size={18} /> {evidenceFile.name}
                    </div>
                    {evidencePreviewUrl && evidenceFile.type.startsWith('image/') && (
                      <img
                        src={evidencePreviewUrl}
                        alt="Evidence preview"
                        className="max-h-40 mx-auto rounded-lg shadow"
                      />
                    )}
                    {!evidenceFile.type.startsWith('image/') && (
                      <p className="text-sm text-green-600">File ready (non-image).</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500">
                    <FiUploadCloud size={32} className="mx-auto mb-2" />
                    <span className="font-semibold">Click to upload</span> or drag and drop
                    <p className="text-xs mt-1">PNG, JPG, PDF up to 10MB</p>
                  </div>
                )}
              </label>

              {/* Description */}
              <textarea
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Describe why this item is yours (e.g., unique marks, where you lost it)..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition mb-4"
                aria-label="Evidence description"
              />

              <button
                onClick={() => evidenceMutation.mutate()}
                disabled={evidenceMutation.isPending || !evidenceFile}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {evidenceMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={16} /> Submitting...
                  </>
                ) : (
                  'Submit Evidence'
                )}
              </button>
              {evidenceMutation.isError && (
                <button
                  onClick={() => evidenceMutation.reset()}
                  className="mt-3 w-full py-2.5 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle size={14} /> Submission failed — Tap to retry
                </button>
              )}
              <button
                onClick={() => cancelClaim()}
                className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel Claim
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">💳 Recovery Fee</h3>
              <div className="text-center py-4">
                <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">KES 100</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Enter your M‑Pesa phone number to pay</p>

                {/* Phone input */}
                <div className="flex items-center gap-2 max-w-xs mx-auto mb-6">
                  <span className="text-gray-400 font-semibold">+254</span>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      if (cleaned.length <= 9) setMpesaPhone(cleaned);
                    }}
                    placeholder="712345678"
                    maxLength={9}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    aria-label="M-Pesa phone number"
                  />
                </div>

                {/* Payment status UI */}
                {paymentStatus === 'pending' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
                    <FiClock size={16} /> Waiting for M‑Pesa confirmation...
                  </div>
                )}
                {paymentStatus === 'completed' && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl mb-4 text-green-700 dark:text-green-300 text-sm">
                    Payment successful!
                  </div>
                )}
                {paymentStatus === 'failed' && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 text-red-700 dark:text-red-300 text-sm">
                    Payment failed. Please try again.
                  </div>
                )}
                {paymentStatus === 'timeout' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl mb-4 text-orange-700 dark:text-orange-300 text-sm">
                    Payment timed out. Please retry.
                  </div>
                )}
              </div>

              {paymentStatus !== 'completed' && (
                <button
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending || mpesaPhone.length < 9}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-green-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={16} /> Processing...
                    </>
                  ) : (
                    '💳 Pay KES 100 via M‑Pesa'
                  )}
                </button>
              )}
              {paymentMutation.isError && (
                <button
                  onClick={() => paymentMutation.reset()}
                  className="mt-3 w-full py-2.5 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle size={14} /> Payment initiation failed — Tap to retry
                </button>
              )}
              <button
                onClick={() => cancelClaim()}
                className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel Claim
              </button>
            </div>
          )}

          {/* Step: Confirm Receipt */}
          {step === 'confirm' && (
            <div className="py-4 text-center">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">📦 Confirm Receipt</h3>
              <div className="text-5xl mb-3">✅</div>
              <p className="text-green-600 dark:text-green-400 font-bold mb-2">Payment Received!</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Click below once you have physically collected your item. This completes the claim.
              </p>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-green-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {confirmMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={16} /> Confirming...
                  </>
                ) : (
                  '📦 I Have Received My Item'
                )}
              </button>
              {confirmMutation.isError && (
                <button
                  onClick={() => confirmMutation.reset()}
                  className="mt-3 w-full py-2.5 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center justify-center gap-2"
                >
                  <FiAlertTriangle size={14} /> Confirmation failed — Tap to retry
                </button>
              )}
              <button
                onClick={() => cancelClaim()}
                className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel Claim
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="py-8 text-center animate-fadeIn">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">All Done!</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Your claim has been completed successfully. Thank you!</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Link
                  to="/found-items"
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-center"
                >
                  Back to Found Items
                </Link>
                <Link
                  to="/claims"
                  className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                >
                  View My Claims
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Timeline & Support */}
        {step !== 'done' && (
          <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600 space-y-1">
            <p>⏱️ Estimated time: 5–10 minutes</p>
            <p>
              Need help?{' '}
              <Link to="/support" className="text-indigo-500 dark:text-indigo-400 underline hover:no-underline">
                Contact Support
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}