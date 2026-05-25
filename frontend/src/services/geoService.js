/**
 * GeoService API client
 * Handles all location-based API calls to the backend.
 * 
 * Backend: apps/geo/views.py (or equivalent geolocation endpoints)
 * Backend: apps/academics/views.py - AttendanceViewSet (location check-in)
 */
import apiClient from './apiClient.js';
import { offlineStorage } from '../utils/storage';

const GeoService = {
  // ═══════════════════════════════════════════════════════════════
  // VENUES
  // ═══════════════════════════════════════════════════════════════

  /**
   * List all campus venues with optional filters
   * Backend: GET /geo/venues/
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search by name
   * @param {string} params.venue_type - Filter by type (CLASSROOM, LAB, HALL, etc.)
   * @param {number} params.limit - Max results
   */
  async listVenues({ search, venue_type, limit = 20 } = {}) {
    try {
      const params = {};
      if (search) params.search = search;
      if (venue_type) params.venue_type = venue_type;
      if (limit) params.limit = limit;

      const response = await apiClient.get('/geo/venues/', { params });

      // Cache venue list for offline access
      await offlineStorage.cacheApiResponse('/geo/venues/', response.data, 30);

      return response.data;
    } catch (error) {
      console.error('Failed to list venues:', error);
      // Try cached data
      const cached = await offlineStorage.getCachedResponse('/geo/venues/');
      if (cached) return cached;
      throw error;
    }
  },

  /**
   * Get single venue details
   * Backend: GET /geo/venues/{id}/
   * @param {string} venueId - Venue UUID
   */
  async getVenue(venueId) {
    try {
      const response = await apiClient.get(`/geo/venues/${venueId}/`);
      await offlineStorage.cacheApiResponse(
        `/geo/venues/${venueId}/`,
        response.data,
        60
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get venue:', error);
      const cached = await offlineStorage.getCachedResponse(`/geo/venues/${venueId}/`);
      if (cached) return cached;
      throw error;
    }
  },

  /**
   * Find nearest venues to a location
   * Backend: GET /geo/venues/nearby/
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {Object} options
   * @param {string} options.institution - Filter by institution
   * @param {number} options.limit - Max results
   */
  async getNearbyVenues(lat, lon, { institution, limit = 5 } = {}) {
    try {
      const params = { lat, lon, limit };
      if (institution) params.institution = institution;

      const response = await apiClient.get('/geo/venues/nearby/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get nearby venues:', error);
      throw error;
    }
  },

  /**
   * Get venue occupancy status
   * Backend: GET /geo/venues/{id}/occupancy/
   */
  async getVenueOccupancy(venueId) {
    try {
      const response = await apiClient.get(`/geo/venues/${venueId}/occupancy/`);
      return response.data;
    } catch (error) {
      console.error('Failed to get venue occupancy:', error);
      return { occupied: false, currentClass: null };
    }
  },

  /**
   * Get today's venue schedule
   * Backend: GET /geo/venues/{id}/schedule/
   */
  async getVenueSchedule(venueId, date = null) {
    try {
      const params = {};
      if (date) params.date = date;
      const response = await apiClient.get(`/geo/venues/${venueId}/schedule/`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get venue schedule:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BATCH VENUE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get multiple venues by IDs in parallel
   * @param {string[]} venueIds - Array of venue UUIDs
   */
  async getVenuesByIds(venueIds) {
    try {
      const promises = venueIds.map(id =>
        this.getVenue(id).catch(() => null)
      );
      const results = await Promise.allSettled(promises);
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } catch (error) {
      console.error('Failed to batch get venues:', error);
      return [];
    }
  },

  /**
   * Get nearest venues with estimated walking time
   * Returns sorted by nearest first
   */
  async getNearestVenuesWithETA(lat, lon, venueIds) {
    try {
      const venues = await this.getVenuesByIds(venueIds);
      return venues
        .map(venue => {
          const distance = venue.latitude && venue.longitude
            ? this.calculateDistance(lat, lon, venue.latitude, venue.longitude)
            : Infinity;
          return {
            ...venue,
            distance,
            walkingTime: distance !== Infinity
              ? this.estimateWalkTime(distance)
              : Infinity,
          };
        })
        .sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Failed to get nearest venues with ETA:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DISTANCE CALCULATION (Haversine Formula)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate distance between two coordinates in meters
   * Uses the Haversine formula for accurate spherical distance
   * @param {number} lat1 - Origin latitude
   * @param {number} lon1 - Origin longitude
   * @param {number} lat2 - Destination latitude
   * @param {number} lon2 - Destination longitude
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    const R = 6371000; // Earth's radius in meters
    const dLat = this._toRadians(lat2 - lat1);
    const dLon = this._toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(lat1)) *
      Math.cos(this._toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Convert degrees to radians
   * @private
   */
  _toRadians(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Check if location is within geofence radius
   * @param {number} userLat - User latitude
   * @param {number} userLon - User longitude
   * @param {number} venueLat - Venue latitude
   * @param {number} venueLon - Venue longitude
   * @param {number} maxDistance - Max allowed distance in meters (default: 100m)
   * @returns {boolean} Whether within range
   */
  isWithinRange(userLat, userLon, venueLat, venueLon, maxDistance = 100) {
    const distance = this.calculateDistance(userLat, userLon, venueLat, venueLon);
    return distance <= maxDistance;
  },

  /**
   * Estimate walking time between two points
   * @param {number} distanceMeters - Distance in meters
   * @returns {number} Estimated time in minutes
   */
  estimateWalkTime(distanceMeters) {
    // Average walking speed: 80 meters per minute
    return Math.ceil(distanceMeters / 80);
  },

  // ═══════════════════════════════════════════════════════════════
  // GPS ACCURACY VALIDATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate GPS accuracy for attendance check-in
   * @param {number} accuracy - GPS accuracy in meters
   * @returns {boolean} Whether accuracy is acceptable
   */
  isAccuracyAcceptable(accuracy) {
    // GPS accuracy under 100m is acceptable for attendance
    return accuracy <= 100;
  },

  /**
   * Get GPS quality description
   * @param {number} accuracy - GPS accuracy in meters
   * @returns {string} Human-readable accuracy description
   */
  getAccuracyDescription(accuracy) {
    if (!accuracy || accuracy < 0) return 'Unknown';
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 15) return 'Very Good';
    if (accuracy <= 30) return 'Good';
    if (accuracy <= 50) return 'Fair';
    if (accuracy <= 100) return 'Poor';
    return 'Unreliable';
  },

  // ═══════════════════════════════════════════════════════════════
  // GEOCODING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convert address to coordinates
   * Backend: GET /geo/geocode/
   * @param {string} address - Address to geocode
   */
  async geocodeAddress(address) {
    try {
      const response = await apiClient.get('/geo/geocode/', {
        params: { address },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to geocode address:', error);
      throw error;
    }
  },

  /**
   * Convert coordinates to address
   * Backend: GET /geo/reverse-geocode/
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async reverseGeocode(lat, lon) {
    try {
      const response = await apiClient.get('/geo/reverse-geocode/', {
        params: { lat, lon },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DIRECTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get directions between two points
   * Backend: GET /geo/directions/
   * @param {number} originLat - Origin latitude
   * @param {number} originLon - Origin longitude
   * @param {number} destLat - Destination latitude
   * @param {number} destLon - Destination longitude
   * @param {string} travelMode - walking, driving, bicycling, transit
   */
  async getDirections(originLat, originLon, destLat, destLon, travelMode = 'walking') {
    try {
      const response = await apiClient.get('/geo/directions/', {
        params: {
          origin_lat: originLat,
          origin_lon: originLon,
          dest_lat: destLat,
          dest_lon: destLon,
          travel_mode: travelMode,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get directions:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // NEARBY CLASSES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find nearby classes today
   * Backend: GET /geo/classes/nearby/
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   * @param {number} maxDistance - Max distance in meters
   */
  async getNearbyClasses(lat, lon, maxDistance = 500) {
    try {
      const response = await apiClient.get('/geo/classes/nearby/', {
        params: { lat, lon, max_distance: maxDistance },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get nearby classes:', error);
      throw error;
    }
  },

  /**
   * Get directions to a specific class
   * Backend: GET /geo/classes/{entryId}/directions/
   * @param {string} entryId - Timetable entry UUID
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   */
  async getClassDirections(entryId, lat, lon) {
    try {
      const response = await apiClient.get(`/geo/classes/${entryId}/directions/`, {
        params: { lat, lon },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get class directions:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LOCATION CHECK-IN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Submit location check-in for attendance verification
   * Backend: POST /geo/check-in/
   * @param {Object} data - Check-in data
   * @param {string} data.timetable_entry_id - Timetable entry UUID
   * @param {number} data.latitude - GPS latitude
   * @param {number} data.longitude - GPS longitude
   * @param {number} data.accuracy - GPS accuracy in meters
   * @param {Object} data.device_info - Device information
   */
  async submitCheckIn({ timetable_entry_id, latitude, longitude, accuracy, device_info = {} }) {
    const payload = {
      timetable_entry_id,
      latitude,
      longitude,
      accuracy,
      device_info: {
        ...device_info,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await apiClient.post('/geo/check-in/', payload);
      return response.data;
    } catch (error) {
      console.warn('Failed to submit check-in online, queuing:', error);
      // Queue for offline sync
      await offlineStorage.addToSyncQueue({
        type: 'CHECK_IN',
        endpoint: '/geo/check-in/',
        method: 'POST',
        data: payload,
      });
      return { offline: true, message: 'Check-in saved offline - will sync when online' };
    }
  },

  /**
   * Get check-in history
   * Backend: GET /geo/check-in/history/
   * @param {number} limit - Max results
   */
  async getCheckInHistory(limit = 20) {
    try {
      const response = await apiClient.get('/geo/check-in/history/', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get check-in history:', error);
      throw error;
    }
  },

  /**
   * Get today's check-in summary
   * Backend: GET /geo/check-in/summary/
   */
  async getCheckInSummary() {
    try {
      const response = await apiClient.get('/geo/check-in/summary/');
      return response.data;
    } catch (error) {
      console.error('Failed to get check-in summary:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LOCATION HISTORY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record user location for analytics
   * Backend: POST /geo/location/record/
   * Non-critical - silently fails on error
   */
  async recordLocation(latitude, longitude, accuracy) {
    try {
      await apiClient.post('/geo/location/record/', {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Silently fail - location recording is non-critical
      console.debug('Failed to record location:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // OFFLINE SYNC
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sync pending check-ins and location records
   */
  async syncOfflineData() {
    return offlineStorage.processSyncQueue();
  },

  /**
   * Get pending sync count
   */
  async getPendingSyncCount() {
    return offlineStorage.getPendingSyncCount();
  },
};

export default GeoService;