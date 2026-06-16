// frontend/src/components/opportunities/ScholarshipReviewModal.jsx
import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { opportunitiesApi } from '../../api/opportunitiesApi';
import { FiUploadCloud, FiX, FiFileText } from 'react-icons/fi';

const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ScholarshipReviewModal({ opportunityId, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | uploading | paying
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Validate type
        if (!ALLOWED_TYPES.includes(selected.type)) {
            toast.error('Please upload a PDF or Word document.');
            return;
        }

        // Validate size
        if (selected.size > MAX_FILE_SIZE) {
            toast.error('File size exceeds 5 MB limit.');
            return;
        }

        setFile(selected);
    };

    const handleSubmit = async () => {
        if (!file) {
            toast.error('Please select a document to upload.');
            return;
        }

        setStatus('uploading');
        const res = await opportunitiesApi.submitScholarshipReview(opportunityId, file);

        if (res?.data?.id) {
            toast.success('Document uploaded. Initiating payment...');
            setStatus('paying');
            // Trigger STK push – you can collect phone number here or use stored user phone
            const phone = localStorage.getItem('user_phone') || '254700000000'; // fallback
            const payRes = await opportunitiesApi.payForReview(res.data.id, phone);

            if (payRes?.data?.message || payRes?.status === 200) {
                toast.success('Check your phone for the M‑Pesa prompt.');
                onSuccess?.();
                onClose();
            } else {
                toast.error('Payment initiation failed. Please try again.');
            }
        } else {
            toast.error(res?.data?.error || 'Upload failed. Please try again.');
        }
        setStatus('idle');
    };

    const isProcessing = status !== 'idle';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 z-10">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <FiX size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4 dark:text-white">
                    Scholarship Document Review
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Upload your scholarship application document. A 100 KES fee will be charged for expert review.
                </p>

                {/* File picker area */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${file
                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                    />
                    {file ? (
                        <div className="flex items-center justify-center gap-2">
                            <FiFileText className="text-green-600" size={20} />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                {file.name}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <FiUploadCloud className="text-gray-400 mb-2" size={28} />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Click to upload PDF or Word document
                            </span>
                            <span className="text-xs text-gray-400 mt-1">Max 5 MB</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !file}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === 'uploading' ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                            </span>
                        ) : status === 'paying' ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Requesting payment...
                            </span>
                        ) : (
                            'Submit & Pay (100 KES)'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}