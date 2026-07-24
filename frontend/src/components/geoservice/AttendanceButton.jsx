// frontend/src/components/geoservice/AttendanceButton.jsx
import React, { useState, useCallback } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import GeoService from '../../api/geoService';

/**
 * Location‑aware attendance button.
 *
 * Features:
 * - Pre‑check for geolocation support and readiness.
 * - Backend‑verified check‑in via GeoService.submitCheckIn.
 * - Fine‑grained error handling for HTTP 403, 422, 429, etc.
 * - Visual state for “pending manual review” when requires_manual_review is true.
 * - Optimistic GPS accuracy warning.
 */
export function LocationAttendanceButton({ entryId, unitName, venue, isMarked }) {
  const { isAccuracyAcceptable } = useGeolocation();
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState(null);

  const handleMarkAttendance = useCallback(async () => {
    setMarking(true);
    setResult(null);

    // 1. Pre‑check: browser support
    if (!navigator.geolocation) {
      setResult({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      setMarking(false);
      return;
    }

    try {
      // 2. Obtain fresh GPS coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // 3. Check accuracy (non‑blocking, just for UI)
      const accuracyOk = isAccuracyAcceptable(accuracy);

      // 4. Submit to backend (source of truth)
      const response = await GeoService.submitCheckIn({
        timetable_entry_id: entryId,
        latitude,
        longitude,
        accuracy,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      });

      // 5. Determine result type
      let resultType = 'warning';
      if (response.verified) {
        resultType = 'success';
      }
      if (response.requires_manual_review) {
        resultType = 'pending';
      } else if (!accuracyOk && response.verified) {
        // Backend verified, but GPS accuracy is poor – still show a mild warning
        resultType = 'warning';
      }

      setResult({
        type: resultType,
        message: response.message,
        distance: response.distance_display,
      });
    } catch (err) {
      // 6. Map known browser / HTTP errors
      if (err.code === 1) {
        setResult({
          type: 'error',
          message: 'Location permission denied. Please enable GPS.',
        });
      } else if (err.response) {
        const detail = err.response.data?.detail;
        if (err.response.status === 403) {
          setResult({
            type: 'error',
            message: detail || 'You are not enrolled in this class.',
          });
        } else if (err.response.status === 422) {
          setResult({
            type: 'error',
            message: detail || 'Venue coordinates not available. Please contact support.',
          });
        } else if (err.response.status === 429) {
          setResult({
            type: 'error',
            message: 'Too many requests. Please wait and try again.',
          });
        } else {
          setResult({
            type: 'error',
            message: detail || 'Failed to verify location.',
          });
        }
      } else {
        setResult({
          type: 'error',
          message: 'Failed to verify location. Please try again.',
        });
      }
    } finally {
      setMarking(false);
    }
  }, [entryId, isAccuracyAcceptable]);

  // Already marked – display static state
  if (isMarked) {
    return (
      <button className="attendance-btn marked" disabled>
        Already Marked
      </button>
    );
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
          {result.message}
          {result.distance && ` (${result.distance})`}
        </div>
      )}
    </div>
  );
}