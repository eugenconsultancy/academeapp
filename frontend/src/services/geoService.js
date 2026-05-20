/**
 * GeoService API client
 * Handles all location-based API calls to the backend.
 */
import { apiClient } from './apiClient';

const GeoService = {
  // ============================================
  // VENUES
  // ============================================
  
  /**
   * List all campus venues
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search by name
   * @param {string} params.venue_type - Filter by type
   * @param {number} params.limit - Max results
   */
  async listVenues({ search, venue_type, limit = 20 } = {}) {
    const params = {};
    if (search) params.search = search;
    if (venue_type) params.venue_type = venue_type;
    if (limit) params.limit = limit;
    
    const response = await apiClient.get('/geo/venues/', { params });
    return response.data;
  },

  /**
   * Get single venue details
   * @param {string} venueId - Venue UUID
   */
  async getVenue(venueId) {
    const response = await apiClient.get(`/geo/venues/${venueId}/`);
    return response.data;
  },

  /**
   * Find nearest venues to a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} institution - Filter by institution
   * @param {number} limit - Max results
   */
  async getNearbyVenues(lat, lon, { institution, limit = 5 } = {}) {
    const params = { lat, lon, limit };
    if (institution) params.institution = institution;
    
    const response = await apiClient.get('/geo/venues/nearby/', { params });
    return response.data;
  },

  // ============================================
  // GEOCODING
  // ============================================
  
  /**
   * Convert address to coordinates
   * @param {string} address - Address to geocode
   */
  async geocodeAddress(address) {
    const response = await apiClient.get('/geo/geocode/', { params: { address } });
    return response.data;
  },

  /**
   * Convert coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async reverseGeocode(lat, lon) {
    const response = await apiClient.get('/geo/reverse-geocode/', { params: { lat, lon } });
    return response.data;
  },

  // ============================================
  // DIRECTIONS
  // ============================================
  
  /**
   * Get directions between two points
   * @param {number} originLat - Origin latitude
   * @param {number} originLon - Origin longitude
   * @param {number} destLat - Destination latitude
   * @param {number} destLon - Destination longitude
   * @param {string} travelMode - walking, driving, bicycling, transit
   */
  async getDirections(originLat, originLon, destLat, destLon, travelMode = 'walking') {
    const response = await apiClient.get('/geo/directions/', {
      params: {
        origin_lat: originLat,
        origin_lon: originLon,
        dest_lat: destLat,
        dest_lon: destLon,
        travel_mode: travelMode,
      }
    });
    return response.data;
  },

  // ============================================
  // CLASSES
  // ============================================
  
  /**
   * Find nearby classes today
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   * @param {number} maxDistance - Max distance in meters
   */
  async getNearbyClasses(lat, lon, maxDistance = 500) {
    const response = await apiClient.get('/geo/classes/nearby/', {
      params: { lat, lon, max_distance: maxDistance }
    });
    return response.data;
  },

  /**
   * Get directions to a specific class
   * @param {string} entryId - Timetable entry UUID
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   */
  async getClassDirections(entryId, lat, lon) {
    const response = await apiClient.get(`/geo/classes/${entryId}/directions/`, {
      params: { lat, lon }
    });
    return response.data;
  },

  // ============================================
  // LOCATION CHECK-IN
  // ============================================
  
  /**
   * Submit location check-in for attendance
   * @param {Object} data - Check-in data
   * @param {string} data.timetable_entry_id
   * @param {number} data.latitude
   * @param {number} data.longitude
   * @param {number} data.accuracy
   * @param {Object} data.device_info
   */
  async submitCheckIn({ timetable_entry_id, latitude, longitude, accuracy, device_info = {} }) {
    const response = await apiClient.post('/geo/check-in/', {
      timetable_entry_id,
      latitude,
      longitude,
      accuracy,
      device_info,
    });
    return response.data;
  },

  /**
   * Get check-in history
   * @param {number} limit - Max results
   */
  async getCheckInHistory(limit = 20) {
    const response = await apiClient.get('/geo/check-in/history/', { params: { limit } });
    return response.data;
  },

  /**
   * Get today's check-in summary
   */
  async getCheckInSummary() {
    const response = await apiClient.get('/geo/check-in/summary/');
    return response.data;
  },
};

export default GeoService;
