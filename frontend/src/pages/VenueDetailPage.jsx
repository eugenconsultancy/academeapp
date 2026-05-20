import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiHome, FiChevronRight, FiArrowLeft,
    FiRefreshCw, FiExternalLink, FiShare2, FiCopy, FiCheck,
    FiClock, FiTarget, FiAlertCircle, FiInfo, FiBook,
} from 'react-icons/fi';

const VENUE_TYPE_LABELS = {
    lecture_hall: 'Lecture Hall',
    laboratory: 'Laboratory',
    seminar_room: 'Seminar Room',
    office: 'Office',
    library: 'Library',
    cafeteria: 'Cafeteria',
    sports: 'Sports Facility',
    other: 'Venue',
};

export default function VenueDetailPage() {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const { location, getLocation } = useGeolocation();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [directions, setDirections] = useState(null);
    const [directionsLoading, setDirectionsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [distance, setDistance] = useState(null);

    useEffect(() => {
        getLocation();
        fetchVenue();
    }, [venueId]);

    // Calculate distance when both venue and location are available
    useEffect(() => {
        if (location && venue?.latitude && venue?.longitude) {
            const dist = GeoService.calculateDistance ?
                null : // Will be set by getDirections
                null;
            // Use the geo service to calculate
            GeoService.getDirections(location.latitude, location.longitude, venue.latitude, venue.longitude)
                .then(data => {
                    if (data?.distance_meters) {
                        setDistance({
                            meters: data.distance_meters,
                            display: data.distance_display,
                            walkingTime: data.walking_time_minutes,
                        });
                    }
                })
                .catch(() => { });
        }
    }, [location, venue]);

    const fetchVenue = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await GeoService.getVenue(venueId);
            setVenue(data?.data || data);
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Failed to load venue');
        } finally {
            setLoading(false);
        }
    };

    const handleGetDirections = async () => {
        if (!location) {
            toast.error('Enable location to get directions');
            getLocation();
            return;
        }
        if (!venue?.latitude) {
            toast.error('No coordinates available for this venue');
            return;
        }
        setDirectionsLoading(true);
        try {
            const data = await GeoService.getDirections(
                location.latitude, location.longitude,
                venue.latitude, venue.longitude
            );
            const result = data?.data || data;
            setDirections(result);
            setDistance({
                meters: result.distance_meters,
                display: result.distance_display,
                walkingTime: result.walking_time_minutes,
            });
            if (result.maps_url) window.open(result.maps_url, '_blank');
        } catch (err) {
            toast.error('Failed to get directions');
        } finally {
            setDirectionsLoading(false);
        }
    };

    const openInMaps = () => {
        if (venue?.latitude && venue?.longitude) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`, '_blank');
        }
    };

    const openWalkingDirections = () => {
        if (location && venue?.latitude && venue?.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${venue.latitude},${venue.longitude}&travelmode=walking`, '_blank');
        } else {
            openInMaps();
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleCopyCoordinates = () => {
        if (venue?.latitude && venue?.longitude) {
            navigator.clipboard.writeText(`${venue.latitude}, ${venue.longitude}`).then(() => {
                toast.success('Coordinates copied!');
            });
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto"><SkeletonLoader type="detail" /></div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiAlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h2>
                    <p className="text-red-500 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={fetchVenue} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2">
                            <FiRefreshCw size={16} /> Try Again
                        </button>
                        <Link to="/campus-map" className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">
                            <FiArrowLeft size={16} /> Back to Map
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Not Found
    if (!venue) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiInfo className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Venue Not Found</h2>
                    <p className="text-gray-500 mb-6">This venue doesn't exist or has been removed.</p>
                    <Link to="/campus-map" className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl inline-flex items-center gap-2">
                        <FiMapPin size={16} /> Browse Campus Map
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .vd-root { font-family: 'Outfit', sans-serif; max-width: 680px; margin: 0 auto; padding: 28px 20px 80px; animation: vdIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes vdIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .vd-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .vd-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }

        .vd-card { background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 28px; backdrop-filter: blur(20px); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
        .dark .vd-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .vd-title { font-size: clamp(1.3rem, 3vw, 1.7rem); font-weight: 900; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.03em; }
        .dark .vd-title { color: #f8fafc; }
        .vd-type-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; background: rgba(99,102,241,0.1); color: #6366f1; margin-bottom: 20px; text-transform: capitalize; }

        .vd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        @media (max-width: 480px) { .vd-grid { grid-template-columns: 1fr; } }
        .vd-detail { padding: 12px; background: rgba(0,0,0,0.02); border-radius: 12px; }
        .dark .vd-detail { background: rgba(255,255,255,0.03); }
        .vd-detail-label { font-size: 0.68rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
        .vd-detail-value { font-size: 0.88rem; font-weight: 700; color: #0f172a; }
        .dark .vd-detail-value { color: #f8fafc; }

        .vd-coords { padding: 14px; background: rgba(6,182,212,0.04); border: 1px solid rgba(6,182,212,0.1); border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
        .vd-coords-text { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #0891b2; }
        .vd-coords-copy { background: none; border: none; color: #0891b2; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .vd-coords-copy:hover { background: rgba(6,182,212,0.1); }

        .vd-distance { display: flex; align-items: center; gap: 10px; padding: 14px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.12); border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; font-weight: 700; color: #059669; }
        .dark .vd-distance { background: rgba(16,185,129,0.1); }

        .vd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .vd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 12px 20px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .vd-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.25); flex: 1; justify-content: center; }
        .vd-btn-primary:hover { transform: translateY(-1px); }
        .vd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .vd-btn-green { background: #10b981; color: #fff; flex: 1; justify-content: center; }
        .vd-btn-green:hover { background: #059669; }
        .vd-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .vd-btn-outline:hover { background: rgba(0,0,0,0.03); }
        .dark .vd-btn-outline { border-color: #334155; color: #94a3b8; }
        .vd-btn-icon { width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
      `}</style>

            <div className="vd-root">
                {/* Breadcrumb */}
                <nav className="vd-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/campus-map"><FiMapPin size={13} /> Campus Map</Link>
                    <FiChevronRight size={12} />
                    <span>{venue.name?.substring(0, 30)}</span>
                </nav>

                <div className="vd-card">
                    {/* Type Badge */}
                    <span className="vd-type-badge">
                        🏫 {VENUE_TYPE_LABELS[venue.venue_type] || venue.venue_type || 'Venue'}
                    </span>

                    {/* Title */}
                    <h1 className="vd-title">{venue.name}</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>{venue.institution}</p>

                    {/* Details Grid */}
                    <div className="vd-grid">
                        {venue.building_code && (
                            <div className="vd-detail">
                                <div className="vd-detail-label">Building Code</div>
                                <div className="vd-detail-value">{venue.building_code}</div>
                            </div>
                        )}
                        {venue.floor !== null && venue.floor !== undefined && (
                            <div className="vd-detail">
                                <div className="vd-detail-label">Floor</div>
                                <div className="vd-detail-value">{venue.floor}</div>
                            </div>
                        )}
                        {venue.room_number && (
                            <div className="vd-detail">
                                <div className="vd-detail-label">Room</div>
                                <div className="vd-detail-value">{venue.room_number}</div>
                            </div>
                        )}
                        <div className="vd-detail">
                            <div className="vd-detail-label">Type</div>
                            <div className="vd-detail-value" style={{ textTransform: 'capitalize' }}>
                                {venue.venue_type?.replace(/_/g, ' ') || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Coordinates */}
                    {venue.latitude && venue.longitude && (
                        <div className="vd-coords">
                            <span className="vd-coords-text">
                                {venue.latitude.toFixed(6)}, {venue.longitude.toFixed(6)}
                            </span>
                            <button onClick={handleCopyCoordinates} className="vd-coords-copy" title="Copy coordinates">
                                <FiCopy size={14} />
                            </button>
                        </div>
                    )}

                    {/* Distance from current location */}
                    {distance && (
                        <div className="vd-distance">
                            <FiTarget size={18} />
                            <span>{distance.display} • 🚶 {distance.walkingTime} min walk from you</span>
                        </div>
                    )}

                    {/* Directions result */}
                    {directions && (
                        <div className="vd-distance" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                            <FiNavigation size={18} />
                            <span>{directions.distance_display} • {directions.walking_time_minutes} min walk</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="vd-actions">
                        <button
                            onClick={handleGetDirections}
                            disabled={directionsLoading || !location}
                            className="vd-btn vd-btn-primary"
                        >
                            {directionsLoading ? (
                                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Getting Directions...</>
                            ) : (
                                <><FiNavigation size={16} /> Get Walking Directions</>
                            )}
                        </button>
                        <button onClick={openInMaps} className="vd-btn vd-btn-outline vd-btn-icon" title="Open in Google Maps">
                            <FiExternalLink size={16} />
                        </button>
                        <button onClick={handleCopyLink} className="vd-btn vd-btn-outline vd-btn-icon" title="Share venue">
                            {copied ? <FiCheck size={16} /> : <FiShare2 size={16} />}
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {location && venue.latitude && venue.longitude && (
                            <button onClick={openWalkingDirections} className="vd-btn vd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                                🚶 Walking Directions in Maps
                            </button>
                        )}
                        <Link to="/campus-map" className="vd-btn vd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                            <FiMapPin size={14} /> Back to Map
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}