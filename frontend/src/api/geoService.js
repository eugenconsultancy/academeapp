/**
 * GeoService API Client
 * Handles all location-based API calls to the Django backend.
 * 
 * Endpoints:
 * - /api/geo/venues/           - List/search venues
 * - /api/geo/venues/nearby/    - Find nearest venues
 * - /api/geo/geocode/          - Address -> Coordinates
 * - /api/geo/reverse-geocode/  - Coordinates -> Address
 * - /api/geo/directions/       - Get directions between points
 * - /api/geo/classes/nearby/   - Find nearby classes
 * - /api/geo/check-in/         - Location-verified attendance
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper: Get auth token
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

// Helper: Handle API responses
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || error.detail || `HTTP ${response.status}`);
    }
    return response.json();
}

// Helper: Build query string
function buildQuery(params) {
    const filtered = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '');
    if (filtered.length === 0) return '';
    return '?' + new URLSearchParams(filtered).toString();
}

// ============================================
// GeoService API
// ============================================

const GeoService = {
    // ==========================================
    // VENUES
    // ==========================================

    /**
     * List all campus venues
     * @param {Object} options
     * @param {string} options.search - Search by name
     * @param {string} options.venue_type - Filter by type
     * @param {number} options.limit - Max results (default 20)
     */
    async listVenues({ search, venue_type, limit = 20 } = {}) {
        const query = buildQuery({ search, venue_type, limit });
        const response = await fetch(`${BASE_URL}/geo/venues/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /**
     * Get single venue details
     * @param {string} venueId
     */
    async getVenue(venueId) {
        const response = await fetch(`${BASE_URL}/geo/venues/${venueId}/`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /**
     * Find nearest venues to a GPS location
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @param {Object} options
     * @param {string} options.institution - Filter by institution
     * @param {number} options.limit - Max results (default 5)
     */
    async getNearbyVenues(lat, lon, { institution, limit = 5 } = {}) {
        const query = buildQuery({ lat, lon, institution, limit });
        const response = await fetch(`${BASE_URL}/geo/venues/nearby/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // ==========================================
    // GEOCODING
    // ==========================================

    /**
     * Convert address to GPS coordinates
     * @param {string} address - Full address to geocode
     */
    async geocodeAddress(address) {
        const query = buildQuery({ address });
        const response = await fetch(`${BASE_URL}/geo/geocode/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /**
     * Convert GPS coordinates to address
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    async reverseGeocode(lat, lon) {
        const query = buildQuery({ lat, lon });
        const response = await fetch(`${BASE_URL}/geo/reverse-geocode/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // ==========================================
    // DIRECTIONS
    // ==========================================

    /**
     * Get walking/driving directions between two points
     * @param {number} originLat
     * @param {number} originLon
     * @param {number} destLat
     * @param {number} destLon
     * @param {string} travelMode - walking, driving, bicycling, transit
     */
    async getDirections(originLat, originLon, destLat, destLon, travelMode = 'walking') {
        const query = buildQuery({
            origin_lat: originLat,
            origin_lon: originLon,
            dest_lat: destLat,
            dest_lon: destLon,
            travel_mode: travelMode,
        });
        const response = await fetch(`${BASE_URL}/geo/directions/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // ==========================================
    // CLASSES
    // ==========================================

    /**
     * Find today's classes near a location
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @param {number} maxDistance - Max distance in meters (default 500)
     */
    async getNearbyClasses(lat, lon, maxDistance = 500) {
        const query = buildQuery({ lat, lon, max_distance: maxDistance });
        const response = await fetch(`${BASE_URL}/geo/classes/nearby/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /**
     * Get directions to a specific class venue
     * @param {string} entryId - Timetable entry UUID
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     */
    async getClassDirections(entryId, lat, lon) {
        const query = buildQuery({ lat, lon });
        const response = await fetch(`${BASE_URL}/geo/classes/${entryId}/directions/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // ==========================================
    // LOCATION CHECK-IN (Attendance)
    // ==========================================

    /**
     * Submit GPS location for attendance verification
     * @param {Object} data
     * @param {string} data.timetable_entry_id
     * @param {number} data.latitude
     * @param {number} data.longitude
     * @param {number} data.accuracy - GPS accuracy in meters
     * @param {Object} data.device_info - Device details
     */
    async submitCheckIn({ timetable_entry_id, latitude, longitude, accuracy, device_info = {} }) {
        const response = await fetch(`${BASE_URL}/geo/check-in/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                timetable_entry_id,
                latitude,
                longitude,
                accuracy,
                device_info,
            }),
        });
        return handleResponse(response);
    },

    /**
     * Get location check-in history
     * @param {number} limit - Max results (default 20)
     */
    async getCheckInHistory(limit = 20) {
        const query = buildQuery({ limit });
        const response = await fetch(`${BASE_URL}/geo/check-in/history/${query}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /**
     * Get today's check-in summary
     */
    async getCheckInSummary() {
        const response = await fetch(`${BASE_URL}/geo/check-in/summary/`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },
};

export default GeoService;