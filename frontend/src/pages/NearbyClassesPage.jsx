import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import { attendanceService } from '../services/attendanceService';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiRefreshCw, FiTarget,
    FiHome, FiChevronRight, FiBook, FiClock, FiUser,
    FiArrowLeft, FiSliders, FiArrowUp, FiAlertCircle,
    FiCheckCircle, FiExternalLink, FiWifi, FiWifiOff,
    FiStar, FiCalendar, FiShare2, FiX, FiInfo,
    FiMap, FiList, FiFilter, FiChevronDown
} from 'react-icons/fi';

// Attendance status options
const ATTENDANCE_STATUSES = [
    { value: 'PRESENT', label: 'Present', icon: '✅', color: '#10b981' },
    { value: 'LATE', label: 'Late', icon: '⏰', color: '#f59e0b' },
    { value: 'ABSENT', label: 'Absent', icon: '❌', color: '#ef4444' },
    { value: 'EXCUSED', label: 'Excused', icon: '📝', color: '#8b5cf6' },
];

function NearbyClassesContent() {
    const navigate = useNavigate();
    const {
        location,
        error: geoError,
        loading: geoLoading,
        getLocation,
        calculateDistance,
        estimateWalkTime,
    } = useGeolocation();

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [radius, setRadius] = useState(500);
    const [sortBy, setSortBy] = useState('distance');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [markingStatus, setMarkingStatus] = useState(null);
    const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('ncFavorites') || '[]');
        } catch {
            return [];
        }
    });
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [showStatusPicker, setShowStatusPicker] = useState(null);
    const [retryQueue, setRetryQueue] = useState([]);
    const [gpsAccuracyLevel, setGpsAccuracyLevel] = useState('unknown');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Update online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Calculate GPS accuracy level
    useEffect(() => {
        if (location?.accuracy) {
            if (location.accuracy < 30) setGpsAccuracyLevel('Good');
            else if (location.accuracy < 100) setGpsAccuracyLevel('Fair');
            else setGpsAccuracyLevel('Poor');
        }
    }, [location]);

    // Get location on mount
    useEffect(() => {
        getLocation();
    }, []);

    // Fetch classes when location or radius changes
    useEffect(() => {
        if (location) fetchNearbyClasses();
    }, [location, radius]);

    // Scroll handler for back-to-top button
    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Save favorites to localStorage
    useEffect(() => {
        localStorage.setItem('ncFavorites', JSON.stringify(favorites));
    }, [favorites]);

    // Fetch nearby classes from API
    const fetchNearbyClasses = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const data = await GeoService.getNearbyClasses(
                location.latitude,
                location.longitude,
                radius
            );
            const rawClasses = Array.isArray(data) ? data : data?.data || [];

            // Enrich with client-side distance calculations
            const enriched = rawClasses.map(cls => {
                if (!cls.venue_latitude || !cls.venue_longitude) return cls;
                const distance = calculateDistance(
                    location.latitude,
                    location.longitude,
                    cls.venue_latitude,
                    cls.venue_longitude
                );
                const walkTime = estimateWalkTime(distance);
                return {
                    ...cls,
                    distance_meters: distance,
                    distance_display: distance < 1000
                        ? `${Math.round(distance)}m`
                        : `${(distance / 1000).toFixed(1)}km`,
                    walking_time_minutes: walkTime,
                };
            });

            setClasses(enriched);
        } catch (err) {
            setApiError(err?.response?.data?.error || err.message || 'Failed to find nearby classes');
            toast.error('Failed to load nearby classes');
        } finally {
            setLoading(false);
        }
    };

    // Handle attendance marking with status and GPS verification
    const handleMarkAttendance = async (entryId, status = 'PRESENT') => {
        // GPS proximity verification
        const classData = classes.find(c => c.entry_id === entryId);
        if (classData?.venue_latitude && classData?.venue_longitude && location) {
            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                classData.venue_latitude,
                classData.venue_longitude
            );

            // Warn if too far (configurable threshold, e.g., 200m)
            const MAX_DISTANCE_FOR_CHECKIN = 200;
            if (distance > MAX_DISTANCE_FOR_CHECKIN) {
                const proceed = window.confirm(
                    `You appear to be ${Math.round(distance)}m from the venue. ` +
                    `Are you sure you want to mark attendance?`
                );
                if (!proceed) return;
            }
        }

        setMarkingId(entryId);
        setMarkingStatus(status);

        try {
            const result = await attendanceService.markAttendance(entryId, { status });

            if (result.offline) {
                toast.success(`Attendance saved offline (${status.toLowerCase()})`, {
                    icon: '📱',
                    duration: 4000,
                });
                setRetryQueue(prev => [...prev, entryId]);
            } else {
                toast.success(`Marked as ${status.toLowerCase()}`, {
                    icon: '✅',
                    duration: 3000,
                });
            }

            // Refresh the list
            await fetchNearbyClasses();
            setShowStatusPicker(null);
        } catch (err) {
            const errorMessage = err?.response?.data?.error || err.message || 'Failed to mark attendance';
            toast.error(errorMessage, {
                icon: '❌',
                duration: 4000,
            });

            // Add to retry queue for manual retry
            if (err.message?.includes('network') || err.message?.includes('fetch')) {
                setRetryQueue(prev => [...prev, entryId]);
                toast.error('Will retry when online', { icon: '🔄' });
            }
        } finally {
            setMarkingId(null);
            setMarkingStatus(null);
        }
    };

    // Retry failed attendance marking
    const retryMarkAttendance = async (entryId) => {
        setRetryQueue(prev => prev.filter(id => id !== entryId));
        await handleMarkAttendance(entryId);
    };

    // Open directions in Google Maps
    const openDirections = useCallback((cls) => {
        if (location && cls.venue_latitude && cls.venue_longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${cls.venue_latitude},${cls.venue_longitude}&travelmode=walking`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }, [location]);

    // Toggle favorite
    const toggleFavorite = (entryId) => {
        setFavorites(prev =>
            prev.includes(entryId)
                ? prev.filter(id => id !== entryId)
                : [...prev, entryId]
        );
        toast.success(
            favorites.includes(entryId) ? 'Removed from favorites' : 'Added to favorites',
            { duration: 2000 }
        );
    };

    // Share ETA
    const shareETA = async (cls) => {
        if (!cls.walking_time_minutes) return;

        const shareText = `I'm ${cls.walking_time_minutes} min away from ${cls.unit_name} at ${cls.venue}. Walking ETA: ${new Date(Date.now() + cls.walking_time_minutes * 60000).toLocaleTimeString()}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My ETA',
                    text: shareText,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(shareText);
            toast.success('ETA copied to clipboard!');
        }
    };

    // Add to calendar (basic implementation)
    const addToCalendar = (cls) => {
        const startTime = cls.start_time || '09:00';
        const endTime = cls.end_time || '10:00';
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);

        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cls.unit_name)}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Venue: ${cls.venue}\nLecturer: ${cls.lecturer || 'N/A'}`)}&location=${encodeURIComponent(cls.venue)}`;

        window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    };

    // Filter and sort classes
    const processedClasses = useMemo(() => {
        let filtered = [...classes];

        // Filter upcoming only
        if (showUpcomingOnly) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            filtered = filtered.filter(cls => {
                if (!cls.start_time) return true;
                const [h, m] = cls.start_time.split(':').map(Number);
                const classTime = h * 60 + m;
                // Show classes starting within next 30 minutes or upcoming
                return classTime >= currentTime - 30;
            });
        }

        // Sort favorites first
        filtered.sort((a, b) => {
            const aFav = favorites.includes(a.entry_id) ? 1 : 0;
            const bFav = favorites.includes(b.entry_id) ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;

            if (sortBy === 'distance') {
                return (a.distance_meters || Infinity) - (b.distance_meters || Infinity);
            }
            if (sortBy === 'time') {
                return (a.start_time || '').localeCompare(b.start_time || '');
            }
            return 0;
        });

        return filtered;
    }, [classes, showUpcomingOnly, sortBy, favorites]);

    // Get color based on distance
    const getDistanceColor = (meters) => {
        if (!meters && meters !== 0) return '#94a3b8';
        if (meters <= 100) return '#10b981';
        if (meters <= 300) return '#f59e0b';
        return '#ef4444';
    };

    // Get GPS accuracy color
    const getAccuracyColor = () => {
        switch (gpsAccuracyLevel) {
            case 'Good': return '#10b981';
            case 'Fair': return '#f59e0b';
            case 'Poor': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-500 mb-6" aria-label="Breadcrumb">
                    <Link to="/" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 transition-colors">
                        <FiHome size={14} aria-hidden="true" />
                        Home
                    </Link>
                    <FiChevronRight size={12} aria-hidden="true" />
                    <Link to="/classes" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 transition-colors">
                        <FiBook size={14} aria-hidden="true" />
                        Classes
                    </Link>
                    <FiChevronRight size={12} aria-hidden="true" />
                    <span className="text-slate-600 dark:text-slate-300">Nearby</span>
                </nav>

                {/* Header with offline indicator */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            📍 Nearby Classes
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Find classes near your current location
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Offline/Online indicator */}
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{
                                background: isOffline ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                color: isOffline ? '#ef4444' : '#10b981'
                            }}
                            role="status"
                            aria-label={isOffline ? 'Offline mode' : 'Online'}
                        >
                            {isOffline ? <FiWifiOff size={12} /> : <FiWifi size={12} />}
                            {isOffline ? 'Offline' : 'Online'}
                        </div>

                        {/* Refresh button */}
                        <button
                            onClick={async () => {
                                await getLocation();
                                fetchNearbyClasses();
                            }}
                            disabled={geoLoading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                            aria-label="Refresh location and classes"
                        >
                            <FiRefreshCw size={14} className={geoLoading ? 'animate-spin' : ''} />
                            {geoLoading ? 'Locating...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* GPS Location Bar with accuracy */}
                {location && (
                    <div
                        className="flex items-center gap-3 px-4 py-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl mb-4 text-sm font-medium"
                        role="status"
                        aria-live="polite"
                    >
                        <FiTarget size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-cyan-700 dark:text-cyan-300">
                            Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </span>
                        {location.accuracy && (
                            <span
                                className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{
                                    background: `${getAccuracyColor()}20`,
                                    color: getAccuracyColor()
                                }}
                            >
                                GPS: {gpsAccuracyLevel} (±{Math.round(location.accuracy)}m)
                            </span>
                        )}
                    </div>
                )}

                {/* Geo Error */}
                {geoError && (
                    <div
                        className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4 text-sm font-medium text-amber-700 dark:text-amber-400"
                        role="alert"
                    >
                        <FiAlertCircle size={16} className="flex-shrink-0" />
                        <span className="flex-1">{geoError}</span>
                        <button
                            onClick={getLocation}
                            className="font-bold underline hover:no-underline transition-all"
                            aria-label="Retry getting location"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* API Error with retry */}
                {apiError && (
                    <div
                        className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm font-medium text-red-700 dark:text-red-400"
                        role="alert"
                    >
                        <FiAlertCircle size={16} className="flex-shrink-0" />
                        <span className="flex-1">{apiError}</span>
                        <button
                            onClick={fetchNearbyClasses}
                            className="font-bold underline hover:no-underline transition-all"
                            aria-label="Retry fetching classes"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700">
                    {/* Radius Slider */}
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <FiTarget size={16} className="text-slate-400 flex-shrink-0" />
                        <input
                            type="range"
                            min={100}
                            max={2000}
                            step={100}
                            value={radius}
                            onChange={e => setRadius(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            aria-label={`Search radius: ${radius} meters`}
                        />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 text-right">
                            {radius}m
                        </span>
                    </div>

                    {/* Sort Select */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        aria-label="Sort classes by"
                    >
                        <option value="distance">Nearest First</option>
                        <option value="time">By Start Time</option>
                    </select>

                    {/* Upcoming Only Toggle */}
                    <button
                        onClick={() => setShowUpcomingOnly(!showUpcomingOnly)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${showUpcomingOnly
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                            }`}
                        aria-pressed={showUpcomingOnly}
                        aria-label="Filter upcoming classes only"
                    >
                        <FiFilter size={14} />
                        Upcoming
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-3" role="status" aria-label="Loading classes">
                        <SkeletonLoader type="card" count={4} />
                        <span className="sr-only">Loading nearby classes...</span>
                    </div>
                )}

                {/* Classes List */}
                {!loading && processedClasses.length > 0 && (
                    <div className="space-y-3" role="list" aria-label="Nearby classes list">
                        {processedClasses.map((cls, i) => {
                            const isFavorite = favorites.includes(cls.entry_id);
                            const isInRetryQueue = retryQueue.includes(cls.entry_id);
                            const distanceColor = getDistanceColor(cls.distance_meters);

                            return (
                                <div
                                    key={cls.entry_id}
                                    className="group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                    role="listitem"
                                    aria-label={`${cls.unit_name} at ${cls.venue}`}
                                >
                                    {/* Favorite Star */}
                                    <button
                                        onClick={() => toggleFavorite(cls.entry_id)}
                                        className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all ${isFavorite
                                            ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                                            : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
                                            }`}
                                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        <FiStar size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                                    </button>

                                    <div className="flex justify-between items-start gap-4 pr-8">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                {cls.unit_name}
                                            </h3>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <FiMapPin size={11} className="flex-shrink-0" />
                                                    {cls.venue}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FiClock size={11} className="flex-shrink-0" />
                                                    {cls.start_time} - {cls.end_time}
                                                </span>
                                                {cls.lecturer && (
                                                    <span className="flex items-center gap-1">
                                                        <FiUser size={11} className="flex-shrink-0" />
                                                        {cls.lecturer}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Distance Badge */}
                                        <div className="text-right flex-shrink-0">
                                            <div
                                                className="text-xl font-black"
                                                style={{ color: distanceColor }}
                                            >
                                                {cls.distance_display || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                🚶 {cls.walking_time_minutes || '?'} min walk
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {/* Directions */}
                                        <button
                                            onClick={() => openDirections(cls)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors"
                                            aria-label={`Get directions to ${cls.venue}`}
                                        >
                                            <FiNavigation size={12} />
                                            Directions
                                        </button>

                                        {/* Share ETA */}
                                        <button
                                            onClick={() => shareETA(cls)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                                            aria-label="Share walking ETA"
                                        >
                                            <FiShare2 size={12} />
                                            Share ETA
                                        </button>

                                        {/* Calendar */}
                                        <button
                                            onClick={() => addToCalendar(cls)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                                            aria-label="Add to calendar"
                                        >
                                            <FiCalendar size={12} />
                                            Calendar
                                        </button>

                                        {/* Retry if failed */}
                                        {isInRetryQueue && (
                                            <button
                                                onClick={() => retryMarkAttendance(cls.entry_id)}
                                                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold transition-colors"
                                                aria-label="Retry attendance marking"
                                            >
                                                <FiRefreshCw size={12} />
                                                Retry
                                            </button>
                                        )}

                                        {/* Attendance Button with Status Picker */}
                                        <div className="relative ml-auto">
                                            <button
                                                onClick={() => setShowStatusPicker(showStatusPicker === cls.entry_id ? null : cls.entry_id)}
                                                disabled={markingId === cls.entry_id}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                                                aria-label="Mark attendance"
                                                aria-expanded={showStatusPicker === cls.entry_id}
                                            >
                                                {markingId === cls.entry_id ? (
                                                    <>Marking...</>
                                                ) : (
                                                    <>
                                                        <FiCheckCircle size={12} />
                                                        Check In
                                                        <FiChevronDown size={12} className="ml-1" />
                                                    </>
                                                )}
                                            </button>

                                            {/* Status Picker Dropdown */}
                                            {showStatusPicker === cls.entry_id && (
                                                <div
                                                    className="absolute bottom-full right-0 mb-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in"
                                                    role="menu"
                                                    aria-label="Attendance status options"
                                                >
                                                    {ATTENDANCE_STATUSES.map(status => (
                                                        <button
                                                            key={status.value}
                                                            onClick={() => handleMarkAttendance(cls.entry_id, status.value)}
                                                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                            style={{ color: status.color }}
                                                            role="menuitem"
                                                        >
                                                            <span>{status.icon}</span>
                                                            {status.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !apiError && processedClasses.length === 0 && location && (
                    <div className="text-center py-16 px-4" role="status">
                        <span className="text-6xl block mb-4" aria-hidden="true">🗺️</span>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">
                            No classes found nearby
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                            {showUpcomingOnly
                                ? 'No upcoming classes within range. Try showing all classes or increasing the radius.'
                                : 'Try increasing the search radius or check back during class hours.'
                            }
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 mt-6">
                            {showUpcomingOnly && (
                                <button
                                    onClick={() => setShowUpcomingOnly(false)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                                >
                                    <FiFilter size={14} />
                                    Show All Classes
                                </button>
                            )}
                            <Link
                                to="/classes"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors"
                            >
                                <FiBook size={14} />
                                Go to My Classes
                            </Link>
                        </div>
                    </div>
                )}

                {/* No Location */}
                {!location && !geoLoading && !geoError && (
                    <div className="text-center py-16 px-4" role="status">
                        <span className="text-6xl block mb-4" aria-hidden="true">📍</span>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">
                            Enable location to find nearby classes
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                            We need your location to show classes near you.
                        </p>
                        <button
                            onClick={getLocation}
                            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold mt-6 transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                        >
                            <FiTarget size={16} />
                            Enable Location
                        </button>
                    </div>
                )}
            </div>

            {/* Back to Top Button */}
            {showBackToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all z-50 hover:-translate-y-1"
                    aria-label="Back to top"
                >
                    <FiArrowUp size={20} />
                </button>
            )}
        </div>
    );
}

// Wrap with error boundary
export default function NearbyClassesPage() {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                    <div className="text-center">
                        <span className="text-5xl block mb-4">⚠️</span>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            There was an error loading the nearby classes page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            }
        >
            <NearbyClassesContent />
        </ErrorBoundary>
    );
}