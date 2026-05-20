import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../services/geoService';

export function LocationAttendanceButton({ entryId, unitName, venue, isMarked }) {
  const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState(null);

  const handleMarkAttendance = async () => {
    setMarking(true);
    setResult(null);

    try {
      // Get GPS location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      // Submit location check-in
      const response = await GeoService.submitCheckIn({
        timetable_entry_id: entryId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      });

      setResult({
        type: response.verified ? 'success' : 'warning',
        message: response.message,
        distance: response.distance_display,
      });
    } catch (err) {
      if (err.code === 1) {
        setResult({ type: 'error', message: 'Location permission denied. Please enable GPS.' });
      } else {
        setResult({ type: 'error', message: 'Failed to verify location. Try again.' });
      }
    } finally {
      setMarking(false);
    }
  };

  if (isMarked) {
    return <button className="attendance-btn marked" disabled>Already Marked</button>;
  }

  return (
    <div className="location-attendance">
      <button
        className={`attendance-btn ${marking ? 'loading' : ''}`}
        onClick={handleMarkAttendance}
        disabled={marking}
      >
        {marking ? 'Verifying Location...' : 'Mark Attendance with GPS'}
      </button>
      
      {result && (
        <div className={`result-banner ${result.type}`}>
          {result.type === 'success' && ' '}
          {result.type === 'warning' && ' '}
          {result.message}
          {result.distance && ` (${result.distance})`}
        </div>
      )}
    </div>
  );
}
