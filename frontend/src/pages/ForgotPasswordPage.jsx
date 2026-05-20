import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { accountsApi } from '../api/accountsApi';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSmartphone, FiSend } from 'react-icons/fi';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!phone.trim() || phone.length < 10) {
            toast.error('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            await accountsApi.forgotPassword(phone);
            setOtpSent(true);
            toast.success('OTP sent to your phone');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleContinueToReset = () => {
        navigate(`/reset-password?phone=${encodeURIComponent(phone)}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Back link */}
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FiSmartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
                        {otpSent
                            ? 'We sent an OTP to your phone number. Check your SMS messages.'
                            : 'Enter your phone number and we\'ll send you an OTP to reset your password.'}
                    </p>

                    {!otpSent ? (
                        /* Step 1: Enter phone number */
                        <form onSubmit={handleRequestOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+254712345678"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Enter the phone number linked to your account</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Sending OTP...
                                    </>
                                ) : (
                                    <>
                                        <FiSend className="w-5 h-5" />
                                        Send OTP
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Step 2: OTP sent - continue to reset */
                        <div className="space-y-5">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                                    OTP sent successfully to {phone}
                                </p>
                            </div>

                            <button
                                onClick={handleContinueToReset}
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                                Enter OTP & Reset Password
                            </button>

                            <button
                                onClick={() => setOtpSent(false)}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                Use a different phone number
                            </button>
                        </div>
                    )}

                    {/* Help link */}
                    <p className="text-center text-xs text-gray-400 mt-8">
                        Lost access to your phone?{' '}
                        <Link to="/contact" className="text-blue-500 hover:text-blue-600 underline">
                            Contact Support
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}