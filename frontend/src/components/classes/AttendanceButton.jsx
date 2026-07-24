// frontend/src/components/classes/AttendanceButton.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../api/geoService';            // <-- Use GeoService for check‑in
import toast from 'react-hot-toast';
import {
    FiCheckCircle, FiMapPin, FiLoader, FiClock,
    FiXCircle, FiAlertTriangle, FiChevronDown,
    FiRefreshCw, FiWifiOff, FiInfo, FiTarget,
    FiChevronUp,
} from 'react-icons/fi';

const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present', icon: FiCheckCircle, color: 'emerald', shortcut: 'P' },
    { value: 'LATE', label: 'Late', icon: FiClock, color: 'amber', shortcut: 'L' },
    { value: 'ABSENT', label: 'Absent', icon: FiXCircle, color: 'red', shortcut: 'A' },
    { value: 'EXCUSED', label: 'Excused', icon: FiAlertTriangle, color: 'slate', shortcut: 'E' },
];

export default function AttendanceButton({
    entryId,
    unitName = '',
    venue = '',
    venueLocation = null,
    isMarked = false,
    canMark = true,
    currentStatus = null,
    attendanceRate = null,
    onMarkComplete = null,
}) {
    const {
        location,
        error: geoError,
        loading: geoLoading,
        getLocation,
        isAccuracyAcceptable,
        getAccuracyDescription,
        calculateDistance,
        checkVenueProximity,
        estimateWalkTime,
    } = useGeolocation({
        enableHighAccuracy: true,
        timeout: 8000,
    });

    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'PRESENT');
    const [isOffline, setIsOffline] = useState(false);
    const [syncPending, setSyncPending] = useState(false);
    const [distanceToVenue, setDistanceToVenue] = useState(null);
    const [walkingTime, setWalkingTime] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [gpsAttempted, setGpsAttempted] = useState(false);
    const [manualReview, setManualReview] = useState(false);   // new state for manual review flag

    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                setShowStatusMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcuts for status selection
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showStatusMenu) {
                const option = STATUS_OPTIONS.find(
                    o => o.shortcut.toLowerCase() === e.key.toLowerCase()
                );
                if (option) {
                    e.preventDefault();
                    handleStatusSelect(option.value);
                }
                if (e.key === 'Escape') {
                    setShowStatusMenu(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showStatusMenu]);

    // ═════════════════════════════════════════════════════════
    // GPS & VENUE PROXIMITY (for display)
    // ═════════════════════════════════════════════════════════

    const checkVenueDistance = useCallback(async () => {
        try {
            await getLocation();
            setGpsAttempted(true);
            if (location && venueLocation?.latitude && venueLocation?.longitude) {
                const proximity = checkVenueProximity(venueLocation);
                if (proximity) {
                    setDistanceToVenue(proximity.distance);
                    setWalkingTime(proximity.walkingTime || estimateWalkTime(proximity.distance));
                }
            }
        } catch (err) {
            console.warn('GPS check failed:', err.message);
            setGpsAttempted(true);
        }
    }, [location, venueLocation, getLocation, checkVenueProximity, estimateWalkTime]);

    // Direct GPS promise (no state lag)
    const getDeviceCoordinates = () =>
        new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                },
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        });

    // ═════════════════════════════════════════════════════════
    // ATTENDANCE MARKING (using GeoService.submitCheckIn)
    // ═════════════════════════════════════════════════════════

    const handleMarkAttendance = useCallback(
        async (status = selectedStatus) => {
            if (!entryId || loading) return;

            setLoading(true);
            setVerified(null);
            setIsOffline(false);
            setSyncPending(false);
            setManualReview(false);
            setRetryCount((prev) => prev);   // keep current retry count

            let studentLat = null;
            let studentLon = null;
            let gpsAccuracy = null;

            try {
                // 1. Get GPS coordinates
                try {
                    const coords = await getDeviceCoordinates();
                    studentLat = coords.lat;
                    studentLon = coords.lon;
                    gpsAccuracy = coords.accuracy;
                    setGpsAttempted(true);

                    // Update distance helpers
                    if (venueLocation?.latitude && venueLocation?.longitude) {
                        const dist = calculateDistance(
                            studentLat, studentLon,
                            venueLocation.latitude, venueLocation.longitude
                        );
                        setDistanceToVenue(Math.round(dist));
                        setWalkingTime(estimateWalkTime(dist));
                    }
                } catch (gpsErr) {
                    console.warn('GPS unavailable:', gpsErr.message);
                    setGpsAttempted(true);
                }

                // 2. Submit to backend location check‑in endpoint
                const checkInResponse = await GeoService.submitCheckIn({
                    timetable_entry_id: entryId,
                    latitude: studentLat,
                    longitude: studentLon,
                    accuracy: gpsAccuracy,
                    device_info: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                    },
                });

                // 3. Handle response
                const {
                    verified: backendVerified,
                    distance_meters,
                    distance_display,
                    message,
                    requires_manual_review,
                } = checkInResponse;

                setVerified(backendVerified);

                if (requires_manual_review) {
                    setManualReview(true);
                }

                toast.success(
                    backendVerified
                        ? `📍 ${message}${distance_display ? ` (${distance_display})` : ''}`
                        : `⚠️ ${message}`,
                    { duration: 5000 }
                );

                // Update distance display
                if (distance_meters != null) {
                    setDistanceToVenue(Math.round(distance_meters));
                    setWalkingTime(estimateWalkTime(distance_meters));
                }

                // Notify parent
                if (onMarkComplete) {
                    onMarkComplete({
                        entryId,
                        verified: backendVerified,
                        distanceToVenue,
                        requiresManualReview: requires_manual_review,
                    });
                }

                setRetryCount(0);
            } catch (error) {
                setRetryCount((prev) => prev + 1);

                // ── FIX: Parse HTTP error detail ──────────────────
                let errorMessage = 'Failed to verify attendance.';
                if (error.response) {
                    const detail = error.response.data?.detail;
                    if (detail) {
                        errorMessage = detail;
                    } else if (error.response.status === 403) {
                        errorMessage = 'You are not enrolled in this class.';
                    } else if (error.response.status === 422) {
                        errorMessage = 'No venue coordinates available. Please contact support.';
                    } else if (error.response.status === 400) {
                        errorMessage = 'Invalid request. Please check your input.';
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }

                toast.error(errorMessage, { duration: 6000 });
            } finally {
                setLoading(false);
                setShowStatusMenu(false);
            }
        },
        [
            entryId, loading, selectedStatus,
            venueLocation, calculateDistance, estimateWalkTime,
            distanceToVenue, walkingTime, onMarkComplete,
        ]
    );

    const handleRetry = useCallback(() => {
        handleMarkAttendance(selectedStatus);
    }, [handleMarkAttendance, selectedStatus]);

    const handleStatusSelect = useCallback(
        (status) => {
            setSelectedStatus(status);
            setShowStatusMenu(false);
            handleMarkAttendance(status);
        },
        [handleMarkAttendance]
    );

    // ═════════════════════════════════════════════════════════
    // STATUS DISPLAY HELPERS
    // ═════════════════════════════════════════════════════════

    const currentStatusData = STATUS_OPTIONS.find(
        (s) => s.value === (currentStatus || selectedStatus)
    );
    const StatusIcon = currentStatusData?.icon || FiCheckCircle;

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'LATE': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'ABSENT': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            case 'EXCUSED': return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
        }
    };

    const formatStatus = (status) => {
        if (!status) return 'Marked';
        return status.charAt(0) + status.slice(1).toLowerCase();
    };

    // ═════════════════════════════════════════════════════════
    // RENDER: ALREADY MARKED
    // ═════════════════════════════════════════════════════════

    if (isMarked) {
        return (
            <div className="flex flex-col items-end gap-1">
                <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeClass(currentStatus || 'PRESENT')}`}
                    role="status"
                    aria-label={`Attendance marked as ${formatStatus(currentStatus || 'PRESENT')}`}
                >
                    <StatusIcon className="w-4 h-4" />
                    {formatStatus(currentStatus)}
                </span>
                {attendanceRate !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiInfo className="w-3 h-3" />
                        {attendanceRate}% overall
                    </span>
                )}
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════
    // RENDER: PAST CLASS (Closed)
    // ═════════════════════════════════════════════════════════

    if (!canMark) {
        return (
            <span
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600"
                role="status"
                aria-label="Attendance closed for this class"
            >
                <FiClock className="w-4 h-4" /> Closed
            </span>
        );
    }

    // ═════════════════════════════════════════════════════════
    // RENDER: ACTIVE CHECK‑IN
    // ═════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col items-end gap-1">
            {/* ── Unit/Venue Info ────────────────────── */}
            {(unitName || venue) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {unitName && <span className="font-medium">{unitName}</span>}
                    {unitName && venue && <span className="mx-1">•</span>}
                    {venue && (
                        <span className="flex items-center gap-1 justify-end">
                            <FiMapPin className="w-3 h-3" />
                            {venue}
                        </span>
                    )}
                </div>
            )}

            {/* ── Main Button Group ──────────────────── */}
            <div className="relative" ref={buttonRef}>
                <div className="flex rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <button
                        onClick={() => handleMarkAttendance(selectedStatus)}
                        disabled={loading}
                        className={`
                            inline-flex items-center gap-2 px-5 py-2.5 rounded-l-xl text-sm font-semibold
                            transition-all transform hover:scale-105
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                            ${loading
                                ? 'bg-amber-500 text-white'
                                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white'
                            }
                        `}
                        aria-label="Mark attendance with GPS location"
                        aria-busy={loading}
                    >
                        {loading ? (
                            <>
                                <FiLoader className="w-4 h-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <FiMapPin className="w-4 h-4" />
                                Mark with GPS
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        disabled={loading}
                        className="px-2 py-2.5 bg-primary-700 hover:bg-primary-800 rounded-r-xl transition-colors disabled:opacity-50"
                        aria-label="Change attendance status"
                        aria-expanded={showStatusMenu}
                        aria-haspopup="listbox"
                    >
                        {showStatusMenu ? (
                            <FiChevronUp className="w-4 h-4 text-white" />
                        ) : (
                            <FiChevronDown className="w-4 h-4 text-white" />
                        )}
                    </button>
                </div>

                {/* ── Status Dropdown Menu (visual only – status not sent to backend) ── */}
                {showStatusMenu && (
                    <div
                        ref={menuRef}
                        className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-fadeIn"
                        role="listbox"
                        aria-label="Attendance status options"
                    >
                        {STATUS_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleStatusSelect(option.value)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                        ${selectedStatus === option.value
                                            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                                            : 'text-gray-700 dark:text-gray-300'
                                        }
                                    `}
                                    role="option"
                                    aria-selected={selectedStatus === option.value}
                                >
                                    <Icon className={`w-4 h-4 text-${option.color}-500`} />
                                    <span className="flex-1 text-left">{option.label}</span>
                                    <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">
                                        {option.shortcut}
                                    </kbd>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Status Indicators ──────────────────── */}
            <div className="flex flex-col items-end gap-0.5">
                {/* Manual review required */}
                {manualReview && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 font-medium">
                        <FiAlertTriangle className="w-3 h-3" />
                        Manual review required – poor GPS accuracy
                    </span>
                )}

                {/* Location verified */}
                {verified === true && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <FiMapPin className="w-3 h-3" />
                        Location verified
                        {distanceToVenue != null && ` • ${distanceToVenue}m`}
                        {walkingTime != null && ` • ${walkingTime}min walk`}
                    </span>
                )}

                {/* Offline saved */}
                {isOffline && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FiWifiOff className="w-3 h-3" />
                        Saved offline
                        {syncPending && ' • will sync'}
                    </span>
                )}

                {/* GPS unavailable */}
                {geoError && !loading && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FiAlertTriangle className="w-3 h-3" />
                        GPS unavailable • basic check‑in
                    </span>
                )}

                {/* GPS accuracy info */}
                {location && gpsAttempted && !geoError && (
                    <span className={`text-xs flex items-center gap-1 ${isAccuracyAcceptable() ? 'text-gray-400 dark:text-gray-500' : 'text-amber-500'}`}>
                        <FiTarget className="w-3 h-3" />
                        GPS: {getAccuracyDescription(location.accuracy)} ({Math.round(location.accuracy || 0)}m)
                    </span>
                )}

                {/* Retry button */}
                {retryCount > 0 && !loading && !isMarked && (
                    <button
                        onClick={handleRetry}
                        className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline mt-0.5"
                    >
                        <FiRefreshCw className="w-3 h-3" />
                        Retry (attempt {retryCount})
                    </button>
                )}

                {/* Attendance rate */}
                {attendanceRate !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiInfo className="w-3 h-3" />
                        {attendanceRate}% overall
                    </span>
                )}
            </div>

            {/* ── Animation Style ────────────────────── */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.15s ease-out;
                }
            `}</style>
        </div>
    );
}