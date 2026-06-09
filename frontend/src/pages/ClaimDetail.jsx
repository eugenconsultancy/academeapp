import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { foundItemsApi } from '../api/foundItemsApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import {
  FiPackage, FiClock, FiCheckCircle, FiXCircle, FiDollarSign,
  FiChevronRight, FiRefreshCw, FiAlertCircle, FiHome,
  FiInbox, FiEye, FiArrowLeft, FiShield, FiUpload,
  FiCreditCard, FiCheck, FiX, FiInfo, FiAlertTriangle,
} from 'react-icons/fi';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  security_verified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  evidence_submitted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  awaiting_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  payment_received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  claimed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_ICONS = {
  pending: FiClock,
  security_verified: FiCheckCircle,
  evidence_submitted: FiEye,
  awaiting_payment: FiDollarSign,
  payment_received: FiDollarSign,
  claimed: FiCheckCircle,
  rejected: FiXCircle,
  cancelled: FiXCircle,
};

const STEPS = [
  { key: 'pending', label: 'Claim Submitted', icon: FiClock },
  { key: 'security_verified', label: 'Security Verified', icon: FiShield },
  { key: 'evidence_submitted', label: 'Evidence Submitted', icon: FiUpload },
  { key: 'awaiting_payment', label: 'Payment', icon: FiCreditCard },
  { key: 'payment_received', label: 'Payment Confirmed', icon: FiDollarSign },
  { key: 'claimed', label: 'Item Received', icon: FiCheck },
];

function safeFormatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
}

export default function ClaimDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Security answer state
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityAttempts, setSecurityAttempts] = useState(0);
  const [showSecurityForm, setShowSecurityForm] = useState(false);

  // Evidence state
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentChecking, setPaymentChecking] = useState(false);

  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchClaimStatus();
  }, [itemId]);

  const fetchClaimStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await foundItemsApi.getClaimStatus(itemId);
      if (data.claim_id) {
        // Fetch full claim details
        const claimDetail = await foundItemsApi.getClaim(data.claim_id);
        setClaim(claimDetail);
      } else {
        setClaim(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await foundItemsApi.claimItem(itemId);
      setClaim(data);
      setActionSuccess('Claim initiated successfully!');
      if (data.requires_security && data.security_question) {
        setShowSecurityForm(true);
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to initiate claim');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnswerSecurity = async () => {
    if (!securityAnswer.trim()) {
      setActionError('Please provide an answer');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await foundItemsApi.answerSecurity(claim.id, securityAnswer);
      if (data.correct) {
        setActionSuccess('Security answer correct!');
        setShowSecurityForm(false);
        setSecurityAnswer('');
        // Refresh claim
        const updatedClaim = await foundItemsApi.getClaim(claim.id);
        setClaim(updatedClaim);
      } else {
        const attempts = securityAttempts + 1;
        setSecurityAttempts(attempts);
        if (data.attempts_left !== undefined && data.attempts_left <= 0) {
          setActionError('Maximum attempts reached. Claim has been locked.');
          setShowSecurityForm(false);
        } else {
          setActionError(data.error || 'Incorrect answer. Please try again.');
        }
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to verify answer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceFile && !evidenceDescription.trim()) {
      setActionError('Please provide evidence or a description');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const formData = new FormData();
      if (evidenceFile) {
        formData.append('file', evidenceFile);
      }
      formData.append('description', evidenceDescription);
      await foundItemsApi.submitEvidence(claim.id, formData);
      setActionSuccess('Evidence submitted successfully!');
      setShowEvidenceForm(false);
      setEvidenceFile(null);
      setEvidenceDescription('');
      // Refresh claim
      const updatedClaim = await foundItemsApi.getClaim(claim.id);
      setClaim(updatedClaim);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to submit evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await foundItemsApi.initiatePayment(claim.id);
      setActionSuccess('Payment initiated! Check your phone for the M-Pesa prompt.');
      // Start polling payment status
      checkPaymentStatus();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setActionLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    setPaymentChecking(true);
    try {
      const data = await foundItemsApi.checkPaymentStatus(claim.id);
      setPaymentStatus(data.status);
      if (data.status === 'completed') {
        setActionSuccess('Payment confirmed! You can now confirm receipt.');
        // Refresh claim
        const updatedClaim = await foundItemsApi.getClaim(claim.id);
        setClaim(updatedClaim);
      } else {
        // Poll again in 5 seconds
        setTimeout(checkPaymentStatus, 5000);
      }
    } catch (err) {
      console.error('Failed to check payment status', err);
    } finally {
      setPaymentChecking(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await foundItemsApi.confirmReceipt(claim.id);
      setActionSuccess('Receipt confirmed! Claim completed successfully.');
      // Refresh claim
      const updatedClaim = await foundItemsApi.getClaim(claim.id);
      setClaim(updatedClaim);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to confirm receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelClaim = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await foundItemsApi.cancelClaim(claim.id);
      setActionSuccess('Claim cancelled successfully.');
      setShowCancelConfirm(false);
      fetchClaimStatus();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to cancel claim');
    } finally {
      setActionLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!claim) return -1;
    const statusMap = {
      'pending': 0,
      'security_verified': 1,
      'evidence_submitted': 2,
      'awaiting_payment': 3,
      'payment_received': 4,
      'claimed': 5,
    };
    return statusMap[claim.status] ?? -1;
  };

  if (loading) return <SkeletonLoader type="detail" />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .cd-root { font-family: 'Outfit', sans-serif; max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; animation: cdIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cdIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cd-back { display: inline-flex; align-items: center; gap: 6px; color: #6366f1; font-weight: 600; font-size: 0.85rem; margin-bottom: 20px; text-decoration: none; }
        .cd-back:hover { text-decoration: underline; }
        .cd-header { margin-bottom: 24px; }
        .cd-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; margin-bottom: 4px; }
        .dark .cd-header h1 { color: #f8fafc; }
        .cd-subtitle { font-size: 0.85rem; color: #94a3b8; }
        .cd-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 24px; margin-bottom: 20px; backdrop-filter: blur(12px); }
        .dark .cd-card { background: rgba(12,16,24,0.85); border-color: rgba(255,255,255,0.05); }
        .cd-card-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .dark .cd-card-title { color: #f8fafc; }
        .cd-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; }
        .cd-info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 0.85rem; }
        .dark .cd-info-row { border-color: rgba(255,255,255,0.05); }
        .cd-info-label { color: #94a3b8; font-weight: 500; }
        .cd-info-value { color: #0f172a; font-weight: 600; }
        .dark .cd-info-value { color: #f8fafc; }
        .cd-steps { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
        .cd-step { flex: 1; min-width: 80px; text-align: center; padding: 12px 8px; border-radius: 12px; background: rgba(0,0,0,0.03); font-size: 0.7rem; font-weight: 600; color: #94a3b8; transition: all 0.2s; }
        .dark .cd-step { background: rgba(255,255,255,0.03); }
        .cd-step.active { background: #6366f1; color: #fff; }
        .cd-step.completed { background: #ecfdf5; color: #059669; }
        .dark .cd-step.completed { background: rgba(5,150,105,0.1); }
        .cd-step-icon { font-size: 1.2rem; margin-bottom: 4px; }
        .cd-actions { display: flex; flex-direction: column; gap: 12px; }
        .cd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; width: 100%; }
        .cd-btn-primary { background: #6366f1; color: #fff; }
        .cd-btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .cd-btn-primary:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
        .cd-btn-secondary { background: rgba(99,102,241,0.1); color: #6366f1; border: 1.5px solid #6366f1; }
        .cd-btn-secondary:hover { background: rgba(99,102,241,0.2); }
        .cd-btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1.5px solid #ef4444; }
        .cd-btn-danger:hover { background: rgba(239,68,68,0.2); }
        .cd-btn-sm { padding: 8px 16px; font-size: 0.8rem; width: auto; }
        .cd-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: 'Outfit', sans-serif; font-size: 0.85rem; background: #fff; color: #0f172a; transition: border-color 0.15s; }
        .dark .cd-input { background: #1e293b; border-color: #334155; color: #f8fafc; }
        .cd-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .cd-textarea { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: 'Outfit', sans-serif; font-size: 0.85rem; background: #fff; color: #0f172a; resize: vertical; min-height: 80px; }
        .dark .cd-textarea { background: #1e293b; border-color: #334155; color: #f8fafc; }
        .cd-textarea:focus { outline: none; border-color: #6366f1; }
        .cd-file-input { padding: 12px 16px; border-radius: 12px; border: 1.5px dashed #e2e8f0; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.85rem; }
        .dark .cd-file-input { border-color: #334155; }
        .cd-alert { padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem; }
        .cd-alert-error { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
        .cd-alert-success { background: rgba(5,150,105,0.1); color: #059669; border: 1px solid rgba(5,150,105,0.2); }
        .cd-alert-info { background: rgba(99,102,241,0.1); color: #6366f1; border: 1px solid rgba(99,102,241,0.2); }
        .cd-empty { text-align: center; padding: 64px 24px; }
        .cd-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
        .cd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .cd-modal { background: #fff; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; text-align: center; }
        .dark .cd-modal { background: #1e293b; }
        .cd-modal h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
        .dark .cd-modal h3 { color: #f8fafc; }
        .cd-modal p { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
        .cd-modal-actions { display: flex; gap: 12px; justify-content: center; }
      `}</style>
      <div className="cd-root">
        {/* Back Button */}
        <Link to="/claims" className="cd-back">
          <FiArrowLeft size={16} /> Back to Claims
        </Link>

        {/* Error Banner */}
        {error && (
          <div className="cd-alert cd-alert-error">
            <FiAlertCircle size={18} />
            <span>{error}</span>
            <button onClick={fetchClaimStatus} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <FiRefreshCw size={16} />
            </button>
          </div>
        )}

        {/* Action Feedback */}
        {actionError && (
          <div className="cd-alert cd-alert-error">
            <FiAlertTriangle size={18} />
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <FiX size={16} />
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="cd-alert cd-alert-success">
            <FiCheckCircle size={18} />
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}>
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* No Claim Yet */}
        {!claim && !loading && !error && (
          <div className="cd-empty">
            <div className="cd-empty-icon">📋</div>
            <h3 style={{ fontWeight: 700, color: '#64748b', marginBottom: 8 }}>No claim yet</h3>
            <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: '0.85rem' }}>
              You haven't started a claim for this item yet.
            </p>
            <button onClick={handleClaimItem} disabled={actionLoading} className="cd-btn cd-btn-primary" style={{ width: 'auto', display: 'inline-flex' }}>
              {actionLoading ? <FiRefreshCw size={16} className="animate-spin" /> : <FiCheckCircle size={16} />}
              Start Claim
            </button>
          </div>
        )}

        {/* Claim Details */}
        {claim && (
          <>
            <div className="cd-header">
              <h1>{claim.item_title}</h1>
              <p className="cd-subtitle">Claim #{claim.id?.substring(0, 8)}</p>
            </div>

            {/* Progress Steps */}
            <div className="cd-steps">
              {STEPS.map((step, index) => {
                const currentIndex = getCurrentStepIndex();
                let stepClass = '';
                if (index < currentIndex) stepClass = 'completed';
                else if (index === currentIndex) stepClass = 'active';

                return (
                  <div key={step.key} className={`cd-step ${stepClass}`}>
                    <div className="cd-step-icon">
                      {index < currentIndex ? <FiCheck size={18} /> : <step.icon size={18} />}
                    </div>
                    <div>{step.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Claim Info Card */}
            <div className="cd-card">
              <div className="cd-info-row">
                <span className="cd-info-label">Status</span>
                <span className={`cd-status-badge ${STATUS_STYLES[claim.status] || STATUS_STYLES.pending}`}>
                  {(() => {
                    const Icon = STATUS_ICONS[claim.status] || FiClock;
                    return <Icon size={12} />;
                  })()}
                  {claim.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">Category</span>
                <span className="cd-info-value">{claim.item_category}</span>
              </div>
              {claim.item_location && (
                <div className="cd-info-row">
                  <span className="cd-info-label">Location Found</span>
                  <span className="cd-info-value">{claim.item_location}</span>
                </div>
              )}
              <div className="cd-info-row">
                <span className="cd-info-label">Fee Required</span>
                <span className="cd-info-value">{claim.item_is_fee_required ? 'Yes' : 'No'}</span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">Created</span>
                <span className="cd-info-value">{safeFormatDate(claim.created_at)}</span>
              </div>
              {claim.confirmed_at && (
                <div className="cd-info-row">
                  <span className="cd-info-label">Completed</span>
                  <span className="cd-info-value">{safeFormatDate(claim.confirmed_at)}</span>
                </div>
              )}
            </div>

            {/* Actions based on status */}
            <div className="cd-card">
              <h3 className="cd-card-title">Actions</h3>

              {/* Security Question */}
              {claim.requires_security && claim.status === 'pending' && (
                <div style={{ marginBottom: 16 }}>
                  {showSecurityForm ? (
                    <div>
                      <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8, fontSize: '0.9rem' }}>
                        Security Question:
                      </p>
                      <p style={{ color: '#64748b', marginBottom: 12, fontSize: '0.85rem' }}>
                        {claim.security_question}
                      </p>
                      <input
                        type="text"
                        className="cd-input"
                        placeholder="Your answer..."
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        disabled={actionLoading}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={handleAnswerSecurity}
                          disabled={actionLoading}
                          className="cd-btn cd-btn-primary cd-btn-sm"
                        >
                          {actionLoading ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />}
                          Submit Answer
                        </button>
                        <button
                          onClick={() => setShowSecurityForm(false)}
                          className="cd-btn cd-btn-secondary cd-btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSecurityForm(true)}
                      className="cd-btn cd-btn-primary"
                    >
                      <FiShield size={16} /> Answer Security Question
                    </button>
                  )}
                </div>
              )}

              {/* Submit Evidence */}
              {(claim.status === 'pending' || claim.status === 'security_verified') && !claim.requires_security && (
                <div style={{ marginBottom: 16 }}>
                  {showEvidenceForm ? (
                    <div>
                      <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8, fontSize: '0.9rem' }}>
                        Submit Evidence of Ownership
                      </p>
                      <input
                        type="file"
                        className="cd-file-input"
                        onChange={(e) => setEvidenceFile(e.target.files[0])}
                        disabled={actionLoading}
                      />
                      {evidenceFile && (
                        <p style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: 4 }}>
                          Selected: {evidenceFile.name}
                        </p>
                      )}
                      <textarea
                        className="cd-textarea"
                        placeholder="Description of your evidence..."
                        value={evidenceDescription}
                        onChange={(e) => setEvidenceDescription(e.target.value)}
                        disabled={actionLoading}
                        style={{ marginTop: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={handleSubmitEvidence}
                          disabled={actionLoading}
                          className="cd-btn cd-btn-primary cd-btn-sm"
                        >
                          {actionLoading ? <FiRefreshCw size={14} className="animate-spin" /> : <FiUpload size={14} />}
                          Submit Evidence
                        </button>
                        <button
                          onClick={() => setShowEvidenceForm(false)}
                          className="cd-btn cd-btn-secondary cd-btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowEvidenceForm(true)}
                      className="cd-btn cd-btn-primary"
                    >
                      <FiUpload size={16} /> Submit Evidence
                    </button>
                  )}
                </div>
              )}

              {/* Initiate Payment */}
              {claim.item_is_fee_required && (claim.status === 'evidence_submitted' || claim.status === 'security_verified') && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={handleInitiatePayment}
                    disabled={actionLoading || paymentChecking}
                    className="cd-btn cd-btn-primary"
                  >
                    <FiCreditCard size={16} />
                    {paymentChecking ? 'Payment in progress...' : 'Pay via M-Pesa'}
                  </button>
                  {paymentChecking && (
                    <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: '#94a3b8' }}>
                      Checking payment status... Please check your phone.
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Receipt */}
              {claim.status === 'payment_received' && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={actionLoading}
                    className="cd-btn cd-btn-primary"
                  >
                    <FiCheckCircle size={16} /> Confirm Receipt
                  </button>
                </div>
              )}

              {/* Claim Completed */}
              {claim.status === 'claimed' && (
                <div className="cd-alert cd-alert-success" style={{ marginBottom: 16 }}>
                  <FiCheckCircle size={18} />
                  <span>Claim completed successfully!</span>
                </div>
              )}

              {/* Claim Rejected */}
              {claim.status === 'rejected' && (
                <div className="cd-alert cd-alert-error" style={{ marginBottom: 16 }}>
                  <FiXCircle size={18} />
                  <span>This claim has been rejected.</span>
                </div>
              )}

              {/* Cancel Claim */}
              {!['claimed', 'rejected', 'cancelled'].includes(claim.status) && (
                <div>
                  {showCancelConfirm ? (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: '#ef4444', marginBottom: 12 }}>
                        Are you sure you want to cancel this claim?
                      </p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={handleCancelClaim}
                          disabled={actionLoading}
                          className="cd-btn cd-btn-danger cd-btn-sm"
                        >
                          {actionLoading ? <FiRefreshCw size={14} className="animate-spin" /> : <FiX size={14} />}
                          Yes, Cancel
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="cd-btn cd-btn-secondary cd-btn-sm"
                        >
                          No, Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="cd-btn cd-btn-danger"
                    >
                      <FiXCircle size={16} /> Cancel Claim
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}