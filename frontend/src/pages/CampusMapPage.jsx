import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import GeoService from '../api/geoService';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiMapPin, FiNavigation, FiSearch, FiFilter, FiRefreshCw,
    FiHome, FiChevronRight, FiX, FiExternalLink, FiClock,
    FiTarget, FiArrowUp, FiAlertCircle, FiStar, FiShare2,
    FiList, FiMap, FiCopy
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// ─── Haversine distance (client‑side) ─────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function estimateWalkTime(meters) {
    return Math.round(meters / 1.4 / 60);
}

function formatDistance(meters) {
    if (!meters && meters !== 0) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}

// Component to control map view when location changes
function ChangeMapView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0 && center[1] !== 0) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

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
    const [directionLoading, setDirectionLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('campus_favorites') || '[]'); }
        catch { return []; }
    });
    const [recentSearches, setRecentSearches] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('campus_recent_searches') || '[]'); }
        catch { return []; }
    });
    const [showShareToast, setShowShareToast] = useState(false);

    useEffect(() => {
        getLocation();        // request location on mount
        fetchAllVenues();
    }, []);

    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        localStorage.setItem('campus_favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        sessionStorage.setItem('campus_recent_searches', JSON.stringify(recentSearches));
    }, [recentSearches]);

    const fetchAllVenues = async () => {
        setLoading(true); setFetchError(null);
        try {
            const data = await GeoService.listVenues({ limit: 100 });
            setVenues(Array.isArray(data) ? data : data?.data || []);
        } catch (err) {
            setFetchError('Failed to load venues. Please try again.');
        } finally { setLoading(false); }
    };

    const fetchNearbyVenues = async () => {
        if (!location) {
            toast.error('Please enable location first');
            return;
        }
        setLoading(true); setFetchError(null);
        try {
            const data = await GeoService.getNearbyVenues(location.latitude, location.longitude, { limit: 30 });
            setVenues(Array.isArray(data) ? data : data?.data || []);
            setSortBy('distance');
        } catch (err) {
            setFetchError('Failed to find nearby venues.');
        } finally { setLoading(false); }
    };

    const handleGetDirections = async (venue) => {
        if (!location) { toast.error('Enable location for directions'); return; }
        setDirectionLoading(true);
        try {
            const result = await GeoService.getDirections(
                location.latitude, location.longitude,
                venue.latitude, venue.longitude
            );
            setDirections({ ...result, venueName: venue.name });
            setSelectedVenue(venue);
        } catch (err) {
            toast.error('Failed to get directions');
        } finally { setDirectionLoading(false); }
    };

    const openInMaps = (venue) => {
        if (venue.latitude && venue.longitude) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`, '_blank');
        }
    };

    const openWalkingDirections = (venue) => {
        if (location && venue.latitude && venue.longitude) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${venue.latitude},${venue.longitude}&travelmode=walking`,
                '_blank'
            );
        } else { openInMaps(venue); }
    };

    const enrichedVenues = useMemo(() => {
        if (!venues.length) return [];
        return venues.map((venue) => {
            if (!venue.latitude || !venue.longitude || !location) return venue;
            const distance = calculateDistance(location.latitude, location.longitude, venue.latitude, venue.longitude);
            return { ...venue, distance_meters: distance, distance_display: formatDistance(distance), walking_time_minutes: estimateWalkTime(distance) };
        });
    }, [venues, location]);

    const filteredVenues = useMemo(() => {
        let list = enrichedVenues.filter((v) => {
            if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (venueType && v.venue_type !== venueType) return false;
            return true;
        });
        if (sortBy === 'distance' && location) list = [...list].sort((a, b) => (a.distance_meters || 99999) - (b.distance_meters || 99999));
        else if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }, [enrichedVenues, search, venueType, sortBy, location]);

    const toggleFavorite = (venueId) => {
        setFavorites((prev) => prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]);
    };
    const isFavorite = (venueId) => favorites.includes(venueId);

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        if (search.trim()) {
            setRecentSearches((prev) => {
                const filtered = prev.filter((s) => s !== search.trim());
                return [search.trim(), ...filtered].slice(0, 5);
            });
        }
    };
    const clearRecentSearches = () => setRecentSearches([]);

    const handleShareVenue = (venue) => {
        const url = `${window.location.origin}/venues/${venue.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        });
    };

    const closeDirections = () => { setDirections(null); setSelectedVenue(null); };

    const handleLocateMe = async () => {
        await getLocation();
        if (location) {
            toast.success('Location updated');
        } else if (geoError) {
            toast.error(`Location error: ${geoError}`);
        } else {
            toast.error('Could not get your location. Please check GPS permissions.');
        }
    };

    const centerMap = location ? [location.latitude, location.longitude] : [0, 0];
    const mapZoom = location ? 16 : 13;

    return (
        <>
            <style>{`
        .cm-root { font-family: 'Outfit', system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 28px 20px 80px; animation: cmIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cmIn { from {opacity:0;transform:translateY(16px)} to {opacity:1;transform:translateY(0)} }
        .cm-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #94a3b8; margin-bottom: 24px; flex-wrap: wrap; }
        .cm-breadcrumb a { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .cm-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .cm-header h1 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .dark .cm-header h1 { color: #f8fafc; }
        .cm-view-toggle { display: flex; background: rgba(0,0,0,0.03); border-radius: 10px; overflow: hidden; }
        .cm-view-btn { flex: 1; padding: 8px 14px; border: none; background: transparent; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; color: #64748b; display: flex; align-items: center; gap: 6px; justify-content: center; transition: all 0.15s; }
        .cm-view-btn.active { background: #6366f1; color: #fff; }
        .cm-location-info { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.12); border-radius: 10px; font-size: 0.78rem; color: #0891b2; margin-bottom: 16px; }
        .cm-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .cm-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .cm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .cm-search { width: 100%; padding: 10px 14px 10px 36px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.84rem; outline: none; }
        .cm-search:focus { border-color: #6366f1; }
        .dark .cm-search { background: rgba(15,23,42,0.8); border-color: #334155; color: #f8fafc; }
        .cm-select { padding: 10px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; }
        .dark .cm-select { background: rgba(15,23,42,0.8); border-color: #334155; color: #94a3b8; }
        .cm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .cm-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
        .cm-btn-green { background: #10b981; color: #fff; }
        .cm-btn-outline { background: transparent; border: 1.5px solid #e2e8f0; color: #64748b; }
        .cm-btn-outline:hover { background: rgba(99,102,241,0.04); border-color: #6366f1; color: #6366f1; }
        .dark .cm-btn-outline { border-color: #334155; color: #94a3b8; }
        .cm-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 0.82rem; font-weight: 600; }
        .cm-alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #d97706; }
        .cm-alert-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #dc2626; }
        .cm-count { font-size: 0.75rem; color: #94a3b8; margin-bottom: 16px; }
        .cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .cm-card { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 18px; backdrop-filter: blur(12px); transition: all 0.2s; animation: cmIn .4s cubic-bezier(0.16,1,0.3,1) both; }
        .cm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .dark .cm-card { background: rgba(15,23,42,0.85); border-color: rgba(255,255,255,0.05); }
        .cm-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .cm-card-name { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
        .dark .cm-card-name { color: #f8fafc; }
        .cm-card-type { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 700; background: rgba(99,102,241,0.1); color: #6366f1; text-transform: capitalize; }
        .cm-card-meta { font-size: 0.72rem; color: #94a3b8; margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .cm-card-distance { font-size: 0.85rem; font-weight: 700; color: #059669; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
        .cm-card-actions { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
        .cm-card-btn { flex: 1; padding: 8px 12px; border-radius: 8px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .cm-card-btn-maps { background: #6366f1; color: #fff; }
        .cm-card-btn-dir { background: #10b981; color: #fff; }
        .cm-card-btn-fav { background: transparent; border: 1px solid #e2e8f0; color: #f59e0b; }
        .cm-empty { text-align: center; padding: 64px 24px; color: #94a3b8; }
        .cm-map-wrapper { border-radius: 16px; overflow: hidden; margin-bottom: 16px; height: 500px; }
        .cm-map-container { height: 100%; width: 100%; }
        .leaflet-container { font-family: 'Outfit', sans-serif; }
        .cm-modal-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .cm-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); }
        .cm-modal { position: relative; z-index: 61; width: 100%; max-width: 520px; background: rgba(255,255,255,0.96); border-radius: 24px; backdrop-filter: blur(28px); box-shadow: 0 24px 64px rgba(0,0,0,0.18); animation: cmIn .22s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; max-height: 90vh; overflow-y: auto; }
        .dark .cm-modal { background: rgba(12,16,24,0.96); }
        .cm-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .cm-modal-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .dark .cm-modal-title { color: #f8fafc; }
        .cm-modal-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        .cm-modal-body { padding: 20px 22px; }
        .cm-modal-footer { padding: 0 22px 20px; display: flex; gap: 10px; flex-wrap: wrap; }
        .cm-fav-section { margin-bottom: 16px; }
        .cm-fav-title { font-weight: 600; font-size: 0.8rem; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .cm-recent-wrap { position: absolute; top: 100%; left: 0; right: 0; z-index: 20; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); margin-top: 4px; overflow: hidden; }
        .cm-recent-item { padding: 10px 14px; cursor: pointer; font-size: 0.82rem; display: flex; justify-content: space-between; }
        .cm-recent-item:hover { background: rgba(99,102,241,0.04); }
        .cm-recent-clear { padding: 8px; text-align: center; color: #ef4444; cursor: pointer; font-weight: 600; font-size: 0.75rem; }
        .cm-back-top { position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%; background: #6366f1; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 40; box-shadow: 0 4px 16px rgba(99,102,241,0.4); transition: all 0.2s; }
        .cm-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; z-index: 100; animation: cmIn .2s ease; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
        `}</style>

            <div className="cm-root">
                <nav className="cm-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/"><FiHome size={13} /> Home</Link>
                    <FiChevronRight size={12} aria-hidden="true" />
                    <span>Campus Map</span>
                </nav>

                <div className="cm-header">
                    <div>
                        <h1>🗺️ Campus Map</h1>
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                            Explore campus venues, get walking directions, and save your favorites.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="cm-view-toggle" role="group" aria-label="View mode">
                            <button className={`cm-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><FiList size={14} /> List</button>
                            <button className={`cm-view-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')} aria-pressed={viewMode === 'map'}><FiMap size={14} /> Map</button>
                        </div>
                        <button onClick={handleLocateMe} disabled={geoLoading} className="cm-btn cm-btn-outline"><FiTarget size={14} /> {geoLoading ? 'Locating...' : 'Locate Me'}</button>
                        <button onClick={fetchAllVenues} className="cm-btn cm-btn-outline"><FiRefreshCw size={14} /> Refresh</button>
                    </div>
                </div>

                {favorites.length > 0 && viewMode === 'list' && (
                    <div className="cm-fav-section">
                        <div className="cm-fav-title"><FiStar size={14} color="#f59e0b" /> Your favorite venues:</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {venues.filter(v => favorites.includes(v.id)).slice(0, 5).map(v => (
                                <button key={v.id} className="cm-btn cm-btn-outline" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => setSelectedVenue(v)}>{v.name}</button>
                            ))}
                        </div>
                    </div>
                )}

                {location && (
                    <div className="cm-location-info">
                        <FiTarget size={14} /> Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                    </div>
                )}
                {geoError && (<div className="cm-alert cm-alert-warning"><FiAlertCircle size={16} /> {geoError}<button onClick={handleLocateMe} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: 700 }}>Retry</button></div>)}
                {fetchError && (<div className="cm-alert cm-alert-error"><FiAlertCircle size={16} /> {fetchError}<button onClick={fetchAllVenues} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>Retry</button></div>)}

                <form onSubmit={handleSearchSubmit} className="cm-bar">
                    <div className="cm-search-wrap">
                        <FiSearch size={14} className="cm-search-icon" />
                        <input type="text" placeholder="Search venues..." value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => recentSearches.length > 0 && setSearch('')} onBlur={() => setTimeout(() => setRecentSearches([]), 200)} className="cm-search" aria-label="Search venues" />
                        {recentSearches.length > 0 && search === '' && (
                            <div className="cm-recent-wrap">
                                {recentSearches.map((s, i) => (
                                    <div key={i} className="cm-recent-item" onMouseDown={() => { setSearch(s); handleSearchSubmit(); }}><span>{s}</span><FiClock size={12} color="#94a3b8" /></div>
                                ))}
                                <div className="cm-recent-clear" onMouseDown={clearRecentSearches}>Clear history</div>
                            </div>
                        )}
                    </div>
                    <select value={venueType} onChange={e => setVenueType(e.target.value)} className="cm-select" aria-label="Filter by venue type">
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
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="cm-select" aria-label="Sort order">
                        <option value="name">Name A-Z</option>
                        <option value="distance">Nearest First</option>
                    </select>
                    <button type="button" onClick={location ? fetchNearbyVenues : fetchAllVenues} className="cm-btn cm-btn-green"><FiNavigation size={14} /> {location ? 'Find Nearest' : 'Show All'}</button>
                </form>

                <p className="cm-count">Showing {filteredVenues.length} of {venues.length} venues</p>
                {loading && <SkeletonLoader type="list" count={6} />}

                {!loading && viewMode === 'map' && (
                    <div className="cm-map-wrapper">
                        <MapContainer center={centerMap} zoom={mapZoom} className="cm-map-container" scrollWheelZoom={true} aria-label="Interactive campus map">
                            <ChangeMapView center={centerMap} zoom={mapZoom} />
                            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {location && <Marker position={[location.latitude, location.longitude]}><Popup>You are here</Popup></Marker>}
                            {filteredVenues.map((venue) => (
                                venue.latitude && venue.longitude ? (
                                    <Marker key={venue.id} position={[venue.latitude, venue.longitude]} eventHandlers={{ click: () => setSelectedVenue(venue) }}>
                                        <Popup>
                                            <div style={{ minWidth: '160px' }}>
                                                <strong>{venue.name}</strong>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0' }}>{venue.venue_type} – {venue.building_code || ''}</p>
                                                {venue.distance_display && <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>{venue.distance_display} • {venue.walking_time_minutes} min walk</p>}
                                                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                                    <button className="cm-card-btn cm-card-btn-maps" style={{ flex: 1 }} onClick={() => openInMaps(venue)}>Maps</button>
                                                    <button className="cm-card-btn cm-card-btn-dir" style={{ flex: 1 }} onClick={() => handleGetDirections(venue)}>Directions</button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ) : null
                            ))}
                        </MapContainer>
                    </div>
                )}

                {!loading && viewMode === 'list' && (
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
                                    <div className="cm-card-distance"><FiMapPin size={14} /> {venue.distance_display}{venue.walking_time_minutes && ` • 🚶 ${venue.walking_time_minutes} min`}</div>
                                )}
                                <div className="cm-card-actions">
                                    <button onClick={() => openInMaps(venue)} className="cm-card-btn cm-card-btn-maps"><FiExternalLink size={11} /> Maps</button>
                                    <button onClick={() => handleGetDirections(venue)} className="cm-card-btn cm-card-btn-dir"><FiNavigation size={11} /> Directions</button>
                                    <button onClick={() => toggleFavorite(venue.id)} className={`cm-card-btn cm-card-btn-fav`} aria-label={isFavorite(venue.id) ? 'Remove from favorites' : 'Add to favorites'}><FiStar size={13} fill={isFavorite(venue.id) ? '#f59e0b' : 'none'} /></button>
                                    <button onClick={() => handleShareVenue(venue)} className="cm-card-btn cm-card-btn-fav" aria-label="Copy venue link"><FiShare2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredVenues.length === 0 && (
                    <div className="cm-empty"><span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🏫</span><p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>No venues found</p><p style={{ fontSize: '0.85rem', marginTop: 4 }}>{search ? 'Try a different search term.' : 'No venues match the selected filters.'}</p></div>
                )}
            </div>

            {selectedVenue && !directions && (
                <div className="cm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="venue-detail-title">
                    <div className="cm-modal-backdrop" onClick={() => setSelectedVenue(null)} />
                    <div className="cm-modal">
                        <div className="cm-modal-header"><h2 className="cm-modal-title" id="venue-detail-title">{selectedVenue.name}</h2><button className="cm-modal-close" onClick={() => setSelectedVenue(null)} aria-label="Close venue details"><FiX size={16} /></button></div>
                        <div className="cm-modal-body">
                            <p style={{ fontSize: '0.85rem', marginBottom: 8 }}><strong>Type:</strong> {selectedVenue.venue_type?.replace(/_/g, ' ')}</p>
                            {selectedVenue.building_code && <p>🏢 {selectedVenue.building_code}</p>}
                            {selectedVenue.floor && <p>Floor: {selectedVenue.floor}</p>}
                            {selectedVenue.room_number && <p>Room: {selectedVenue.room_number}</p>}
                            {selectedVenue.distance_display && <p className="cm-card-distance" style={{ justifyContent: 'flex-start' }}><FiMapPin size={14} /> {selectedVenue.distance_display} • 🚶 {selectedVenue.walking_time_minutes} min walk</p>}
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="cm-btn cm-btn-primary" onClick={() => handleGetDirections(selectedVenue)} disabled={directionLoading}>{directionLoading ? 'Loading...' : <><FiNavigation size={14} /> Get Directions</>}</button>
                                <button className="cm-btn cm-btn-outline" onClick={() => openInMaps(selectedVenue)}><FiExternalLink size={14} /> Open in Maps</button>
                                <button className="cm-btn cm-btn-outline" onClick={() => toggleFavorite(selectedVenue.id)} aria-label={isFavorite(selectedVenue.id) ? 'Remove from favorites' : 'Add to favorites'}><FiStar size={14} fill={isFavorite(selectedVenue.id) ? '#f59e0b' : 'none'} /> {isFavorite(selectedVenue.id) ? 'Saved' : 'Save'}</button>
                                <button className="cm-btn cm-btn-outline" onClick={() => handleShareVenue(selectedVenue)}><FiShare2 size={14} /> Copy Link</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {directions && selectedVenue && (
                <div className="cm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="directions-title">
                    <div className="cm-modal-backdrop" onClick={closeDirections} />
                    <div className="cm-modal">
                        <div className="cm-modal-header"><h2 className="cm-modal-title" id="directions-title">Walking to {directions.venueName || selectedVenue.name}</h2><button className="cm-modal-close" onClick={closeDirections} aria-label="Close directions"><FiX size={16} /></button></div>
                        <div className="cm-modal-body">
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <FiNavigation size={40} style={{ color: '#6366f1', marginBottom: 16 }} />
                                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                                    {directions.distance_display} • {directions.walking_time_minutes} min walk
                                </p>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 8 }}>
                                    From your current location to {selectedVenue.name}
                                </p>
                            </div>
                        </div>
                        <div className="cm-modal-footer">
                            <button className="cm-btn cm-btn-primary" style={{ flex: 1 }} onClick={() => openWalkingDirections(selectedVenue)}><FiNavigation size={14} /> Open in Google Maps</button>
                        </div>
                    </div>
                </div>
            )}

            {showShareToast && (<div className="cm-toast" role="status"><FiCopy size={14} /> Venue link copied to clipboard!</div>)}
            {showBackToTop && (<button className="cm-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Back to top" aria-label="Back to top"><FiArrowUp size={20} /></button>)}
        </>
    );
}