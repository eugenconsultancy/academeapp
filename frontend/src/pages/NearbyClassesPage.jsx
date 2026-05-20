import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import { classesApi } from '../api/classesApi';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiRefreshCw, FiTarget,
    FiHome, FiChevronRight, FiBook, FiClock, FiUser,
    FiArrowLeft, FiSliders, FiArrowUp, FiAlertCircle,
    FiCheckCircle, FiExternalLink,
} from 'react-icons/fi';

export default function NearbyClassesPage() {
    const navigate = useNavigate();
    const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [radius, setRadius] = useState(500);
    const [sortBy, setSortBy] = useState('distance');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [markingId, setMarkingId] = useState(null);

    useEffect(() => { getLocation(); }, []);
    useEffect(() => { if (location) fetchNearbyClasses(); }, [location, radius]);
    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchNearbyClasses = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const data = await GeoService.getNearbyClasses(location.latitude, location.longitude, radius);
            setClasses(Array.isArray(data) ? data : data?.data || []);
        } catch (err) {
            setApiError(err?.response?.data?.error || err.message || 'Failed to find nearby classes');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (entryId) => {
        setMarkingId(entryId);
        try {
            await classesApi.markAttendance(entryId);
            toast.success('Attendance marked!');
            fetchNearbyClasses();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to mark attendance');
        } finally {
            setMarkingId(null);
        }
    };

    const openDirections = (cls) => {
        if (location) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${cls.venue_latitude},${cls.venue_longitude}&travelmode=walking`;
            window.open(url, '_blank');
        }
    };

    // Sort classes
    let sortedClasses = [...classes];
    if (sortBy === 'distance') sortedClasses.sort((a, b) => a.distance_meters - b.distance_meters);
    if (sortBy === 'time') sortedClasses.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    const getDistanceColor = (meters) => {
        if (meters <= 100) return '#10b981';
        if (meters <= 300) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .nc-root { font-family: 'Outfit', sans-serif; max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; animation: ncIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ncIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .nc-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .nc-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .nc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .nc-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .nc-header h1 { color: #f8fafc; }

        .nc-location-bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.12); border-radius: 12px; margin-bottom: 16px; font-size: 0.8rem; color: #0891b2; flex-wrap: wrap; }
        .dark .nc-location-bar { background: rgba(6,182,212,0.1); }

        .nc-controls { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .nc-radius-slider { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
        .nc-radius-slider input[type="range"] { flex: 1; accent-color: #6366f1; }
        .nc-radius-label { font-size: 0.75rem; font-weight: 700; color: #64748b; white-space: nowrap; }
        .nc-select { padding: 8px 12px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .nc-select { background: rgba(15,23,42,0.8); border-color: #334155; color: #94a3b8; }

        .nc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .nc-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .nc-btn-primary:hover { background: #4f46e5; }
        .nc-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .nc-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .nc-btn-outline { border-color: #334155; color: #94a3b8; }

        .nc-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 0.82rem; font-weight: 600; }
        .nc-alert-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #dc2626; }
        .nc-alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #d97706; }

        .nc-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; backdrop-filter: blur(12px); margin-bottom: 10px; transition: all 0.2s; animation: ncIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .nc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .dark .nc-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .nc-card-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .nc-card-info { flex: 1; min-width: 0; }
        .nc-card-name { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
        .dark .nc-card-name { color: #f8fafc; }
        .nc-card-meta { font-size: 0.78rem; color: #94a3b8; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 8px; }
        .nc-card-meta span { display: flex; align-items: center; gap: 3px; }
        .nc-card-distance { text-align: right; flex-shrink: 0; }
        .nc-card-dist-val { font-size: 1.1rem; font-weight: 900; }
        .nc-card-dist-time { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
        .nc-card-actions { display: flex; gap: 6px; margin-top: 12px; }
        .nc-card-btn { flex: 1; padding: 8px 12px; border-radius: 8px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; }
        .nc-card-btn-dir { background: #6366f1; color: #fff; }
        .nc-card-btn-dir:hover { background: #4f46e5; }
        .nc-card-btn-mark { background: #10b981; color: #fff; }
        .nc-card-btn-mark:hover { background: #059669; }
        .nc-card-btn-mark:disabled { opacity: 0.6; cursor: not-allowed; }

        .nc-empty { text-align: center; padding: 64px 24px; color: #94a3b8; }
        .nc-back-top { position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%; background: #6366f1; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 40; box-shadow: 0 4px 16px rgba(99,102,241,0.4); transition: all 0.2s; }
        .nc-back-top:hover { transform: translateY(-2px); }
      `}</style>

            <div className="nc-root">
                {/* Breadcrumb */}
                <nav className="nc-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <Link to="/classes"><FiBook size={13} /> Classes</Link>
                    <FiChevronRight size={12} />
                    <span>Nearby</span>
                </nav>

                {/* Header */}
                <div className="nc-header">
                    <div>
                        <h1>📍 Nearby Classes</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Find classes near your current location
                        </p>
                    </div>
                    <button onClick={() => { getLocation(); }} disabled={geoLoading} className="nc-btn nc-btn-primary">
                        <FiRefreshCw size={14} /> {geoLoading ? 'Locating...' : 'Refresh'}
                    </button>
                </div>

                {/* Location Bar */}
                {location && (
                    <div className="nc-location-bar">
                        <FiTarget size={14} />
                        Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                    </div>
                )}

                {/* Geo Error */}
                {geoError && (
                    <div className="nc-alert nc-alert-warning">
                        <FiAlertCircle size={16} /> {geoError}
                        <button onClick={getLocation} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Retry</button>
                    </div>
                )}

                {/* API Error */}
                {apiError && (
                    <div className="nc-alert nc-alert-error">
                        <FiAlertCircle size={16} /> {apiError}
                        <button onClick={fetchNearbyClasses} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Retry</button>
                    </div>
                )}

                {/* Controls */}
                <div className="nc-controls">
                    <div className="nc-radius-slider">
                        <FiTarget size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <input type="range" min={100} max={2000} step={100} value={radius} onChange={e => setRadius(parseInt(e.target.value))} />
                        <span className="nc-radius-label">{radius}m</span>
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="nc-select">
                        <option value="distance">Nearest First</option>
                        <option value="time">By Start Time</option>
                    </select>
                </div>

                {/* Loading */}
                {loading && <SkeletonLoader type="list" count={4} />}

                {/* Classes List */}
                {!loading && sortedClasses.length > 0 && (
                    <div>
                        {sortedClasses.map((cls, i) => (
                            <div key={cls.entry_id} className="nc-card" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="nc-card-row">
                                    <div className="nc-card-info">
                                        <h3 className="nc-card-name">{cls.unit_name}</h3>
                                        <div className="nc-card-meta">
                                            <span><FiMapPin size={11} />{cls.venue}</span>
                                            <span><FiClock size={11} />{cls.start_time} - {cls.end_time}</span>
                                            {cls.lecturer && <span><FiUser size={11} />{cls.lecturer}</span>}
                                        </div>
                                    </div>
                                    <div className="nc-card-distance">
                                        <div className="nc-card-dist-val" style={{ color: getDistanceColor(cls.distance_meters) }}>
                                            {cls.distance_display}
                                        </div>
                                        <div className="nc-card-dist-time">🚶 {cls.walking_time_minutes} min walk</div>
                                    </div>
                                </div>
                                <div className="nc-card-actions">
                                    <button onClick={() => openDirections(cls)} className="nc-card-btn nc-card-btn-dir">
                                        <FiNavigation size={11} /> Directions
                                    </button>
                                    <button
                                        onClick={() => handleMarkAttendance(cls.entry_id)}
                                        disabled={markingId === cls.entry_id}
                                        className="nc-card-btn nc-card-btn-mark"
                                    >
                                        {markingId === cls.entry_id ? 'Marking...' : <><FiCheckCircle size={11} /> Check In</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && !apiError && sortedClasses.length === 0 && location && (
                    <div className="nc-empty">
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🗺️</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>No classes found nearby</p>
                        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Try increasing the search radius or check back during class hours.</p>
                        <Link to="/classes" className="nc-btn nc-btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
                            <FiBook size={14} /> Go to My Classes
                        </Link>
                    </div>
                )}

                {/* No Location */}
                {!location && !geoLoading && !geoError && (
                    <div className="nc-empty">
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>📍</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>Enable location to find nearby classes</p>
                        <button onClick={getLocation} className="nc-btn nc-btn-primary" style={{ marginTop: 20 }}>
                            <FiTarget size={14} /> Enable Location
                        </button>
                    </div>
                )}
            </div>

            {/* Back to Top */}
            {showBackToTop && (
                <button className="nc-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Back to top">
                    <FiArrowUp size={20} />
                </button>
            )}
        </>
    );
}