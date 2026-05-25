import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Constants for geolocation
 */
const GEO_CONSTANTS = {
  EARTH_RADIUS_METERS: 6371000,
  AVERAGE_WALK_SPEED_MPM: 80, // meters per minute
  DEFAULT_TIMEOUT: 10000,
  DEFAULT_MAX_AGE: 60000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  ACCURACY_THRESHOLDS: {
    EXCELLENT: 5,
    VERY_GOOD: 15,
    GOOD: 30,
    FAIR: 50,
    POOR: 100,
  },
};

/**
 * Hook for accessing and watching the user's GPS location.
 * Enhanced with distance calculation (Vincenty formula), geofencing, accuracy validation,
 * and offline caching for attendance verification.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableHighAccuracy - Use GPS (true) or network (false)
 * @param {number} options.timeout - Max wait time in ms (default 10000)
 * @param {number} options.maximumAge - Max age of cached position in ms (default 60000)
 * @param {boolean} options.watch - Continuously watch position changes
 * @param {boolean} options.autoRequest - Automatically request location on mount
 * @param {number} options.maxRetries - Max retry attempts on failure (default 3)
 * @param {Function} options.onPermissionChange - Callback when permission status changes
 * @param {Function} options.onLocationUpdate - Callback when location updates
 * @param {Function} options.onError - Callback when error occurs
 * @returns {Object} Location hook API
 */
export function useGeolocation(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = GEO_CONSTANTS.DEFAULT_TIMEOUT,
    maximumAge = GEO_CONSTANTS.DEFAULT_MAX_AGE,
    watch = false,
    autoRequest = false,
    maxRetries = GEO_CONSTANTS.MAX_RETRY_ATTEMPTS,
    onPermissionChange = null,
    onLocationUpdate = null,
    onError = null,
  } = options;

  // ── State ──────────────────────────────────────────────────────
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // ── Refs ───────────────────────────────────────────────────────
  const isMountedRef = useRef(true);               // unmount guard
  const watchIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const locationHistoryRef = useRef([]);
  const permissionListenerRef = useRef(null);      // clean permission listener
  const retryCountRef = useRef(0);                 // avoid volatile dependency
  const getLocationRef = useRef(null);             // holds the latest getLocation to break circular dependency

  // Keep retryCountRef in sync
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // Mark mounted / unmounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION HANDLING
  // ═══════════════════════════════════════════════════════════════

  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (!isMountedRef.current) return result.state;

        setPermissionStatus(result.state);

        // Remove any previous listener before adding a new one
        if (permissionListenerRef.current) {
          result.removeEventListener('change', permissionListenerRef.current);
        }

        permissionListenerRef.current = () => {
          if (isMountedRef.current) {
            setPermissionStatus(result.state);
            if (onPermissionChange) onPermissionChange(result.state);
          }
        };

        result.addEventListener('change', permissionListenerRef.current);
        return result.state;
      }
    } catch (err) {
      console.debug('Permissions API not available, using fallback');
    }
    return 'prompt';
  }, [onPermissionChange]);

  // ═══════════════════════════════════════════════════════════════
  // POSITION HANDLING
  // ═══════════════════════════════════════════════════════════════

  const handleSuccess = useCallback(
    (position) => {
      if (!isMountedRef.current) return;

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
        mocked: position.coords?.mocked || position.mocked || false,
      };

      setLocation(newLocation);
      setError(null);
      setLoading(false);
      setRetryCount(0);
      setLastUpdateTime(Date.now());

      // Add to history
      locationHistoryRef.current.push({
        ...newLocation,
        recordedAt: new Date().toISOString(),
      });

      // Keep only last 100 records
      if (locationHistoryRef.current.length > 100) {
        locationHistoryRef.current = locationHistoryRef.current.slice(-100);
      }

      // Cache last known position
      try {
        localStorage.setItem(
          'last_known_location',
          JSON.stringify({ ...newLocation, cachedAt: new Date().toISOString() })
        );
      } catch (e) {
        // localStorage might be full
      }

      // Notify parent
      if (onLocationUpdate) {
        onLocationUpdate(newLocation);
      }

      return newLocation;
    },
    [onLocationUpdate]
  );

  /**
   * Handle geolocation errors with automatic retry.
   * Uses getLocationRef instead of calling getLocation directly to break the circular dependency.
   */
  const handleError = useCallback(
    (err) => {
      if (!isMountedRef.current) return;
      setLoading(false);

      let errorMessage = '';
      switch (err.code) {
        case 1: // PERMISSION_DENIED
          errorMessage =
            'Location permission denied. Please enable GPS in your device settings.';
          setPermissionStatus('denied');
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = 'Location information is unavailable. Check your GPS signal.';
          break;
        case 3: // TIMEOUT
          errorMessage = 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage = `An unknown error occurred while getting location (Code: ${err.code}).`;
      }

      setError(errorMessage);

      // Notify parent
      if (onError) {
        onError({ code: err.code, message: errorMessage });
      }

      // Auto retry if within limits (using refs to avoid dependency on retryCount)
      if (retryCountRef.current < maxRetries && err.code !== 1) {
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          setRetryCount(retryCountRef.current);
          // Use the ref to call the latest getLocation
          if (getLocationRef.current) {
            getLocationRef.current();
          }
        }, GEO_CONSTANTS.RETRY_DELAY_MS * (retryCountRef.current + 1));
      }
    },
    [maxRetries, onError] // removed getLocation from dependencies
  );

  // ═══════════════════════════════════════════════════════════════
  // LOCATION ACQUISITION
  // ═══════════════════════════════════════════════════════════════

  const getLocation = useCallback(() => {
    if (!isMountedRef.current) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Update the getLocationRef whenever getLocation changes
  useEffect(() => {
    getLocationRef.current = getLocation;
  }, [getLocation]);

  /**
   * Get cached location if available and fresh
   */
  const getCachedLocation = useCallback(() => {
    try {
      const cached = localStorage.getItem('last_known_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.cachedAt).getTime();
        if (age < maximumAge) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  }, [maximumAge]);

  /**
   * Start watching position continuously
   */
  const startWatching = useCallback(() => {
    if (!isMountedRef.current) return;
    if (!navigator.geolocation) return;
    setLoading(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  /**
   * Stop watching position
   */
  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (isMountedRef.current) {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // DISTANCE CALCULATION — VINCENTY FORMULA (ellipsoidal earth)
  // ═══════════════════════════════════════════════════════════════
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    if (lat1 === lat2 && lon1 === lon2) return 0;

    // WGS‑84 constants
    const a = 6378137.0;                 // equatorial radius (metres)
    const b = 6356752.314245;            // polar radius (metres)
    const f = 1 / 298.257223563;         // flattening

    const L = _toRad(lon2 - lon1);
    const U1 = Math.atan((1 - f) * Math.tan(_toRad(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(_toRad(lat2)));

    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

    let lambda = L;
    let lambdaP;
    let iterLimit = 100;
    let cosSqAlpha, sinSigma, cos2SigmaM, sigma, cosSigma;

    do {
      const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
      sinSigma = Math.sqrt(
        (cosU2 * sinLambda) ** 2 +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
      );

      if (sinSigma === 0) return 0; // coincident points

      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
      cosSqAlpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

      if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // equatorial line

      const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
      lambdaP = lambda;
      lambda = L + (1 - f) * C * sinAlpha * (
        sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2))
      );
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

    if (iterLimit === 0) return Infinity; // failed to converge

    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma * (
      cos2SigmaM + (B / 4) * (
        cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
        (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM ** 2)
      )
    );

    return Math.round(b * A * (sigma - deltaSigma));
  }, []);

  /**
   * Estimate walking time for a distance.
   * Must be defined BEFORE isWithinGeofence and checkVenueProximity.
   */
  const estimateWalkTime = useCallback((distanceMeters) => {
    return Math.ceil(distanceMeters / GEO_CONSTANTS.AVERAGE_WALK_SPEED_MPM);
  }, []);

  /**
   * Check if user is within geofence radius
   */
  const isWithinGeofence = useCallback(
    (targetLat, targetLon, maxDistance = 100) => {
      if (!location) {
        return { within: false, reason: 'No current location available' };
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        targetLat,
        targetLon
      );

      return {
        within: distance <= maxDistance,
        distance,
        maxDistance,
        walkingTime: estimateWalkTime(distance),
        message:
          distance <= maxDistance
            ? `Within range (${distance}m)`
            : `Too far: ${distance}m away (max: ${maxDistance}m)`,
      };
    },
    [location, calculateDistance, estimateWalkTime]
  );

  /**
   * Check proximity to a venue for attendance verification
   */
  const checkVenueProximity = useCallback(
    (venue, maxDistance = 100) => {
      if (!location) {
        return { verified: false, reason: 'Location not available' };
      }
      if (!venue?.latitude || !venue?.longitude) {
        return { verified: false, reason: 'Venue location unknown' };
      }

      return isWithinGeofence(venue.latitude, venue.longitude, maxDistance);
    },
    [location, isWithinGeofence]
  );

  // ═══════════════════════════════════════════════════════════════
  // GPS ACCURACY VALIDATION
  // ═══════════════════════════════════════════════════════════════

  const isAccuracyAcceptable = useCallback((accuracy = null) => {
    const acc = accuracy ?? location?.accuracy ?? Infinity;
    return acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.POOR;
  }, [location]);

  const getAccuracyDescription = useCallback((accuracy = null) => {
    const acc = accuracy ?? location?.accuracy;
    if (!acc) return 'Unknown';
    if (acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.EXCELLENT) return 'Excellent';
    if (acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.VERY_GOOD) return 'Very Good';
    if (acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.GOOD) return 'Good';
    if (acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.FAIR) return 'Fair';
    if (acc <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.POOR) return 'Poor';
    return 'Unreliable';
  }, [location]);

  // ═══════════════════════════════════════════════════════════════
  // TIME & BEARING ESTIMATION
  // ═══════════════════════════════════════════════════════════════

  const calculateBearing = useCallback((lat1, lon1, lat2, lon2) => {
    const dLon = _toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(_toRad(lat2));
    const x =
      Math.cos(_toRad(lat1)) * Math.sin(_toRad(lat2)) -
      Math.sin(_toRad(lat1)) * Math.cos(_toRad(lat2)) * Math.cos(dLon);
    const bearing = (_toDeg(Math.atan2(y, x)) + 360) % 360;
    return Math.round(bearing);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // LOCATION HISTORY
  // ═══════════════════════════════════════════════════════════════

  const getLocationHistory = useCallback((limit = 50) => {
    return locationHistoryRef.current.slice(-limit);
  }, []);

  const clearLocationHistory = useCallback(() => {
    locationHistoryRef.current = [];
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // COORDINATE FORMAT CONVERSION
  // ═══════════════════════════════════════════════════════════════

  const toDMS = useCallback((dd, type = 'lat') => {
    const degrees = Math.floor(Math.abs(dd));
    const minutesFloat = (Math.abs(dd) - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);

    let direction = '';
    if (type === 'lat') {
      direction = dd >= 0 ? 'N' : 'S';
    } else {
      direction = dd >= 0 ? 'E' : 'W';
    }

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // MOCK LOCATION DETECTION
  // ═══════════════════════════════════════════════════════════════

  const isLocationMocked = useCallback(() => {
    if (!location) return false;

    // 1. Native mock indicator (supported by modern frameworks / WebViews)
    if (location.mocked === true) return true;

    // 2. Suspiciously perfect accuracy – only flag extreme precision
    if (location.accuracy && location.accuracy < 0.1) return true;

    // 3. Unrealistic speed
    if (location.speed && location.speed > 300) return true;

    return false;
  }, [location]);

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    checkPermission();

    // Auto-request location if specified
    if (autoRequest) {
      const cached = getCachedLocation();
      if (cached) {
        setLocation(cached);
      }
      getLocation();
    }

    if (watch) {
      startWatching();
    }

    return () => {
      stopWatching();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []); // stable on mount

  // ═══════════════════════════════════════════════════════════════
  // RETURN API
  // ═══════════════════════════════════════════════════════════════

  return {
    // Location state
    location,
    error,
    loading,
    permissionStatus,
    retryCount,
    lastUpdateTime,

    // Basic operations
    getLocation,
    getCachedLocation,
    startWatching,
    stopWatching,

    // Distance & geofence
    calculateDistance,
    isWithinGeofence,
    checkVenueProximity,

    // Accuracy
    isAccuracyAcceptable,
    getAccuracyDescription,

    // Time & bearing
    estimateWalkTime,
    calculateBearing,

    // History
    getLocationHistory,
    clearLocationHistory,

    // Utilities
    toDMS,
    isLocationMocked,
  };
}

// ═══════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════

function _toRad(deg) {
  return deg * (Math.PI / 180);
}

function _toDeg(rad) {
  return rad * (180 / Math.PI);
}

export default useGeolocation;