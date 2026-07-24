// frontend/src/pages/NearbyClassesPage.jsx
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
    FiMap, FiList, FiFilter, FiChevronDown, FiAlertTriangle
} from 'react-icons/fi';

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
        permissionStatus,
    } = useGeolocation();

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [radius, setRadius] = useState(500);
    const [sortBy, setSortBy] = useState('distance');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('ncFavorites') || '[]');
        } catch {
            return [];
        }
    });
    const [showStatusPicker, setShowStatusPicker] = useState(null);
    const [manualReviewMap, setManualReviewMap] = useState({});
    const [gpsAccuracyLevel, setGpsAccuracyLevel] = useState('unknown');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

    useEffect(() => {
        if (location?.accuracy) {
            if (location.accuracy < 30) setGpsAccuracyLevel('Good');
            else if (location.accuracy < 100) setGpsAccuracyLevel('Fair');
            else setGpsAccuracyLevel('Poor');
        }
    }, [location]);

    useEffect(() => {
        getLocation();
    }, []);

    useEffect(() => {
        if (location) fetchNearbyClasses();
    }, [location, radius]);

    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        localStorage.setItem('ncFavorites', JSON.stringify(favorites));
    }, [favorites]);

    const fetchNearbyClasses = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const data = await GeoService.getNearbyClasses(location.latitude, location.longitude, radius);
            const rawClasses = Array.isArray(data) ? data : data?.data || [];
            setClasses(rawClasses);
        } catch (err) {
            const detail = err.response?.data?.detail || err.message || 'Failed to find nearby classes';
            setApiError(detail);
            toast.error(detail);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (entryId, status = 'PRESENT') => {
        setMarkingId(entryId);
        try {
            const result = await attendanceService.markAttendance(entryId, { requireGps: true });
            if (result.offline) {
                toast.success(`Attendance saved offline (${status.toLowerCase()})`, { duration: 4000 });
            } else {
                toast.success(result.message || `Marked as ${status.toLowerCase()}`, { duration: 3000 });
                if (result.requires_manual_review) {
                    setManualReviewMap(prev => ({ ...prev, [entryId]: true }));
                    toast('Attendance submitted for manual review', { icon: '🟡', duration: 5000 });
                }
            }
        } catch (err) {
            const detail = err.response?.data?.detail || err.message || 'Failed to mark attendance';
            toast.error(detail, { duration: 4000 });
        } finally {
            setMarkingId(null);
            setShowStatusPicker(null);
        }
    };

    const openDirections = async (cls) => {
        if (!location) {
            toast.error('Location not available');
            return;
        }
        try {
            const result = await GeoService.getClassDirections(cls.entry_id, location.latitude, location.longitude);
            if (result?.maps_url) {
                window.open(result.maps_url, '_blank', 'noopener,noreferrer');
            } else {
                toast.error('Could not load directions URL.');
            }
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to get directions';
            toast.error(detail);
        }
    };

    const toggleFavorite = (entryId) => {
        setFavorites(prev =>
            prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId]
        );
        toast.success(favorites.includes(entryId) ? 'Removed from favorites' : 'Added to favorites', { duration: 2000 });
    };

    const shareETA = async (cls) => {
        if (!cls.walking_time_minutes) return;
        const text = `I'm ${cls.walking_time_minutes} min away from ${cls.unit_name} at ${cls.venue}. Walking ETA: ${new Date(Date.now() + cls.walking_time_minutes * 60000).toLocaleTimeString()}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'My ETA', text });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(text);
            toast.success('ETA copied to clipboard!');
        }
    };

    const addToCalendar = (cls) => {
        const startTime = cls.start_time || '09:00';
        const endTime = cls.end_time || '10:00';
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cls.unit_name)}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Venue: ${cls.venue}\nLecturer: ${cls.lecturer || 'N/A'}`)}&location=${encodeURIComponent(cls.venue)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const processedClasses = useMemo(() => {
        let filtered = [...classes];
        if (showUpcomingOnly) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            filtered = filtered.filter(cls => {
                if (!cls.start_time) return true;
                const [h, m] = cls.start_time.split(':').map(Number);
                return (h * 60 + m) >= currentTime - 30;
            });
        }
        filtered.sort((a, b) => {
            const aFav = favorites.includes(a.entry_id) ? 1 : 0;
            const bFav = favorites.includes(b.entry_id) ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;
            if (sortBy === 'distance') return (a.distance_meters || Infinity) - (b.distance_meters || Infinity);
            if (sortBy === 'time') return (a.start_time || '').localeCompare(b.start_time || '');
            return 0;
        });
        return filtered;
    }, [classes, showUpcomingOnly, sortBy, favorites]);

    const getDistanceColor = (meters) => {
        if (!meters && meters !== 0) return '#94a3b8';
        if (meters <= 100) return '#10b981';
        if (meters <= 300) return '#f59e0b';
        return '#ef4444';
    };

    const getAccuracyColor = () => {
        switch (gpsAccuracyLevel) {
            case 'Good': return '#10b981';
            case 'Fair': return '#f59e0b';
            case 'Poor': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!location && !geoLoading) {
        if (permissionStatus === 'denied') {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                    <div className="text-center max-w-md">
                        <FiMapPin size={48} className="mx-auto text-slate-400 mb-4" />
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Location Access Denied</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            To see nearby classes, allow location access in your browser or device settings.
                        </p>
                        <button onClick={getLocation} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition">
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                <div className="text-center">
                    <FiTarget size={48} className="mx-auto text-slate-400 mb-4" />
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Enable Location</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        We need your location to find nearby classes.
                    </p>
                    <button onClick={getLocation} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition">
                        Enable Location
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-500 mb-6">
                    <Link to="/" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 transition">
                        <FiHome size={14} /> Home
                    </Link>
                    <FiChevronRight size={12} />
                    <Link to="/classes" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 transition">
                        <FiBook size={14} /> Classes
                    </Link>
                    <FiChevronRight size={12} />
                    <span className="text-slate-600 dark:text-slate-300">Nearby</span>
                </nav>

                {/* Header */}
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
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isOffline ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isOffline ? <FiWifiOff size={12} /> : <FiWifi size={12} />}
                            {isOffline ? 'Offline' : 'Online'}
                        </div>
                        <button onClick={async () => { await getLocation(); fetchNearbyClasses(); }} disabled={geoLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition">
                            <FiRefreshCw size={14} className={geoLoading ? 'animate-spin' : ''} />
                            {geoLoading ? 'Locating...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* GPS Bar */}
                {location && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl mb-4 text-sm font-medium" role="status">
                        <FiTarget size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-cyan-700 dark:text-cyan-300">
                            Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </span>
                        {location.accuracy && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${getAccuracyColor()}20`, color: getAccuracyColor() }}>
                                GPS: {gpsAccuracyLevel} (±{Math.round(location.accuracy)}m)
                            </span>
                        )}
                    </div>
                )}

                {/* Geo Error */}
                {geoError && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4 text-sm font-medium text-amber-700 dark:text-amber-400" role="alert">
                        <FiAlertCircle size={16} className="flex-shrink-0" />
                        <span className="flex-1">{geoError}</span>
                        <button onClick={getLocation} className="font-bold underline hover:no-underline">Retry</button>
                    </div>
                )}

                {/* API Error */}
                {apiError && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm font-medium text-red-700 dark:text-red-400" role="alert">
                        <FiAlertCircle size={16} className="flex-shrink-0" />
                        <span className="flex-1">{apiError}</span>
                        <button onClick={fetchNearbyClasses} className="font-bold underline hover:no-underline">Retry</button>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <FiTarget size={16} className="text-slate-400" />
                        <input type="range" min={100} max={2000} step={100} value={radius} onChange={e => setRadius(parseInt(e.target.value))} className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg accent-indigo-500" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 text-right">{radius}m</span>
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <option value="distance">Nearest First</option>
                        <option value="time">By Start Time</option>
                    </select>
                    <button onClick={() => setShowUpcomingOnly(!showUpcomingOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition ${showUpcomingOnly ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}>
                        <FiFilter size={14} /> Upcoming
                    </button>
                </div>

                {/* Loading */}
                {loading && <div className="space-y-3"><SkeletonLoader type="card" count={4} /></div>}

                {/* Class list */}
                {!loading && processedClasses.length > 0 && (
                    <div className="space-y-3">
                        {processedClasses.map((cls, i) => {
                            const isFavorite = favorites.includes(cls.entry_id);
                            const isManualReview = manualReviewMap[cls.entry_id];
                            const distanceColor = getDistanceColor(cls.distance_meters);
                            return (
                                <div key={cls.entry_id} className="group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-xl transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                                    <button onClick={() => toggleFavorite(cls.entry_id)} className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'}`}>
                                        <FiStar size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                                    </button>

                                    <div className="flex justify-between items-start gap-4 pr-8">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{cls.unit_name}</h3>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1"><FiMapPin size={11} />{cls.venue}</span>
                                                <span className="flex items-center gap-1"><FiClock size={11} />{cls.start_time} - {cls.end_time}</span>
                                                {cls.lecturer && <span className="flex items-center gap-1"><FiUser size={11} />{cls.lecturer}</span>}
                                            </div>
                                            {isManualReview && (
                                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                                    <FiAlertTriangle size={11} /> Pending Review
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xl font-black" style={{ color: distanceColor }}>{cls.distance_display || 'N/A'}</div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">🚶 {cls.walking_time_minutes || '?'} min walk</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <button onClick={() => openDirections(cls)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition"><FiNavigation size={12} /> Directions</button>
                                        <button onClick={() => shareETA(cls)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"><FiShare2 size={12} /> Share ETA</button>
                                        <button onClick={() => addToCalendar(cls)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"><FiCalendar size={12} /> Calendar</button>

                                        <div className="relative ml-auto">
                                            <button onClick={() => setShowStatusPicker(showStatusPicker === cls.entry_id ? null : cls.entry_id)} disabled={markingId === cls.entry_id} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold"><FiCheckCircle size={12} /> Check In <FiChevronDown size={12} /></button>
                                            {showStatusPicker === cls.entry_id && (
                                                <div className="absolute bottom-full right-0 mb-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50">
                                                    {ATTENDANCE_STATUSES.map(status => (
                                                        <button key={status.value} onClick={() => handleMarkAttendance(cls.entry_id, status.value)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition" style={{ color: status.color }}>
                                                            <span>{status.icon}</span> {status.label}
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

                {/* Empty state */}
                {!loading && !apiError && processedClasses.length === 0 && location && (
                    <div className="text-center py-16 px-4">
                        <span className="text-6xl block mb-4">🗺️</span>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No classes found nearby</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                            {showUpcomingOnly ? 'No upcoming classes within range. Try showing all classes or increasing the radius.' : 'Try increasing the search radius or check back during class hours.'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 mt-6">
                            {showUpcomingOnly && <button onClick={() => setShowUpcomingOnly(false)} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold"><FiFilter size={14} /> Show All</button>}
                            <Link to="/classes" className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold"><FiBook size={14} /> My Classes</Link>
                        </div>
                    </div>
                )}
            </div>

            {showBackToTop && (
                <button onClick={scrollToTop} className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg z-50 flex items-center justify-center">
                    <FiArrowUp size={20} />
                </button>
            )}
        </div>
    );
}

export default function NearbyClassesPage() {
    return (
        <ErrorBoundary fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                <div className="text-center">
                    <span className="text-5xl block mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Something went wrong</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">There was an error loading the nearby classes page.</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold">Reload Page</button>
                </div>
            </div>
        }>
            <NearbyClassesContent />
        </ErrorBoundary>
    );
}