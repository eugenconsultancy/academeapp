import { useState } from 'react';
import { FiFlag, FiX } from 'react-icons/fi';

const reasons = [
  { value: 'spam', label: '🔗 Spam' },
  { value: 'scam', label: '⚠️ Scam' },
  { value: 'expired', label: '⏰ Expired' },
  { value: 'inappropriate', label: '🚫 Inappropriate' },
  { value: 'misleading', label: '❓ Misleading' },
  { value: 'other', label: '📝 Other' },
];

export default function ReportButton({ onReport, disabled = false }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!reason) return;
    onReport?.(reason, description);
    setShowModal(false);
    setReason('');
    setDescription('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
        title="Report"
      >
        <FiFlag size={15} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slideUp shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FiFlag className="text-red-500" size={18} />
                Report Content
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Reason *</label>
                <div className="grid grid-cols-2 gap-2">
                  {reasons.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setReason(value)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        reason === value
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Details (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!reason} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-50 shadow-lg shadow-red-500/25">
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
