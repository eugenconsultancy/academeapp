import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foundItemsApi } from '../api/foundItemsApi';
import { FoundItemImage } from '../components/shared/BlurredImage';
import { useImageBlur } from '../hooks/useImageBlur';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiHome, FiPackage, FiChevronRight,
  FiCheckCircle, FiShield, FiCreditCard, FiTruck,
  FiClock, FiAlertCircle, FiRefreshCw,
  FiUploadCloud, FiX, FiAlertTriangle, FiEye
} from 'react-icons/fi';

const STEPS = [
  { key: 'claim', label: 'Claim', icon: FiPackage },
  { key: 'security', label: 'Security', icon: FiShield },
  { key: 'evidence', label: 'Evidence', icon: FiCheckCircle },
  { key: 'payment', label: 'Payment', icon: FiCreditCard },
  { key: 'confirm', label: 'Receipt', icon: FiTruck },
  { key: 'done', label: 'Done', icon: FiCheckCircle },
];

export default function ClaimDetail() {
  const { id: itemId } = useParams();  // item ID
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState('claim');
  const [claimId, setClaimId] = useState(null);
  const [claimData, setClaimData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [paymentPolling, setPaymentPolling] = useState(false);

  // Fetch item for display
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['found-item', itemId],
    queryFn: async () => {
      const res = await foundItemsApi.getItem(itemId);
      return res.data || res;
    },
  });

  // On mount, check if a claim already exists (resume)
  useEffect(() => {
    (async () => {
      try {
        const res = await foundItemsApi.getClaimStatus(itemId);
        const data = res.data || res;
        if (data.claim_id) {
          setClaimId(data.claim_id);
          setStep(data.next_step);
          if (data.next_step === 'claim') setStep('claim');
          if (data.next_step === 'security') setStep('security');
          if (data.next_step === 'evidence') setStep('evidence');
          if (data.next_step === 'payment') setStep('payment');
          if (data.next_step === 'confirm') setStep('confirm');
          if (data.next_step === 'done') setStep('done');
        }
      } catch (e) { /* no claim yet */ }
    })();
  }, [itemId]);

  const { status: blurStatus } = useImageBlur(itemId, { interval: 5000 });

  // ── Mutations ──
  const claimMutation = useMutation({
    mutationFn: () => foundItemsApi.claimItem(itemId),
    onSuccess: (res) => {
      const data = res.data || res;
      setClaimId(data.id);
      setClaimData(data);
      if (data.requires_security) setStep('security');
      else if (data.requires_payment) setStep('payment');
      else setStep('evidence');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start claim'),
  });

  const securityMutation = useMutation({
    mutationFn: () => foundItemsApi.answerSecurity(claimId, answer),
    onSuccess: (res) => {
      const data = res.data || res;
      if (data.correct) {
        toast.success('Security verified!');
        setStep('evidence');
      } else {
        toast.error(data.error || 'Incorrect answer');
        if (data.attempts_left !== undefined && data.attempts_left <= 0) {
          navigate('/found-items');
        }
      }
    },
    onError: () => toast.error('Verification failed'),
  });

  const evidenceMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      if (evidenceFile) formData.append('file', evidenceFile);
      formData.append('description', evidenceDescription);
      return foundItemsApi.submitEvidence(claimId, formData);
    },
    onSuccess: (res) => {
      toast.success('Evidence submitted!');
      if (item?.is_fee_required) setStep('payment');
      else setStep('confirm');
    },
    onError: () => toast.error('Failed to submit evidence'),
  });

  const paymentMutation = useMutation({
    mutationFn: () => foundItemsApi.initiatePayment(claimId),
    onSuccess: (res) => {
      toast.success('STK Push sent. Check your phone.');
      setStep('payment');
      setPaymentPolling(true);
      pollPaymentStatus();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment initiation failed'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => foundItemsApi.confirmReceipt(claimId),
    onSuccess: () => {
      toast.success('Receipt confirmed!');
      setStep('done');
    },
    onError: () => toast.error('Confirmation failed'),
  });

  const cancelClaim = async () => {
    if (!claimId) { navigate('/found-items'); return; }
    if (!window.confirm('Cancel this claim?')) return;
    try {
      await foundItemsApi.cancelClaim(claimId);
      toast.success('Claim cancelled');
      navigate('/found-items');
    } catch { toast.error('Failed to cancel'); }
  };

  // Payment polling (by claimId)
  const pollPaymentStatus = async (attempt = 0) => {
    if (attempt > 30) { toast.error('Payment timeout'); setPaymentPolling(false); return; }
    try {
      const res = await foundItemsApi.checkPaymentStatus(claimId);
      const data = res.data || res;
      if (data.status === 'completed') {
        toast.success('Payment confirmed!');
        setPaymentPolling(false);
        setStep('confirm');
      } else {
        setTimeout(() => pollPaymentStatus(attempt + 1), 4000);
      }
    } catch {
      setTimeout(() => pollPaymentStatus(attempt + 1), 4000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEvidenceFile(file);
    if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
    setEvidencePreviewUrl(URL.createObjectURL(file));
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  if (isLoading) return <div className="min-h-screen py-8 px-4"><div className="max-w-2xl mx-auto"><SkeletonLoader type="detail" /></div></div>;
  if (isError || !item) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6"><FiAlertCircle className="w-10 h-10 text-red-500" /></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Item Not Found</h2>
          <Link to="/found-items" className="text-blue-500 hover:underline">Back to Items</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen font-['Outfit'] py-8 px-4 bg-gray-50 dark:bg-gray-950 transition-colors" aria-label="Claim process">
      <div className="max-w-2xl mx-auto">
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-6 flex-wrap">
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"><FiHome size={13} /> Home</Link>
          <FiChevronRight size={12} />
          <Link to="/found-items" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"><FiPackage size={13} /> Found Items</Link>
          <FiChevronRight size={12} />
          <span className="text-gray-600 dark:text-gray-300">Claim</span>
        </nav>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/20 backdrop-blur-sm">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">{item.title}</h2>
            <div className="flex gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 flex-wrap">
              <span>📂 {item.category}</span>
              <span>📍 {item.location_found}</span>
              {item.is_fee_required && <span className="text-indigo-600 dark:text-indigo-400">💰 KES 100 Fee</span>}
            </div>
          </div>

          {item.blurred_image_url && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ maxHeight: '200px' }}>
              <FoundItemImage src={item.blurred_image_url} alt={item.title} />
            </div>
          )}

          {step !== 'done' && (
            <div className="flex items-center mb-8" role="progressbar" aria-valuenow={currentStepIndex}>
              {STEPS.filter(s => s.key !== 'done').map((s, i) => {
                const isActive = s.key === step;
                const isCompleted = i < currentStepIndex;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex-1 relative flex flex-col items-center">
                    {i !== 0 && (
                      <div className={`absolute top-5 left-0 w-full h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ left: '-50%', width: '100%' }} />
                    )}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      {isCompleted ? '✓' : <Icon size={15} />}
                    </div>
                    <span className={`mt-1.5 text-[0.65rem] font-bold ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step: Claim */}
          {step === 'claim' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Claim This Item</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">By continuing, you confirm that this item belongs to you.</p>
              <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {claimMutation.isPending ? <><FiRefreshCw className="animate-spin" size={16} /> Submitting...</> : '✅ This is My Item — Start Claim'}
              </button>
              <button onClick={cancelClaim} className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </div>
          )}

          {/* Step: Security */}
          {step === 'security' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">🔐 Security Verification</h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg font-medium mb-4">{item.security_question}</p>
              <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none mb-4" />
              <button onClick={() => securityMutation.mutate()} disabled={securityMutation.isPending || !answer.trim()}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {securityMutation.isPending ? <FiRefreshCw className="animate-spin" size={16} /> : 'Submit Answer'}
              </button>
              <button onClick={cancelClaim} className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel Claim</button>
            </div>
          )}

          {/* Step: Evidence */}
          {step === 'evidence' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">📎 Submit Evidence</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Upload a photo or document proving ownership.</p>
              <label htmlFor="evidence-upload" className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 block ${evidenceFile ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>
                <input type="file" id="evidence-upload" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                {evidenceFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-semibold"><FiCheckCircle size={18} /> {evidenceFile.name}</div>
                    {evidencePreviewUrl && evidenceFile.type.startsWith('image/') && <img src={evidencePreviewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow" />}
                  </div>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500"><FiUploadCloud size={32} className="mx-auto mb-2" /><span className="font-semibold">Click to upload</span></div>
                )}
              </label>
              <textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="Describe why this item is yours..." rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none mb-4" />
              <button onClick={() => evidenceMutation.mutate()} disabled={evidenceMutation.isPending || !evidenceFile}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {evidenceMutation.isPending ? <FiRefreshCw className="animate-spin" size={16} /> : 'Submit Evidence'}
              </button>
              <button onClick={cancelClaim} className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel Claim</button>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="py-4">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">💳 Recovery Fee</h3>
              <div className="text-center py-4">
                <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">KES 100</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Pay via M‑Pesa</p>
                {paymentPolling && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
                    <FiClock size={16} /> Waiting for M‑Pesa confirmation...
                  </div>
                )}
                {!paymentPolling && (
                  <button onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {paymentMutation.isPending ? <FiRefreshCw className="animate-spin" size={16} /> : '💳 Pay KES 100 via M‑Pesa'}
                  </button>
                )}
              </div>
              <button onClick={cancelClaim} className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel Claim</button>
            </div>
          )}

          {/* Step: Confirm Receipt */}
          {step === 'confirm' && (
            <div className="py-4 text-center">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">📦 Confirm Receipt</h3>
              <div className="text-5xl mb-3">✅</div>
              <p className="text-green-600 dark:text-green-400 font-bold mb-2">Payment Received!</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Click once you have collected the item.</p>
              <button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmMutation.isPending ? <FiRefreshCw className="animate-spin" size={16} /> : '📦 I Have Received My Item'}
              </button>
              <button onClick={cancelClaim} className="mt-3 w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel Claim</button>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">All Done!</h3>
              <Link to="/found-items" className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg inline-block">Back to Found Items</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}