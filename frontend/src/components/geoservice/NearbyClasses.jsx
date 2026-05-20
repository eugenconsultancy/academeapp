import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../api/geoService';
import SkeletonLoader from '../shared/SkeletonLoader';
import {
  FiMapPin, FiNavigation, FiClock, FiUser,
  FiTarget, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';

export function NearbyClasses() {
  const { location, error: geoError, getLocation } = useGeolocation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (location) fetchNearbyClasses();
  }, [location]);

  const fetchNearbyClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await GeoService.getNearbyClasses(location.latitude, location.longitude);
      setClasses(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError('Failed to fetch nearby classes');
    } finally {
      setLoading(false);
    }
  };

  const openDirections = (classItem) => {
    if (location) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${classItem.venue_latitude},${classItem.venue_longitude}&travelmode=walking`;
      window.open(url, '_blank');
    }
  };

  const getDistanceColor = (meters) => {
    if (meters <= 100) return '#10b981';
    if (meters <= 300) return '#f59e0b';
    return '#ef4444';
  };

  // Geo Error
  if (geoError) {
    return (
      <div style={styles.errorBox}>
        <FiAlertCircle size={16} />
        <span>Location unavailable: {geoError}</span>
        <button onClick={getLocation} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  // No Location
  if (!location) {
    return (
      <div style={styles.emptyBox}>
        <FiTarget size={24} style={{ opacity: 0.5 }} />
        <p style={{ fontWeight: 600, marginTop: 8 }}>Enable location</p>
        <button onClick={getLocation} style={styles.enableBtn}>Enable Location</button>
      </div>
    );
  }

  // Loading
  if (loading) return <SkeletonLoader type="list" count={3} />;

  // API Error
  if (error) {
    return (
      <div style={styles.errorBox}>
        <FiAlertCircle size={16} />
        <span>{error}</span>
        <button onClick={fetchNearbyClasses} style={styles.retryBtn}><FiRefreshCw size={12} /> Retry</button>
      </div>
    );
  }

  // Empty
  if (classes.length === 0) {
    return (
      <div style={styles.emptyBox}>
        <FiMapPin size={24} style={{ opacity: 0.5 }} />
        <p style={{ fontWeight: 600, marginTop: 8 }}>No classes found nearby</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={styles.heading}>📍 Nearby Classes</h3>
      <div style={styles.list}>
        {classes.map((cls, i) => (
          <div key={cls.entry_id} style={{ ...styles.card, animationDelay: `${i * 50}ms` }}>
            <div style={styles.cardRow}>
              <div style={styles.cardInfo}>
                <h4 style={styles.cardName}>{cls.unit_name}</h4>
                <p style={styles.cardMeta}><FiMapPin size={11} />{cls.venue} | <FiClock size={11} />{cls.start_time} - {cls.end_time}</p>
                {cls.lecturer && <p style={styles.cardMeta}><FiUser size={11} />{cls.lecturer}</p>}
              </div>
              <div style={styles.cardDist}>
                <span style={{ ...styles.distVal, color: getDistanceColor(cls.distance_meters) }}>{cls.distance_display}</span>
                <span style={styles.distTime}>🚶 {cls.walking_time_minutes} min</span>
              </div>
            </div>
            <button onClick={() => openDirections(cls)} style={styles.dirBtn}>
              <FiNavigation size={14} /> Get Directions
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes geoFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

const styles = {
  heading: { fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: 14, padding: 16, backdropFilter: 'blur(12px)',
    animation: 'geoFadeIn 0.3s ease both', cursor: 'pointer',
  },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  cardMeta: { fontSize: '0.75rem', color: '#94a3b8', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 },
  cardDist: { textAlign: 'right', flexShrink: 0 },
  distVal: { fontSize: '1rem', fontWeight: 800 },
  distTime: { fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: 2 },
  dirBtn: {
    marginTop: 10, width: '100%', padding: '8px 14px', borderRadius: 8,
    background: '#6366f1', color: '#fff', border: 'none',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  errorBox: {
    padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)', color: '#dc2626',
    fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
  },
  retryBtn: {
    marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626',
    cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4,
  },
  emptyBox: { textAlign: 'center', padding: 32, color: '#94a3b8' },
  enableBtn: {
    marginTop: 8, padding: '8px 16px', borderRadius: 8, background: '#6366f1',
    color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },
};