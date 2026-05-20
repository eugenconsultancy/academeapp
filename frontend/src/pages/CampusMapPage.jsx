import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiSearch, FiFilter, FiRefreshCw,
    FiHome, FiChevronRight, FiX, FiExternalLink, FiClock,
    FiTarget, FiArrowUp, FiAlertCircle, FiLayers, FiEye,
} from 'react-icons/fi';

export default function CampusMapPage() {
    const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [venueType, setVenueType] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [fetchError, setFetchError] = useState(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [directions, setDirections] = useState(null);

    useEffect(() => {
        getLocation();
        fetchAllVenues();
    }, []);

    // Scroll to top tracking
    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchAllVenues = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const data = await GeoService.listVenues({ limit: 100 });
            setVenues(Array.isArray(data) ? data : data?.data || []);
        } catch (err) {
            setFetchError('Failed to load venues. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchNearbyVenues = async () => {
        if (!location) return;
        setLoading(true);
        setFetchError(null);
        try {
            const data = await GeoService.getNearbyVenues(
                location.latitude, location.longitude, { limit: 30 }
            );
            setVenues(Array.isArray(data) ? data : data?.data || []);
            setSortBy('distance');
        } catch (err) {
            setFetchError('Failed to find nearby venues.');
        } finally {
            setLoading(false);
        }
    };

    const handleGetDirections = async (venue) => {
        if (!location) {
            toast.error('Enable location for directions');
            return;
        }
        try {
            const result = await GeoService.getDirections(
                location.latitude, location.longitude,
                venue.latitude, venue.longitude
            );
            setDirections(result);
            setSelectedVenue(venue);
        } catch (err) {
            toast.error('Failed to get directions');
        }
    };

    const openInMaps = (venue) => {
        if (venue.latitude && venue.longitude) {
            const url = `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
            window.open(url, '_blank');
        }
    };

    const openWalkingDirections = (venue) => {
        if (location && venue.latitude && venue.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${venue.latitude},${venue.longitude}&travelmode=walking`;
            window.open(url, '_blank');
        } else if (venue.latitude && venue.longitude) {
            openInMaps(venue);
        }
    };

    // Filter and sort
    let filteredVenues = venues.filter((v) => {
        if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (venueType && v.venue_type !== venueType) return false;
        return true;
    });

    if (sortBy === 'distance' && location) {
        filteredVenues = [...filteredVenues].sort((a, b) => (a.distance_meters || 99999) - (b.distance_meters || 99999));
    } else if (sortBy === 'name') {
        filteredVenues = [...filteredVenues].sort((a, b) => a.name.localeCompare(b.name));
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .cm-root { font-family: 'Outfit', sans-serif; max-width: 1100px; margin: 0 auto; padding: 28px 20px 80px; animation: cmIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cmIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .cm-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .cm-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .cm-breadcrumb a:hover { text-decoration: underline; }

        .cm-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .cm-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .cm-header h1 { color: #f8fafc; }

        .cm-location-info { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.12); border-radius: 10px; font-size: 0.78rem; color: #0891b2; margin-bottom: 16px; }
        .dark .cm-location-info { background: rgba(6,182,212,0.1); }

        .cm-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .cm-search { flex: 1; min-width: 180px; padding: 10px 14px 10px 36px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; outline: none; position: relative; }
        .cm-search:focus { border-color: #6366f1; }
        .dark .cm-search { background: rgba(15,23,42,0.8); border-color: #334155; color: #f8fafc; }
        .cm-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .cm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .cm-select { padding: 10px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .cm-select { background: rgba(15,23,42,0.8); border-color: #334155; color: #94a3b8; }

        .cm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .cm-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .cm-btn-primary:hover { background: #4f46e5; }
        .cm-btn-green { background: #10b981; color: #fff; }
        .cm-btn-green:hover { background: #059669; }
        .cm-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .cm-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .cm-btn-outline { border-color: #334155; color: #94a3b8; }

        .cm-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 0.82rem; font-weight: 600; }
        .cm-alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #d97706; }
        .cm-alert-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #dc2626; }

        .cm-count { font-size: 0.75rem; color: #94a3b8; margin-bottom: 16px; }

        .cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .cm-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; backdrop-filter: blur(12px); cursor: pointer; transition: all 0.2s; animation: cmIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .cm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .dark .cm-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .cm-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .cm-card-name { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
        .dark .cm-card-name { color: #f8fafc; }
        .cm-card-type { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 700; background: rgba(99,102,241,0.1); color: #6366f1; text-transform: capitalize; }
        .cm-card-meta { font-size: 0.72rem; color: #94a3b8; margin-top: 4px; }
        .cm-card-distance { font-size: 0.85rem; font-weight: 700; color: #059669; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
        .cm-card-actions { display: flex; gap: 6px; margin-top: 12px; }
        .cm-card-btn { flex: 1; padding: 8px 12px; border-radius: 8px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; }
        .cm-card-btn-maps { background: #6366f1; color: #fff; }
        .cm-card-btn-maps:hover { background: #4f46e5; }
        .cm-card-btn-dir { background: #10b981; color: #fff; }
        .cm-card-btn-dir:hover { background: #059669; }

        .cm-empty { text-align: center; padding: 64px 24px; color: #94a3b8; }

        .cm-back-top { position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%; background: #6366f1; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 40; box-shadow: 0 4px 16px rgba(99,102,241,0.4); transition: all 0.2s; }
        .cm-back-top:hover { transform: translateY(-2px); }

        /* Detail Modal */
        .cm-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .cm-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .cm-modal { position: relative; z-index: 61; width: 100%; max-width: 440px; background: rgba(255,255,255,0.96); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: cmIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; }
        .dark .cm-modal { background: rgba(12,16,24,0.96); }
        .cm-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .cm-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .cm-modal-title { color: #f8fafc; }
        .cm-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .cm-modal-body { padding: 20px 22px; }
        .cm-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; }
      `}</style>

            <div className="cm-root">
                {/* Breadcrumb */}
                <nav className="cm-breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} />
                    <span>Campus Map</span>
                </nav>

                {/* Header */}
                <div className="cm-header">
                    <div>
                        <h1>🗺️ Campus Map</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Explore campus venues and get walking directions
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={getLocation} disabled={geoLoading} className="cm-btn cm-btn-outline">
                            <FiTarget size={14} /> {geoLoading ? 'Locating...' : 'Locate Me'}
                        </button>
                        <button onClick={fetchAllVenues} className="cm-btn cm-btn-outline">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Location Status */}
                {location && (
                    <div className="cm-location-info">
                        <FiTarget size={14} />
                        Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                    </div>
                )}

                {/* Geo Error */}
                {geoError && (
                    <div className="cm-alert cm-alert-warning">
                        <FiAlertCircle size={16} /> {geoError}
                        <button onClick={getLocation} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
                    </div>
                )}

                {/* Fetch Error */}
                {fetchError && (
                    <div className="cm-alert cm-alert-error">
                        <FiAlertCircle size={16} /> {fetchError}
                        <button onClick={fetchAllVenues} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
                    </div>
                )}

                {/* Search & Filters */}
                <div className="cm-bar">
                    <div className="cm-search-wrap">
                        <FiSearch size={14} className="cm-search-icon" />
                        <input type="text" placeholder="Search venues..." value={search} onChange={e => setSearch(e.target.value)} className="cm-search" />
                    </div>
                    <select value={venueType} onChange={e => setVenueType(e.target.value)} className="cm-select">
                        <option value="">All Types</option>
                        <option value="lecture_hall">Lecture Hall</option>
                        <option value="laboratory">Laboratory</option>
                        <option value="seminar_room">Seminar Room</option>
                        <option value="library">Library</option>
                        <option value="cafeteria">Cafeteria</option>
                        <option value="office">Office</option>
                        <option value="sports">Sports Facility</option>
                        <option value="other">Other</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="cm-select">
                        <option value="name">Name A-Z</option>
                        <option value="distance">Nearest First</option>
                    </select>
                    <button onClick={location ? fetchNearbyVenues : fetchAllVenues} className="cm-btn cm-btn-green">
                        <FiNavigation size={14} /> {location ? 'Find Nearest' : 'Show All'}
                    </button>
                </div>

                {/* Count */}
                <p className="cm-count">Showing {filteredVenues.length} of {venues.length} venues</p>

                {/* Loading */}
                {loading && <SkeletonLoader type="list" count={6} />}

                {/* Venues Grid */}
                {!loading && (
                    <div className="cm-grid">
                        {filteredVenues.map((venue, i) => (
                            <div key={venue.id} className="cm-card" style={{ animationDelay: `${i * 40}ms` }}>
                                <div className="cm-card-header">
                                    <h3 className="cm-card-name">{venue.name}</h3>
                                    <span className="cm-card-type">{venue.venue_type?.replace(/_/g, ' ') || 'venue'}</span>
                                </div>
                                <div className="cm-card-meta">
                                    {venue.building_code && <span>🏢 {venue.building_code}</span>}
                                    {venue.floor && <span> • Floor {venue.floor}</span>}
                                    {venue.room_number && <span> • Room {venue.room_number}</span>}
                                </div>
                                {venue.distance_display && (
                                    <div className="cm-card-distance">
                                        <FiMapPin size={14} /> {venue.distance_display}
                                        {venue.walking_time_minutes && ` • 🚶 ${venue.walking_time_minutes} min`}
                                    </div>
                                )}
                                <div className="cm-card-actions">
                                    <button onClick={() => openInMaps(venue)} className="cm-card-btn cm-card-btn-maps">
                                        <FiExternalLink size={11} /> Maps
                                    </button>
                                    <button onClick={() => openWalkingDirections(venue)} className="cm-card-btn cm-card-btn-dir">
                                        <FiNavigation size={11} /> Directions
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && filteredVenues.length === 0 && (
                    <div className="cm-empty">
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🏫</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>No venues found</p>
                        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                            {search ? 'Try a different search term.' : 'No venues match the selected filters.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Back to Top */}
            {showBackToTop && (
                <button className="cm-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Back to top">
                    <FiArrowUp size={20} />
                </button>
            )}
        </>
    );
}