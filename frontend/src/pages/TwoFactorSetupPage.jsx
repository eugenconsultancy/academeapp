import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accountsApi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShield, FiCheckCircle, FiArrowLeft, FiRefreshCw, FiCopy, FiDownload } from 'react-icons/fi';
import SkeletonLoader from '../components/shared/SkeletonLoader';

export default function TwoFactorSetupPage() {
    const { user, updateUser, verify2FASetup, disable2FA, get2FAStatus } = useAuth();
    const [loading, setLoading] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [step, setStep] = useState('status'); // 'status', 'setup', 'verify', 'backup'
    const [verifying, setVerifying] = useState(false);
    const [disabling, setDisabling] = useState(false);
    const [disableCode, setDisableCode] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const status = await get2FAStatus();
            setTwoFactorEnabled(status.two_factor_enabled);
        } catch (err) {
            toast.error('Failed to load 2FA status');
        } finally {
            setLoading(false);
        }
    };

    const startSetup = async () => {
        setLoading(true);
        try {
            const data = await accountsApi.setup2FA();
            setQrCode(data.qr_code);
            setSecret(data.secret);
            setStep('verify');
        } catch (err) {
            toast.error('Failed to generate QR code');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            toast.error('Enter a valid 6-digit code');
            return;
        }
        setVerifying(true);
        try {
            const result = await verify2FASetup(verificationCode);
            setBackupCodes(result.backup_codes || []);
            setStep('backup');
            toast.success('2FA enabled! Save your backup codes.');
        } catch (err) {
            toast.error(err.message || 'Invalid verification code');
        } finally {
            setVerifying(false);
        }
    };

    const handleDisable = async () => {
        if (!disableCode) {
            toast.error('Enter your 2FA code to disable');
            return;
        }
        setDisabling(true);
        try {
            await disable2FA(disableCode);
            setTwoFactorEnabled(false);
            setStep('status');
            toast.success('2FA disabled');
        } catch (err) {
            toast.error(err.message || 'Failed to disable');
        } finally {
            setDisabling(false);
            setDisableCode('');
        }
    };

    const copyBackupCodes = () => {
        const codesText = backupCodes.join('\n');
        navigator.clipboard.writeText(codesText);
        toast.success('Backup codes copied');
    };

    const downloadBackupCodes = () => {
        const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'academe-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <SkeletonLoader type="page" />;

    // Already enabled – show management UI
    if (twoFactorEnabled && step === 'status') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
                        <FiArrowLeft /> Back to Profile
                    </Link>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FiShield className="w-8 h-8 text-green-500" />
                            <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl mb-6">
                            <p className="text-green-700 dark:text-green-300 font-semibold">✅ 2FA is enabled</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your account is protected with an authenticator app.</p>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="font-semibold mb-3">Disable 2FA</h3>
                            <p className="text-sm text-gray-500 mb-3">Enter a code from your authenticator app to disable two-factor authentication.</p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="6-digit code"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    className="flex-1 px-4 py-2 border rounded-lg"
                                    maxLength={6}
                                />
                                <button
                                    onClick={handleDisable}
                                    disabled={disabling}
                                    className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50"
                                >
                                    {disabling ? 'Disabling...' : 'Disable'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step: verify QR code
    if (step === 'verify') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 text-center">
                        <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>
                        <p className="text-gray-600 mb-4">Use Google Authenticator, Authy, or any TOTP app to scan:</p>
                        {qrCode && <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48 mb-4" />}
                        <p className="text-sm text-gray-500 mb-4">Or manually enter secret: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code></p>
                        <input
                            type="text"
                            placeholder="Enter 6-digit code from app"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl mb-4 text-center text-2xl tracking-widest"
                            maxLength={6}
                        />
                        <button
                            onClick={verifyAndEnable}
                            disabled={verifying}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold"
                        >
                            {verifying ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        <button onClick={() => setStep('status')} className="mt-3 text-sm text-gray-500 underline">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: show backup codes
    if (step === 'backup') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                        <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-center mb-2">2FA Enabled Successfully!</h2>
                        <p className="text-center text-gray-600 mb-6">Save these backup codes in a safe place. Each code can be used once.</p>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl mb-6 font-mono text-sm grid grid-cols-2 gap-2">
                            {backupCodes.map((code, idx) => (
                                <div key={idx} className="text-center">{code}</div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={copyBackupCodes} className="flex-1 py-2 border rounded-xl flex items-center justify-center gap-2"><FiCopy /> Copy</button>
                            <button onClick={downloadBackupCodes} className="flex-1 py-2 border rounded-xl flex items-center justify-center gap-2"><FiDownload /> Download</button>
                        </div>
                        <Link to="/profile" className="block text-center mt-6 text-indigo-600">Back to Profile</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Default: not enabled, show setup button
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <FiArrowLeft /> Back to Profile
                </Link>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 text-center">
                    <FiShield className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Secure Your Account</h1>
                    <p className="text-gray-600 mb-6">Two-factor authentication adds an extra layer of security.</p>
                    <button onClick={startSetup} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md">
                        Set Up 2FA
                    </button>
                </div>
            </div>
        </div>
    );
}