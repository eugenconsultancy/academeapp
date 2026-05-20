import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for accessing and watching the user's GPS location.
 * 
 * @param {Object} options
 * @param {boolean} options.enableHighAccuracy - Use GPS (true) or network (false)
 * @param {number} options.timeout - Max wait time in ms (default 10000)
 * @param {number} options.maximumAge - Max age of cached position in ms (default 60000)
 * @param {boolean} options.watch - Continuously watch position changes
 * @returns {Object} { location, error, loading, permissionStatus, getLocation, startWatching, stopWatching }
 */
export function useGeolocation(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false,
  } = options;

  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const watchIdRef = useRef(null);

  // Check permission status
  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state);
        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
        });
      }
    } catch (err) {
      console.debug('Permissions API not available');
    }
  }, []);

  // Handle successful position
  const handleSuccess = useCallback((position) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  // Handle errors
  const handleError = useCallback((err) => {
    setLoading(false);
    switch (err.code) {
      case 1:
        setError('Location permission denied. Please enable GPS in your device settings.');
        setPermissionStatus('denied');
        break;
      case 2:
        setError('Location information is unavailable. Check your GPS signal.');
        break;
      case 3:
        setError('Location request timed out. Please try again.');
        break;
      default:
        setError('An unknown error occurred while getting location.');
    }
  }, []);

  // Get current position once
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoading(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Initialize
  useEffect(() => {
    checkPermission();
    if (watch) {
      startWatching();
    }
    return () => {
      stopWatching();
    };
  }, [checkPermission, watch, startWatching, stopWatching]);

  return {
    location,
    error,
    loading,
    permissionStatus,
    getLocation,
    startWatching,
    stopWatching,
  };
}