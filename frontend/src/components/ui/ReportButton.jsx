import { useState, useCallback } from 'react';
import { FiFlag, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const DEFAULT_REASONS = [
  { value: 'spam', label: 'Spam', icon: '🔗' },
  { value: 'scam', label: 'Scam', icon: '⚠️' },
  { value: 'expired', label: 'Expired', icon: '⏰' },
  { value: 'inappropriate', label: 'Inappropriate', icon: '🚫' },
  { value: 'misleading', label: 'Misleading', icon: '❓' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const sizes = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-lg',
  lg: 'px-3 py-2 rounded-xl gap-2',
};

export default function ReportButton({
  onReport,
  disabled = false,
  loading = false,
  reasons = DEFAULT_REASONS,
  size = 'md',
  variant = 'ghost', // ghost, outline, text
  label = '',
  tooltip = 'Report content',
  contentTitle = 'Report Content',
  successMessage = 'Report submitted successfully. Thank you for helping keep our community safe.',
  errorMessage = 'Failed to submit report. Please try again.',
  requireReason = true,
  className = '',
}) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [error, setError] = useState('');

  const isButtonLoading = loading || submitting;

  const handleSubmit = useCallback(async () => {
    if (!reason && requireReason) return;

    setSubmitting(true);
    setError('');

    try {
      if (onReport) {
        await onReport(reason, description);
      }
      setStatus('success');

      // Auto close after success
      setTimeout(() => {
        setShowModal(false);
        setStatus(null);
        setReason('');
        setDescription('');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError(err?.message || errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [reason, description, requireReason, onReport, errorMessage]);

  const handleClose = useCallback(() => {
    if (isButtonLoading) return;
    setShowModal(false);
    setStatus(null);
    setReason('');
    setDescription('');
    setError('');
  }, [isButtonLoading]);

  const variantClasses = {
    ghost: 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
    outline: 'text-gray-500 border border-gray-200 dark:border-gray-600 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700',
    text: 'text-gray-500 hover:text-red-500 underline-offset-2 hover:underline',
  };

  return (
    <>
      {/* ── Trigger Button ────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        title={tooltip}
        aria-label={tooltip}
        className={`
                    inline-flex items-center transition-all
                    ${variantClasses[variant] || variantClasses.ghost}
                    ${sizes[size] || sizes.md}
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${className}
                `.trim()}
      >
        <FiFlag size={size === 'sm' ? 14 : size === 'lg' ? 18 : 15} />
        {label && <span className="text-sm font-medium ml-1.5">{label}</span>}
      </button>

      {/* ── Report Modal ──────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slideUp shadow-2xl z-10">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <FiFlag className="text-red-500" size={18} />
                {contentTitle}
              </h3>
              <button
                onClick={handleClose}
                disabled={isButtonLoading}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Success State */}
            {status === 'success' && (
              <div className="text-center py-8 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Form */}
            {status !== 'success' && (
              <div className="space-y-4">
                {/* Reasons */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Reason {requireReason && <span className="text-red-500">*</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {reasons.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        onClick={() => setReason(value)}
                        disabled={isButtonLoading}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${reason === value
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          } disabled:opacity-50`}
                      >
                        {icon && <span className="mr-1.5">{icon}</span>}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Details <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isButtonLoading}
                    rows={3}
                    placeholder="Provide additional details..."
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                  />
                </div>

                {/* Error */}
                {status === 'error' && error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    disabled={isButtonLoading}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isButtonLoading || (requireReason && !reason)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                  >
                    {isButtonLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}