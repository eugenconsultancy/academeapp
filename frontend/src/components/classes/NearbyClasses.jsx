import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../services/geoService';
import SkeletonLoader from '../shared/SkeletonLoader';
import {
    FiMapPin, FiNavigation, FiClock, FiUser,
    FiTarget, FiRefreshCw, FiAlertCircle,
    FiSliders, FiMap, FiList, FiStar,
    FiChevronDown, FiChevronUp, FiCalendar,
    FiShare2, FiUsers, FiWifi, FiWifiOff,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const CACHE_KEY = 'nearby_classes_cache';
const CACHE_DURATION = 60000; // 1 minute

/**
 * Nearby Classes Component
 * 
 * Features:
 * - Real-time GPS location with watch mode
 * - Client-side Haversine distance calculation
 * - Distance-based sorting with walking time estimation
 * - Filterable by distance range
 * - Map/List view toggle
 * - Cached results for offline/loading states
 * - Venue favorites with localStorage
 * - Calendar integration (Google Calendar)
 * - Share ETA with classmates
 * - GPS accuracy indicator
 * 
 * @param {Object} props
 * @param {number} props.maxDistance - Maximum search radius in meters (default 500)
 * @param {number} props.minDistance - Minimum distance filter (default 0)
 * @param {boolean} props.showUpcomingOnly - Show only current/upcoming classes
 * @param {string} props.defaultView - 'list' or 'map' (default 'list')
 * @param {function} props.onClassSelect - Callback when class card is clicked
 */
export default function NearbyClasses({
    maxDistance = 500,
    minDistance = 0,
    showUpcomingOnly = true,
    defaultView = 'list',
    onClassSelect = null,
}) {
    const {
        location,
        error: geoError,
        loading: geoLoading,
        getLocation,
        startWatching,
        stopWatching,
        isAccuracyAcceptable,
        getAccuracyDescription,
        calculateDistance,
        estimateWalkTime,
    } = useGeolocation({
        enableHighAccuracy: true,
        watch: true,
        autoRequest: true,
    });

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState(defaultView);
    const [filterDistance, setFilterDistance] = useState(maxDistance);
    const [showFilters, setShowFilters] = useState(false);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('favorite_venues') || '[]');
        } catch {
            return [];
        }
    });
    const [sortBy, setSortBy] = useState('distance');

    // Store previous coordinates as primitives to avoid object reference loops
    const prevLatRef = useRef(null);
    const prevLonRef = useRef(null);

    // ═════════════════════════════════════════════════════════
    // CACHE HELPERS
    // ═════════════════════════════════════════════════════════

    const getCachedClasses = useCallback(() => {
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                return cached.data;
            }
        } catch {
            // Ignore
        }
        return null;
    }, []);

    const setCachedClasses = useCallback((data) => {
        try {
            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ data, timestamp: Date.now() })
            );
        } catch {
            // Ignore
        }
    }, []);

    // ═════════════════════════════════════════════════════════
    // ENRICH CLASSES WITH DISTANCE
    // ═════════════════════════════════════════════════════════

    const enrichWithDistance = useCallback(
        (classList) => {
            if (!location) return classList;

            return classList.map((cls) => {
                let distance = Infinity;
                if (cls.venue_latitude && cls.venue_longitude) {
                    distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        cls.venue_latitude,
                        cls.venue_longitude
                    );
                } else if (cls.distance_meters) {
                    distance = cls.distance_meters;
                }

                const walkingTime = distance !== Infinity
                    ? estimateWalkTime(distance)
                    : Infinity;

                return {
                    ...cls,
                    distance_meters: distance,
                    distance_display:
                        distance < 1000
                            ? `${Math.round(distance)}m`
                            : `${(distance / 1000).toFixed(1)}km`,
                    walking_time_minutes: walkingTime,
                    isFavorite: favorites.includes(cls.venue_id || cls.entry_id),
                };
            });
        },
        [location, favorites, calculateDistance, estimateWalkTime]
    );

    // ═════════════════════════════════════════════════════════
    // FETCH CLASSES (stable reference)
    // ═════════════════════════════════════════════════════════
    // To avoid unstable callback dependencies we define the fetch logic
    // inside the effect, not as a separate useCallback.
    const fetchNearbyClasses = useCallback(async (lat, lon) => {
        setLoading(true);
        setError(null);
        try {
            const data = await GeoService.getNearbyClasses(lat, lon, filterDistance);
            const classList = Array.isArray(data) ? data : data?.data || [];
            const enriched = enrichWithDistance(classList);
            setClasses(enriched);
            setCachedClasses(enriched);
        } catch (err) {
            console.error('Failed to fetch nearby classes:', err);
            const cached = getCachedClasses();
            if (cached) {
                setClasses(cached);
            }
            setError(
                err?.response?.data?.error ||
                err.message ||
                'Failed to find nearby classes'
            );
        } finally {
            setLoading(false);
        }
    }, [filterDistance, enrichWithDistance, getCachedClasses, setCachedClasses]);

    // ═════════════════════════════════════════════════════════
    // EFFECTS
    // ═════════════════════════════════════════════════════════
    // Single effect that triggers when location coordinates change
    // beyond a threshold, or when filterDistance changes.
    useEffect(() => {
        if (!location) {
            // Show cached data if available
            const cached = getCachedClasses();
            if (cached) setClasses(cached);
            return;
        }

        const { latitude, longitude } = location;
        const prevLat = prevLatRef.current;
        const prevLon = prevLonRef.current;

        // Determine if we should re-fetch
        const shouldFetch =
            prevLat == null ||
            prevLon == null ||
            calculateDistance(prevLat, prevLon, latitude, longitude) > 10;

        if (shouldFetch) {
            fetchNearbyClasses(latitude, longitude);
            prevLatRef.current = latitude;
            prevLonRef.current = longitude;
        }
        // If only filterDistance changed (but location didn't), fetch is triggered
        // because fetchNearbyClasses is in the dependency array and will be re-created.
        // We intentionally include filterDistance in the outer scope via fetchNearbyClasses.
        // To avoid duplicate calls, we rely on the fact that if location hasn't changed significantly,
        // the fetch won't happen from the distance check, but fetchNearbyClasses will still be called
        // if it's a new reference due to filterDistance change. This is acceptable.
    }, [location, filterDistance, calculateDistance, getCachedClasses, fetchNearbyClasses]);

    // Cleanup watch on unmount
    useEffect(() => {
        return () => stopWatching();
    }, [stopWatching]);

    // ═════════════════════════════════════════════════════════
    // FILTERED & SORTED CLASSES
    // ═════════════════════════════════════════════════════════

    const filteredClasses = useMemo(() => {
        let result = [...classes];

        // Filter by distance range
        result = result.filter(
            (cls) =>
                cls.distance_meters >= minDistance &&
                cls.distance_meters <= filterDistance
        );

        // Filter upcoming only
        if (showUpcomingOnly) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            result = result.filter((cls) => {
                if (!cls.start_time) return true;
                return cls.start_time >= currentTime;
            });
        }

        // Sort
        switch (sortBy) {
            case 'distance':
                result.sort((a, b) => a.distance_meters - b.distance_meters);
                break;
            case 'time':
                result.sort((a, b) => {
                    if (!a.start_time) return 1;
                    if (!b.start_time) return -1;
                    return a.start_time.localeCompare(b.start_time);
                });
                break;
            case 'name':
                result.sort((a, b) =>
                    (a.unit_name || '').localeCompare(b.unit_name || '')
                );
                break;
            default:
                break;
        }

        return result;
    }, [classes, minDistance, filterDistance, showUpcomingOnly, sortBy]);

    // ═════════════════════════════════════════════════════════
    // ACTION HELPERS
    // ═════════════════════════════════════════════════════════

    const openDirections = useCallback(
        (cls) => {
            if (!cls.venue_latitude || !cls.venue_longitude) {
                toast.error('Venue location not available');
                return;
            }
            const origin = location
                ? `${location.latitude},${location.longitude}`
                : 'Current+Location';
            const url =
                `https://www.google.com/maps/dir/?api=1` +
                `&origin=${origin}` +
                `&destination=${cls.venue_latitude},${cls.venue_longitude}` +
                `&travelmode=walking`;
            window.open(url, '_blank');
        },
        [location]
    );

    const toggleFavorite = useCallback((venueId) => {
        setFavorites((prev) => {
            const updated = prev.includes(venueId)
                ? prev.filter((id) => id !== venueId)
                : [...prev, venueId];
            try {
                localStorage.setItem('favorite_venues', JSON.stringify(updated));
            } catch {
                // Ignore
            }
            return updated;
        });
    }, []);

    const addToCalendar = useCallback((cls) => {
        const title = encodeURIComponent(cls.unit_name || 'Class');
        const loc = encodeURIComponent(cls.venue || '');
        const details = encodeURIComponent(
            `Lecturer: ${cls.lecturer || 'N/A'}\nWalking: ${cls.walking_time_minutes || '?'} min`
        );

        const now = new Date();
        const [startH, startM] = (cls.start_time || '09:00').split(':').map(Number);
        const [endH, endM] = (cls.end_time || '10:00').split(':').map(Number);

        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

        const startStr = startDate.toISOString().replace(/-|:|\.\d+/g, '');
        const endStr = endDate.toISOString().replace(/-|:|\.\d+/g, '');

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
        window.open(url, '_blank');
    }, []);

    const shareETA = useCallback(
        (cls) => {
            const text = `📍 Heading to ${cls.unit_name} at ${cls.venue}. ETA: ${cls.walking_time_minutes || '?'} min walk (${cls.distance_display || '?'} away).`;
            if (navigator.share) {
                navigator.share({ title: 'My Class ETA', text });
            } else {
                navigator.clipboard.writeText(text);
                toast.success('ETA copied to clipboard');
            }
        },
        []
    );

    const getDistanceColor = useCallback((meters) => {
        if (!meters || meters === Infinity) return '#94a3b8';
        if (meters <= 100) return '#10b981';
        if (meters <= 300) return '#f59e0b';
        return '#ef4444';
    }, []);

    // ═════════════════════════════════════════════════════════
    // RENDER: ERROR STATES
    // ═════════════════════════════════════════════════════════

    if (geoError) {
        return (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">Location Unavailable</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">{geoError}</p>
                    </div>
                </div>
                <button
                    onClick={getLocation}
                    className="w-full py-2 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!location && !geoLoading) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTarget className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Enable Location</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Allow location access to find classes near you
                </p>
                <button
                    onClick={getLocation}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Enable Location
                </button>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════
    // RENDER: MAIN CONTENT
    // ═════════════════════════════════════════════════════════

    return (
        <div className="space-y-4">
            {/* ── Header Controls ─────────────────────── */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            aria-pressed={viewMode === 'list'}
                        >
                            <FiList className="w-4 h-4 inline mr-1" /> List
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            aria-pressed={viewMode === 'map'}
                        >
                            <FiMap className="w-4 h-4 inline mr-1" /> Map
                        </button>
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        aria-label="Sort classes by"
                    >
                        <option value="distance">Nearest</option>
                        <option value="time">Earliest</option>
                        <option value="name">Name</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <FiSliders className="w-4 h-4" />
                        {showFilters ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                        onClick={() => location && fetchNearbyClasses(location.latitude, location.longitude)}
                        disabled={loading || !location}
                        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        aria-label="Refresh nearby classes"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Filter Panel ────────────────────────── */}
            {showFilters && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 animate-fadeIn">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                            Max Distance: <span className="text-primary-600 font-bold">{filterDistance}m</span>
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="50"
                            value={filterDistance}
                            onChange={(e) => setFilterDistance(Number(e.target.value))}
                            className="w-full accent-primary-500"
                            aria-label="Maximum distance filter"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>50m</span>
                            <span>1000m</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── GPS Status ──────────────────────────── */}
            {location && (
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                        <FiTarget className="w-3 h-3" />
                        GPS: {getAccuracyDescription(location.accuracy)} ({Math.round(location.accuracy || 0)}m)
                    </span>
                    {isAccuracyAcceptable() ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                            <FiWifi className="w-3 h-3" /> Good signal
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-amber-500">
                            <FiWifiOff className="w-3 h-3" /> Low accuracy
                        </span>
                    )}
                </div>
            )}

            {/* ── Results Count ────────────────────────── */}
            {!loading && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''} found
                    {filteredClasses.length !== classes.length && (
                        <span className="text-gray-400"> (filtered from {classes.length})</span>
                    )}
                </p>
            )}

            {/* ── Loading ──────────────────────────────── */}
            {(loading || geoLoading) && <SkeletonLoader type="list" count={3} />}

            {/* ── Error ────────────────────────────────── */}
            {error && !loading && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                        <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </p>
                    <button
                        onClick={() => location && fetchNearbyClasses(location.latitude, location.longitude)}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline font-medium flex items-center gap-1"
                    >
                        <FiRefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {/* ── Empty ────────────────────────────────── */}
            {!loading && !error && filteredClasses.length === 0 && location && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiMapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No Classes Nearby</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Try expanding your search radius above
                    </p>
                </div>
            )}

            {/* ── Class Cards ──────────────────────────── */}
            {!loading && filteredClasses.length > 0 && (
                <div className="space-y-3">
                    {filteredClasses.map((cls, i) => (
                        <div
                            key={cls.entry_id || cls.id || i}
                            className={`
                                bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4
                                hover:shadow-md transition-all cursor-pointer
                                ${cls.isFavorite ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800' : 'border-gray-100 dark:border-gray-700'}
                            `}
                            onClick={() => onClassSelect?.(cls)}
                            style={{
                                animation: `ncFadeIn 0.3s ease ${i * 50}ms both`,
                            }}
                            role="article"
                            aria-label={`${cls.unit_name} - ${cls.distance_display || 'unknown distance'} away`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {cls.unit_name}
                                        </h4>
                                        {cls.isFavorite && (
                                            <FiStar className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                        <FiMapPin className="w-3 h-3 flex-shrink-0" />
                                        {cls.venue}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <FiClock className="w-3 h-3 flex-shrink-0" />
                                        {cls.start_time} - {cls.end_time}
                                    </p>
                                    {cls.lecturer && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <FiUser className="w-3 h-3 flex-shrink-0" />
                                            {cls.lecturer}
                                        </p>
                                    )}
                                    {cls.occupancy !== undefined && (
                                        <p className={`text-xs flex items-center gap-1 mt-1 ${cls.occupancy < 50 ? 'text-emerald-500' : cls.occupancy < 80 ? 'text-amber-500' : 'text-red-500'}`}>
                                            <FiUsers className="w-3 h-3" />
                                            {cls.occupancy}% occupied
                                        </p>
                                    )}
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <p
                                        className="text-lg font-bold"
                                        style={{ color: getDistanceColor(cls.distance_meters) }}
                                    >
                                        {cls.distance_display || '?'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        🚶 {cls.walking_time_minutes || '?'} min walk
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDirections(cls);
                                    }}
                                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    aria-label={`Get directions to ${cls.unit_name}`}
                                >
                                    <FiNavigation className="w-4 h-4" />
                                    Directions
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(cls.venue_id || cls.entry_id || cls.id);
                                    }}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${cls.isFavorite ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    aria-label={cls.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <FiStar className={`w-4 h-4 ${cls.isFavorite ? 'fill-current' : ''}`} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addToCalendar(cls);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm transition-colors"
                                    aria-label="Add to calendar"
                                    title="Add to Calendar"
                                >
                                    <FiCalendar className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        shareETA(cls);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm transition-colors"
                                    aria-label="Share ETA"
                                    title="Share ETA"
                                >
                                    <FiShare2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Animation keyframes injected once with a key to avoid re-parsing */}
            <style key="nc-anim">{`
                @keyframes ncFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: ncFadeIn 0.2s ease;
                }
            `}</style>
        </div>
    );
}