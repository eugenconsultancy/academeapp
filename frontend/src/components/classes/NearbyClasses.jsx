import { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../api/geoService';
import SkeletonLoader from '../shared/SkeletonLoader';
import {
    FiMapPin, FiNavigation, FiClock, FiUser,
    FiTarget, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';

/**
 * Nearby Classes Component
 * 
 * Finds today's classes near the student's current GPS location.
 * Shows distance, walking time, and provides directions.
 * 
 * @param {number} maxDistance - Search radius in meters (default 500)
 * @param {function} onClassSelect - Callback when a class card is clicked
 */
export default function NearbyClasses({ maxDistance = 500, onClassSelect }) {
    const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        getLocation();
    }, []);

    useEffect(() => {
        if (location) {
            fetchNearbyClasses();
        }
    }, [location, maxDistance]);

    const fetchNearbyClasses = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await GeoService.getNearbyClasses(
                location.latitude,
                location.longitude,
                maxDistance
            );
            setClasses(Array.isArray(data) ? data : data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Failed to find nearby classes');
        } finally {
            setLoading(false);
        }
    };

    const openDirections = (cls) => {
        if (location) {
            const url = `https://www.google.com/maps/dir/?api=1` +
                `&origin=${location.latitude},${location.longitude}` +
                `&destination=${cls.venue_latitude},${cls.venue_longitude}` +
                `&travelmode=walking`;
            window.open(url, '_blank');
        }
    };

    const getDistanceColor = (meters) => {
        if (meters <= 100) return '#10b981';
        if (meters <= 300) return '#f59e0b';
        return '#ef4444';
    };

    // Geo Error State
    if (geoError) {
        return (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                    {geoError}
                </p>
                <button
                    onClick={getLocation}
                    className="mt-2 text-sm text-amber-600 dark:text-amber-400 underline hover:no-underline font-medium"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // No Location State
    if (!location && !geoLoading) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiTarget className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Enable location to find nearby classes</p>
                <button onClick={getLocation} className="mt-2 text-sm text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium">
                    Enable Location
                </button>
            </div>
        );
    }

    // Loading State
    if (loading || geoLoading) {
        return <SkeletonLoader type="list" count={3} />;
    }

    // API Error State
    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </p>
                <button onClick={fetchNearbyClasses} className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline font-medium flex items-center gap-1">
                    <FiRefreshCw size={12} /> Retry
                </button>
            </div>
        );
    }

    // Empty State
    if (classes.length === 0 && location) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiMapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No classes found nearby</p>
                <p className="text-sm mt-1">Try expanding your search radius</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {classes.map((cls, i) => (
                <div
                    key={cls.entry_id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onClassSelect?.(cls)}
                    style={{ animation: `ncFadeIn 0.3s ease ${i * 50}ms both` }}
                >
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                {cls.unit_name}
                            </h4>
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
                        </div>

                        <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold" style={{ color: getDistanceColor(cls.distance_meters) }}>
                                {cls.distance_display}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                🚶 {cls.walking_time_minutes} min walk
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openDirections(cls);
                        }}
                        className="mt-3 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <FiNavigation className="w-4 h-4" />
                        Get Walking Directions
                    </button>
                </div>
            ))}
            <style>{`@keyframes ncFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
        </div>
    );
}