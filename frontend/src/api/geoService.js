// frontend/src/api/geoService.js
import apiClient from './client';

/**
 * GeoService - API client for location-related endpoints.
 * All methods include JSDoc types for better IDE autocomplete.
 */

const GeoService = {
    // ═══════════════════════════════════════════════════════════════
    // VENUES
    // ═══════════════════════════════════════════════════════════════

    /**
     * List all campus venues with pagination and filtering.
     * @param {Object} params - Query parameters
     * @param {string} [params.search] - Search by venue name
     * @param {string} [params.venue_type] - Filter by venue type
     * @param {number} [params.limit=20] - Number of results per page
     * @param {number} [params.offset=0] - Pagination offset
     * @returns {Promise<{total: number, results: Array}>}
     */
    async listVenues({ search, venue_type, limit = 20, offset = 0 } = {}) {
        const params = { limit, offset };
        if (search) params.search = search;
        if (venue_type) params.venue_type = venue_type;
        const res = await apiClient.get('/geo/venues/', { params });
        return res.data;
    },

    /**
     * Get venues within map viewport bounds (performance optimization).
     * @param {Object} bounds - Bounding box coordinates
     * @param {number} bounds.north - North latitude
     * @param {number} bounds.south - South latitude
     * @param {number} bounds.east - East longitude
     * @param {number} bounds.west - West longitude
     * @param {number} [limit=100] - Maximum number of venues to return
     * @returns {Promise<Array>}
     */
    async getVenuesInBounds({ north, south, east, west, limit = 100 }) {
        const params = { north, south, east, west, limit };
        const res = await apiClient.get('/geo/venues/bounds/', { params });
        return res.data;
    },

    /**
     * Get detailed information for a specific venue.
     * @param {string} venueId - Venue ID
     * @returns {Promise<Object>}
     */
    async getVenue(venueId) {
        const res = await apiClient.get(`/geo/venues/${venueId}/`);
        return res.data;
    },

    /**
     * Find nearest venues to a GPS location.
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @param {Object} [options] - Additional options
     * @param {string} [options.institution] - Filter by institution
     * @param {number} [options.limit=10] - Number of venues to return
     * @param {number} [options.max_distance=1000] - Maximum search radius in meters
     * @returns {Promise<Array>}
     */
    async getNearbyVenues(lat, lon, { institution, limit = 10, max_distance = 1000 } = {}) {
        const params = { lat, lon, limit, max_distance };
        if (institution) params.institution = institution;
        const res = await apiClient.get('/geo/venues/nearby/', { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // GEOCODING (Database-first, rate-limited)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Convert an address to GPS coordinates (database-first).
     * @param {string} address - Address to geocode
     * @returns {Promise<{address: string, latitude: number, longitude: number}>}
     */
    async geocodeAddress(address) {
        const res = await apiClient.get('/geo/geocode/', { params: { address } });
        return res.data;
    },

    /**
     * Convert GPS coordinates to a human-readable address.
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<{address: string, latitude: number, longitude: number}>}
     */
    async reverseGeocode(lat, lon) {
        const res = await apiClient.get('/geo/reverse-geocode/', { params: { lat, lon } });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // DIRECTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get directions and distance between two points.
     * @param {number} originLat - Origin latitude
     * @param {number} originLon - Origin longitude
     * @param {number} destLat - Destination latitude
     * @param {number} destLon - Destination longitude
     * @param {string} [travelMode='walking'] - Travel mode (walking/driving/bicycling/transit)
     * @returns {Promise<Object>}
     */
    async getDirections(originLat, originLon, destLat, destLon, travelMode = 'walking') {
        const params = {
            origin_lat: originLat,
            origin_lon: originLon,
            dest_lat: destLat,
            dest_lon: destLon,
            travel_mode: travelMode,
        };
        const res = await apiClient.get('/geo/directions/', { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // CLASSES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find today's classes near current location.
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @param {number} [maxDistance=500] - Maximum search radius in meters
     * @returns {Promise<Array>}
     */
    async getNearbyClasses(lat, lon, maxDistance = 500) {
        const params = { lat, lon, max_distance: maxDistance };
        const res = await apiClient.get('/geo/classes/nearby/', { params });
        return res.data;
    },

    /**
     * Get walking directions to a specific class venue.
     * @param {string} entryId - Timetable entry ID
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @returns {Promise<Object>}
     */
    async getClassDirections(entryId, lat, lon) {
        const params = { lat, lon };
        const res = await apiClient.get(`/geo/classes/${entryId}/directions/`, { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION CHECK-IN (Backend-verified)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Submit a location check-in for attendance verification.
     * Distance is verified backend-only - frontend distances are ignored.
     * @param {Object} data - Check-in data
     * @param {string} data.timetable_entry_id - Timetable entry ID
     * @param {number} data.latitude - Current latitude
     * @param {number} data.longitude - Current longitude
     * @param {number} [data.accuracy] - GPS accuracy in meters
     * @param {Object} [data.device_info] - Device information for audit
     * @returns {Promise<Object>}
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
        const res = await apiClient.post('/geo/check-in/', payload);
        return res.data;
    },

    /**
     * Get user's check-in history.
     * @param {number} [limit=20] - Number of records to return
     * @returns {Promise<Array>}
     */
    async getCheckInHistory(limit = 20) {
        const res = await apiClient.get('/geo/check-in/history/', { params: { limit } });
        return res.data;
    },

    /**
     * Get today's check-in summary.
     * @returns {Promise<Object>}
     */
    async getCheckInSummary() {
        const res = await apiClient.get('/geo/check-in/summary/');
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION RECORDING (Throttled)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record a location update (throttled - 30s min, 5m min movement).
     * @param {number} latitude - Current latitude
     * @param {number} longitude - Current longitude
     * @param {number} [accuracy] - GPS accuracy in meters
     * @param {string} [eventType='background'] - Event type (check_in/background/manual)
     * @returns {Promise<void>}
     */
    async recordLocation(latitude, longitude, accuracy, eventType = 'background') {
        try {
            await apiClient.post('/geo/location/record/', {
                latitude,
                longitude,
                accuracy,
                event_type: eventType,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            // Silently fail - non-critical
            console.debug('Failed to record location:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // VENUE OCCUPANCY & SCHEDULE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check if a venue is currently occupied.
     * @param {string} venueId - Venue ID
     * @returns {Promise<{occupied: boolean, current_class: Object|null}>}
     */
    async getVenueOccupancy(venueId) {
        const res = await apiClient.get(`/geo/venues/${venueId}/occupancy/`);
        return res.data;
    },

    /**
     * Get today's schedule for a venue.
     * @param {string} venueId - Venue ID
     * @param {string} [date] - Optional date (YYYY-MM-DD)
     * @returns {Promise<Array>}
     */
    async getVenueSchedule(venueId, date = null) {
        const params = date ? { date } : {};
        const res = await apiClient.get(`/geo/venues/${venueId}/schedule/`, { params });
        return res.data;
    },
};

export default GeoService;