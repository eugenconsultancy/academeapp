// frontend/src/hooks/useGeolocation.js
import { useState, useEffect, useCallback, useRef } from 'react';

const GEO_CONSTANTS = {
  EARTH_RADIUS_METERS: 6371000,
  AVERAGE_WALK_SPEED_MPM: 80,
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

  // ── State & Refs ────────────────────────────────────────────
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const isMountedRef = useRef(true);
  const watchIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const locationHistoryRef = useRef([]);
  const permissionListenerRef = useRef(null);
  const retryCountRef = useRef(0);
  const getLocationRef = useRef(null);

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

  // ── Helper functions (defined early, no dependencies on other callbacks) ──
  function _toRad(deg) { return deg * (Math.PI / 180); }
  function _toDeg(rad) { return rad * (180 / Math.PI); }

  // ── Permission handling ─────────────────────────────────────
  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (!isMountedRef.current) return result.state;
        setPermissionStatus(result.state);
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

  // ── Position success handler ─────────────────────────────────
  const handleSuccess = useCallback((position) => {
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

    locationHistoryRef.current.push({ ...newLocation, recordedAt: new Date().toISOString() });
    if (locationHistoryRef.current.length > 100) {
      locationHistoryRef.current = locationHistoryRef.current.slice(-100);
    }

    try {
      localStorage.setItem(
        'last_known_location',
        JSON.stringify({ ...newLocation, cachedAt: new Date().toISOString() })
      );
    } catch (e) { /* ignore */ }

    if (onLocationUpdate) onLocationUpdate(newLocation);
    return newLocation;
  }, [onLocationUpdate]);

  // ── Position error handler ───────────────────────────────────
  const handleError = useCallback((err) => {
    if (!isMountedRef.current) return;
    setLoading(false);

    let errorMessage = '';
    switch (err.code) {
      case 1:
        errorMessage = 'Location permission denied. Please enable GPS in your device settings.';
        setPermissionStatus('denied');
        break;
      case 2:
        errorMessage = 'Location information is unavailable. Check your GPS signal.';
        break;
      case 3:
        errorMessage = 'Location request timed out. Please try again.';
        break;
      default:
        errorMessage = `An unknown error occurred while getting location (Code: ${err.code}).`;
    }
    setError(errorMessage);

    if (onError) onError({ code: err.code, message: errorMessage });

    if (retryCountRef.current < maxRetries && err.code !== 1) {
      retryTimeoutRef.current = setTimeout(() => {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        if (getLocationRef.current) {
          getLocationRef.current();
        }
      }, GEO_CONSTANTS.RETRY_DELAY_MS * (retryCountRef.current + 1));
    }
  }, [maxRetries, onError]);

  // ── Location acquisition ─────────────────────────────────────
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

  useEffect(() => {
    getLocationRef.current = getLocation;
  }, [getLocation]);

  const getCachedLocation = useCallback(() => {
    try {
      const cached = localStorage.getItem('last_known_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.cachedAt).getTime();
        if (age < maximumAge) return parsed;
      }
    } catch (e) { /* ignore */ }
    return null;
  }, [maximumAge]);

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

  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (isMountedRef.current) setLoading(false);
  }, []);

  // ── Distance & Geofence ──────────────────────────────────────
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const a = 6378137.0, b = 6356752.314245, f = 1 / 298.257223563;
    const L = _toRad(lon2 - lon1);
    const U1 = Math.atan((1 - f) * Math.tan(_toRad(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(_toRad(lat2)));
    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    let lambda = L, lambdaP, iterLimit = 100;
    let cosSqAlpha, sinSigma, cos2SigmaM, sigma, cosSigma;
    do {
      const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
      sinSigma = Math.sqrt((cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2);
      if (sinSigma === 0) return 0;
      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
      cosSqAlpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
      if (isNaN(cos2SigmaM)) cos2SigmaM = 0;
      const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
      lambdaP = lambda;
      lambda = L + (1 - f) * C * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);
    if (iterLimit === 0) return Infinity;
    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma * (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM ** 2)));
    return Math.round(b * A * (sigma - deltaSigma));
  }, []);

  const estimateWalkTime = useCallback((distanceMeters) => Math.ceil(distanceMeters / GEO_CONSTANTS.AVERAGE_WALK_SPEED_MPM), []);

  const isWithinGeofence = useCallback((targetLat, targetLon, maxDistance = 100) => {
    if (!location) return { within: false, reason: 'No current location available' };
    const distance = calculateDistance(location.latitude, location.longitude, targetLat, targetLon);
    return {
      within: distance <= maxDistance,
      distance,
      maxDistance,
      walkingTime: estimateWalkTime(distance),
      message: distance <= maxDistance ? `Within range (${distance}m)` : `Too far: ${distance}m away (max: ${maxDistance}m)`,
    };
  }, [location, calculateDistance, estimateWalkTime]);

  const checkVenueProximity = useCallback((venue, maxDistance = 100) => {
    if (!location) return { verified: false, reason: 'Location not available' };
    if (!venue?.latitude || !venue?.longitude) return { verified: false, reason: 'Venue location unknown' };
    return isWithinGeofence(venue.latitude, venue.longitude, maxDistance);
  }, [location, isWithinGeofence]);

  // ── Accuracy & data validity ─────────────────────────────────
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

  const isDataValid = useCallback(() => {
    if (!location || location.accuracy == null) return false;
    return location.accuracy <= GEO_CONSTANTS.ACCURACY_THRESHOLDS.FAIR;
  }, [location]);

  // ── Mock detection & readiness gates (MUST be defined before isReadyForCheckIn) ──
  const isLocationMocked = useCallback(() => {
    if (!location) return false;
    if (location.mocked === true) return true;
    if (location.accuracy && location.accuracy < 0.1) return true;
    if (location.speed && location.speed > 300) return true;
    return false;
  }, [location]);

  const isReadyForCheckIn = useCallback(() => {
    return (
      location &&
      permissionStatus === 'granted' &&
      isDataValid() &&
      !isLocationMocked()
    );
  }, [location, permissionStatus, isDataValid, isLocationMocked]); // isLocationMocked now available

  // ── Bearing, history, DMS ────────────────────────────────────
  const calculateBearing = useCallback((lat1, lon1, lat2, lon2) => {
    const dLon = _toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(_toRad(lat2));
    const x = Math.cos(_toRad(lat1)) * Math.sin(_toRad(lat2)) - Math.sin(_toRad(lat1)) * Math.cos(_toRad(lat2)) * Math.cos(dLon);
    return Math.round((_toDeg(Math.atan2(y, x)) + 360) % 360);
  }, []);

  const getLocationHistory = useCallback((limit = 50) => locationHistoryRef.current.slice(-limit), []);
  const clearLocationHistory = useCallback(() => { locationHistoryRef.current = []; }, []);
  const toDMS = useCallback((dd, type = 'lat') => {
    const degrees = Math.floor(Math.abs(dd));
    const minutesFloat = (Math.abs(dd) - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);
    const direction = type === 'lat' ? (dd >= 0 ? 'N' : 'S') : (dd >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }, []);

  // ── Initialization effect (runs after all functions defined) ──
  useEffect(() => {
    checkPermission();

    if (autoRequest) {
      const cached = getCachedLocation();
      if (cached) setLocation(cached);
      getLocation();
    }
    if (watch) {
      startWatching();
    }

    return () => {
      stopWatching();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []); // empty dependency array ensures it only runs once

  return {
    location,
    error,
    loading,
    permissionStatus,
    retryCount,
    lastUpdateTime,
    getLocation,
    getCachedLocation,
    startWatching,
    stopWatching,
    calculateDistance,
    isWithinGeofence,
    checkVenueProximity,
    isAccuracyAcceptable,
    getAccuracyDescription,
    estimateWalkTime,
    calculateBearing,
    getLocationHistory,
    clearLocationHistory,
    toDMS,
    isLocationMocked,
    isDataValid,
    isReadyForCheckIn,
  };
}

export default useGeolocation;