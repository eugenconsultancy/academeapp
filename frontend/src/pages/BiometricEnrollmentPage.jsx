import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    FiCamera, FiCheckCircle, FiRefreshCw,
    FiArrowLeft, FiShield, FiTrash2, FiAlertTriangle,
} from 'react-icons/fi';

// Helper: request camera and capture a single frame as base64
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

export default function BiometricEnrollmentPage() {
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [disabling, setDisabling] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const navigate = useNavigate();
    const { user, updateUser, enrollBiometric, disableBiometric } = useAuth();

    // Fetch current biometric status on mount
    useEffect(() => {
        (async () => {
            try {
                const response = await accountsApi.getProfile();
                const profile = response.data || response;
                setBiometricEnabled(profile.biometric_enabled || false);
            } catch (err) {
                toast.error('Failed to load biometric status');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleEnroll = async () => {
        try {
            setEnrolling(true);
            const base64Image = await captureImageFromCamera();

            if (!base64Image) {
                toast('Enrollment cancelled', { icon: '📷' });
                return;
            }

            await enrollBiometric(base64Image);
            setSuccess(true);
            setBiometricEnabled(true);
            toast.success('Face ID enrolled successfully! 🎉');
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                toast.error('Camera permission denied. Please allow camera access in browser settings.');
            } else {
                toast.error(error.response?.data?.error || error.message || 'Enrollment failed');
            }
        } finally {
            setEnrolling(false);
        }
    };

    const handleDisable = async () => {
        setDisabling(true);
        try {
            await disableBiometric();
            setBiometricEnabled(false);
            setSuccess(false);
            setShowDisableConfirm(false);
            toast.success('Face ID disabled successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to disable Face ID');
        } finally {
            setDisabling(false);
        }
    };

    const handleReEnroll = () => {
        setSuccess(false);
        handleEnroll();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <FiRefreshCw className="animate-spin text-4xl text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
                >
                    <FiArrowLeft size={18} /> Back
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                    {biometricEnabled && !success ? (
                        <>
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
                                <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Face ID Already Enrolled
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                You have already set up Face ID. You can re-enroll or disable it.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleReEnroll}
                                    disabled={enrolling}
                                    className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {enrolling ? (
                                        <>
                                            <FiRefreshCw className="animate-spin" size={18} /> Opening camera…
                                        </>
                                    ) : (
                                        <>
                                            <FiCamera size={18} /> Re-enroll Face
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDisableConfirm(true)}
                                    disabled={disabling}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FiTrash2 size={18} /> Disable Face ID
                                </button>
                            </div>
                            <button
                                onClick={() => navigate('/profile')}
                                className="w-full mt-3 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Back to Profile
                            </button>
                        </>
                    ) : !success ? (
                        <>
                            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-4">
                                <FiCamera className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Set Up Face ID
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Hold your face in the camera frame and capture a clear image.
                                This image will be used only for verification.
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-6 flex items-start gap-2 text-left">
                                <FiShield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Your face data is encrypted and stored securely. We never share your biometric data with third parties.
                                </p>
                            </div>
                            <button
                                onClick={handleEnroll}
                                disabled={enrolling}
                                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {enrolling ? (
                                    <>
                                        <FiRefreshCw className="animate-spin" size={18} /> Opening camera…
                                    </>
                                ) : (
                                    <>
                                        <FiCamera size={18} /> Start Camera & Enroll
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
                                <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Enrollment Complete!
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                You can now log in using Face ID on the login screen.
                            </p>
                            <button
                                onClick={() => navigate('/profile')}
                                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                            >
                                Back to Profile
                            </button>
                            <button
                                onClick={handleReEnroll}
                                className="w-full mt-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Re-enroll Face ID
                            </button>
                        </>
                    )}
                </div>

                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                    Your biometric data is processed securely and never stored as raw images.
                </p>
            </div>

            {/* Disable Confirmation Modal */}
            {showDisableConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <FiAlertTriangle size={24} />
                            <h2 className="text-xl font-bold">Disable Face ID?</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to disable Face ID? You will need to re-enroll to use Face ID login again.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisableConfirm(false)}
                                className="flex-1 py-2 border rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisable}
                                disabled={disabling}
                                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50"
                            >
                                {disabling ? 'Disabling...' : 'Yes, Disable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}