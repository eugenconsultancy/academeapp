import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    FiCamera, FiCheckCircle, FiRefreshCw,
    FiArrowLeft, FiCameraOff,
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
    const [success, setSuccess] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();

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

            await accountsApi.enrollBiometric(base64Image);
            setSuccess(true);
            setBiometricEnabled(true);
            // Update auth context to reflect the new biometric state
            updateUser({ biometric_enabled: true });
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

    const handleRetry = () => {
        setSuccess(false);
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
                                You have already set up Face ID. Would you like to re‑enroll?
                            </p>
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
                                        <FiCamera size={18} /> Re‑enroll Face
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/profile')}
                                className="w-full mt-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
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
                                onClick={handleRetry}
                                className="w-full mt-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Enroll Again
                            </button>
                        </>
                    )}
                </div>

                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                    Your biometric data is processed securely and never stored as raw images.
                </p>
            </div>
        </div>
    );
}