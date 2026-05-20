import { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { attendanceService } from '../../services/attendanceService';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiMapPin, FiLoader } from 'react-icons/fi';

/**
 * Location-Aware Attendance Button
 * 
 * Features:
 * - GPS location verification before marking
 * - Fallback to basic attendance when GPS unavailable
 * - Loading/disabled states
 * - Success/error feedback
 * - Offline queue support
 */
export default function AttendanceButton({ entryId, unitName, venue, isMarked, canMark }) {
    const { location, error: geoError, getLocation } = useGeolocation();
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(null);

    const handleMarkAttendance = async () => {
        setLoading(true);
        setVerified(null);

        try {
            const result = await attendanceService.markAttendance(entryId);

            if (result.verified) {
                setVerified(true);
                toast.success(`📍 Attendance verified! (${result.distance_display})`, {
                    icon: '✅',
                    duration: 4000,
                });
            } else if (result.message) {
                setVerified(false);
                toast.success('Attendance marked (without location verification)', {
                    icon: '⚠️',
                    duration: 4000,
                });
            }
        } catch (error) {
            toast.error(error.message || 'Failed to mark attendance', {
                icon: '❌',
            });
        } finally {
            setLoading(false);
        }
    };

    // Already marked
    if (isMarked) {
        return (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold">
                <FiCheckCircle className="w-4 h-4" /> Marked
            </span>
        );
    }

    // Past class - cannot mark
    if (!canMark) {
        return (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-sm font-medium">
                Closed
            </span>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleMarkAttendance}
                disabled={loading}
                className={`
                    inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                    shadow-md hover:shadow-lg transition-all transform hover:scale-105
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${loading
                        ? 'bg-amber-500 text-white'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white'
                    }
                `}
            >
                {loading ? (
                    <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Verifying...
                    </>
                ) : (
                    <>
                        <FiMapPin className="w-4 h-4" />
                        Check In
                    </>
                )}
            </button>

            {verified === true && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <FiCheckCircle className="w-3 h-3" /> Location verified
                </span>
            )}

            {geoError && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                    GPS unavailable - basic check-in only
                </span>
            )}
        </div>
    );
}