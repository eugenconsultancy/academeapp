import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiHome, FiChevronRight, FiArrowLeft,
    FiRefreshCw, FiExternalLink, FiShare2, FiCopy, FiCheck,
    FiClock, FiTarget, FiAlertCircle, FiInfo, FiBook,
    FiStar, FiUsers, FiWifi, FiMonitor, FiThermometer
} from 'react-icons/fi';

// ─── Client‑side distance helpers ──────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(meters) {
    if (meters == null) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}

function estimateWalkTime(meters) {
    return Math.round(meters / 1.4 / 60);
}

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
    const { location, getLocation, loading: geoLoading } = useGeolocation();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [directions, setDirections] = useState(null);
    const [directionsLoading, setDirectionsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [distance, setDistance] = useState(null);
    const [nearbyVenues, setNearbyVenues] = useState([]);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [venueSchedule, setVenueSchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('venue_favorites') || '[]');
        } catch {
            return [];
        }
    });
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    useEffect(() => {
        getLocation();
        fetchVenue();
        setDirections(null);
        setDistance(null);
        setNearbyVenues([]);
        setVenueSchedule([]);
    }, [venueId]);

    useEffect(() => {
        localStorage.setItem('venue_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const fetchVenue = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await GeoService.getVenue(venueId);
            const v = data?.data || data;
            setVenue(v);
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Failed to load venue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!location || !venue?.latitude || !venue?.longitude) {
            setDistance(null);
            return;
        }
        const meters = haversineDistance(
            location.latitude, location.longitude,
            venue.latitude, venue.longitude
        );
        setDistance({
            meters,
            display: formatDistance(meters),
            walkingTime: estimateWalkTime(meters),
        });
    }, [location, venue]);

    // ✅ FIXED: use GeoService.getVenueSchedule, not classesApi
    useEffect(() => {
        if (!venue) return;
        const fetchSchedule = async () => {
            setScheduleLoading(true);
            try {
                const res = await GeoService.getVenueSchedule(venueId);
                setVenueSchedule(Array.isArray(res) ? res : res?.data || []);
            } catch {
                setVenueSchedule([]);
            } finally {
                setScheduleLoading(false);
            }
        };
        fetchSchedule();
    }, [venue, venueId]);

    useEffect(() => {
        if (!venue?.latitude || !venue?.longitude) return;
        const fetchNearby = async () => {
            setNearbyLoading(true);
            try {
                const data = await GeoService.getNearbyVenues(
                    venue.latitude, venue.longitude,
                    { limit: 5 }
                );
                setNearbyVenues(Array.isArray(data) ? data : data?.data || []);
            } catch {
                setNearbyVenues([]);
            } finally {
                setNearbyLoading(false);
            }
        };
        fetchNearby();
    }, [venue]);

    const handleGetDirections = async () => {
        if (!location) {
            toast.error('Please enable location to get directions');
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
            if (result.distance_meters) {
                setDistance({
                    meters: result.distance_meters,
                    display: result.distance_display,
                    walkingTime: result.walking_time_minutes,
                });
            }
            if (result.maps_url) {
                window.open(result.maps_url, '_blank');
            }
        } catch (err) {
            toast.error('Failed to get directions');
        } finally {
            setDirectionsLoading(false);
        }
    };

    const openInMaps = () => {
        if (venue?.latitude && venue?.longitude) {
            window.open(
                `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`,
                '_blank'
            );
        }
    };

    const openWalkingDirections = () => {
        if (location && venue?.latitude && venue?.longitude) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${venue.latitude},${venue.longitude}&travelmode=walking`,
                '_blank'
            );
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

    const shareViaWhatsApp = () => {
        const text = `Check out ${venue.name} on campus: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent(`Campus Venue: ${venue.name}`);
        const body = encodeURIComponent(
            `Venue: ${venue.name}\nType: ${VENUE_TYPE_LABELS[venue.venue_type] || 'N/A'}\nLink: ${window.location.href}`
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const isFavorite = favorites.includes(venueId);
    const toggleFavorite = () => {
        setFavorites((prev) =>
            prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <SkeletonLoader type="card" count={1} />
                </div>
            </div>
        );
    }

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
                        <button
                            onClick={fetchVenue}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2"
                        >
                            <FiRefreshCw size={16} /> Try Again
                        </button>
                        <Link
                            to="/campus-map"
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <FiArrowLeft size={16} /> Back to Map
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!venue) {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiInfo className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Venue Not Found</h2>
                    <p className="text-gray-500 mb-6">This venue doesn't exist or has been removed.</p>
                    <Link
                        to="/campus-map"
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl inline-flex items-center gap-2"
                    >
                        <FiMapPin size={16} /> Browse Campus Map
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
        .vd-root {
            font-family: 'Outfit', system-ui, -apple-system, sans-serif;
            max-width: 720px;
            margin: 0 auto;
            padding: 28px 20px 80px;
            animation: vdIn .4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes vdIn { from {opacity:0;transform:translateY(16px)} to {opacity:1;transform:translateY(0)} }

        .vd-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .vd-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }

        .vd-card {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 22px;
            padding: 28px;
            backdrop-filter: blur(20px);
            box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08);
            margin-bottom: 20px;
        }
        .dark .vd-card { background: rgba(12,16,24,0.92); border-color: rgba(255,255,255,0.06); }

        .vd-title { font-size: clamp(1.3rem, 3vw, 1.7rem); font-weight: 900; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.03em; }
        .dark .vd-title { color: #f8fafc; }
        .vd-type-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; background: rgba(99,102,241,0.1); color: #6366f1; margin-bottom: 20px; text-transform: capitalize; }
        .vd-subtitle { color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px; }

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
        .vd-distance-alt { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.12); color: #6366f1; }

        .vd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .vd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 12px 20px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .vd-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.25); flex: 1; justify-content: center; }
        .vd-btn-primary:hover { transform: translateY(-1px); }
        .vd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .vd-btn-green { background: #10b981; color: #fff; flex: 1; justify-content: center; }
        .vd-btn-green:hover { background: #059669; }
        .vd-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .vd-btn-outline:hover { background: rgba(0,0,0,0.03); }
        .dark .vd-btn-outline { border-color: #334155; color: #94a3b8; }
        .vd-btn-icon { width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .vd-btn-fav { color: #f59e0b; border-color: #f59e0b; }

        .vd-section { margin-top: 24px; }
        .vd-section-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .dark .vd-section-title { color: #f8fafc; }

        .vd-schedule-list { display: flex; flex-direction: column; gap: 8px; }
        .vd-schedule-item { padding: 10px; background: rgba(0,0,0,0.02); border-radius: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; font-size: 0.82rem; }
        .dark .vd-schedule-item { background: rgba(255,255,255,0.03); }

        .vd-nearby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
        .vd-nearby-item { padding: 10px; background: rgba(0,0,0,0.02); border-radius: 10px; text-decoration: none; color: inherit; transition: all 0.15s; }
        .vd-nearby-item:hover { background: rgba(99,102,241,0.06); transform: translateY(-1px); }
        .dark .vd-nearby-item { background: rgba(255,255,255,0.03); }

        .vd-share-menu { position: absolute; bottom: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); overflow: hidden; z-index: 10; }
        .dark .vd-share-menu { background: #1e293b; border-color: #334155; }
        .vd-share-item { display: block; width: 100%; padding: 10px 14px; background: none; border: none; font-size: 0.82rem; cursor: pointer; text-align: left; color: #0f172a; }
        .vd-share-item:hover { background: rgba(0,0,0,0.03); }
        .dark .vd-share-item { color: #f8fafc; }
        .dark .vd-share-item:hover { background: rgba(255,255,255,0.04); }
        `}</style>

            <div className="vd-root">
                <nav className="vd-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/campus-map"><FiMapPin size={13} /> Campus Map</Link>
                    <FiChevronRight size={12} />
                    <span>{venue.name?.substring(0, 30)}</span>
                </nav>

                <div className="vd-card">
                    <span className="vd-type-badge">
                        🏫 {VENUE_TYPE_LABELS[venue.venue_type] || venue.venue_type || 'Venue'}
                    </span>
                    <h1 className="vd-title">{venue.name}</h1>
                    <p className="vd-subtitle">{venue.institution || 'N/A'}</p>

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

                    {distance && !directions && (
                        <div className="vd-distance">
                            <FiTarget size={18} />
                            <span>{distance.display} • 🚶 {distance.walkingTime} min walk from you</span>
                        </div>
                    )}

                    {/* ✅ FIXED: directions now shows the simple distance result from backend */}
                    {directions && (
                        <div className="vd-distance vd-distance-alt">
                            <FiNavigation size={18} />
                            <span>
                                {directions.distance_display} • {directions.walking_time_minutes} min walk
                            </span>
                        </div>
                    )}

                    <div className="vd-actions">
                        <button
                            onClick={handleGetDirections}
                            disabled={directionsLoading || !location}
                            className="vd-btn vd-btn-primary"
                        >
                            {directionsLoading ? (
                                <>Loading...</>
                            ) : (
                                <><FiNavigation size={16} /> Get Walking Directions</>
                            )}
                        </button>
                        <button onClick={openInMaps} className="vd-btn vd-btn-outline vd-btn-icon" title="Open in Google Maps">
                            <FiExternalLink size={16} />
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowShareMenu(!showShareMenu)} className="vd-btn vd-btn-outline vd-btn-icon" title="Share venue">
                                {copied ? <FiCheck size={16} /> : <FiShare2 size={16} />}
                            </button>
                            {showShareMenu && (
                                <div className="vd-share-menu">
                                    <button className="vd-share-item" onClick={() => { handleCopyLink(); setShowShareMenu(false); }}><FiCopy size={14} /> Copy Link</button>
                                    <button className="vd-share-item" onClick={() => { shareViaWhatsApp(); setShowShareMenu(false); }}>💬 WhatsApp</button>
                                    <button className="vd-share-item" onClick={() => { shareViaEmail(); setShowShareMenu(false); }}>✉️ Email</button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={toggleFavorite}
                            className={`vd-btn vd-btn-outline vd-btn-icon ${isFavorite ? 'vd-btn-fav' : ''}`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <FiStar size={16} fill={isFavorite ? '#f59e0b' : 'none'} />
                        </button>
                    </div>

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

                <div className="vd-card">
                    <div className="vd-section">
                        <h3 className="vd-section-title"><FiBook size={18} /> Today's Classes</h3>
                        {scheduleLoading ? (
                            <SkeletonLoader type="list" count={2} />
                        ) : venueSchedule.length > 0 ? (
                            <div className="vd-schedule-list">
                                {(showFullSchedule ? venueSchedule : venueSchedule.slice(0, 3)).map((cls, idx) => (
                                    <div key={idx} className="vd-schedule-item">
                                        <span className="font-semibold" style={{ color: '#0f172a', fontWeight: 700 }}>{cls.unit_name}</span>
                                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{cls.start_time} - {cls.end_time}</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{cls.lecturer || 'N/A'}</span>
                                    </div>
                                ))}
                                {venueSchedule.length > 3 && !showFullSchedule && (
                                    <button onClick={() => setShowFullSchedule(true)} className="vd-btn vd-btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                        View all {venueSchedule.length} classes
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No classes scheduled for today.</p>
                        )}
                    </div>
                </div>

                {nearbyVenues.length > 0 && (
                    <div className="vd-card">
                        <div className="vd-section">
                            <h3 className="vd-section-title"><FiMapPin size={18} /> Nearby Venues</h3>
                            {nearbyLoading ? (
                                <SkeletonLoader type="list" count={3} />
                            ) : (
                                <div className="vd-nearby-grid">
                                    {nearbyVenues.slice(0, 4).map((nv) => (
                                        <Link key={nv.id} to={`/venues/${nv.id}`} className="vd-nearby-item">
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{nv.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                                                {nv.distance_display || (nv.distance_meters ? formatDistance(nv.distance_meters) : '')}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}