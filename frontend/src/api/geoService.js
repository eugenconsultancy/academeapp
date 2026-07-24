// frontend/src/api/geoService.js
import apiClient from './client';

/**
 * GeoService - API client for location-related endpoints.
 * All methods include JSDoc types for better IDE autocomplete.
 * Error handling extracts backend `detail` messages for user‑friendly feedback.
 */
const GeoService = {
    // ═══════════════════════════════════════════════════════════════
    // VENUES
    // ═══════════════════════════════════════════════════════════════

    async listVenues({ search, venue_type, limit = 20, offset = 0 } = {}) {
        const params = { limit, offset };
        if (search) params.search = search;
        if (venue_type) params.venue_type = venue_type;
        const res = await apiClient.get('/geo/venues/', { params });
        return res.data;
    },

    async getVenuesInBounds({ north, south, east, west, limit = 100 }) {
        const params = { north, south, east, west, limit };
        const res = await apiClient.get('/geo/venues/bounds/', { params });
        return res.data;
    },

    async getVenue(venueId) {
        const res = await apiClient.get(`/geo/venues/${venueId}/`);
        return res.data;
    },

    async getNearbyVenues(lat, lon, { institution, limit = 10, max_distance = 1000 } = {}) {
        const params = { lat, lon, limit, max_distance };
        if (institution) params.institution = institution;
        const res = await apiClient.get('/geo/venues/nearby/', { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // GEOCODING (Database‑first, rate‑limited)
    // ═══════════════════════════════════════════════════════════════

    async geocodeAddress(address) {
        try {
            const res = await apiClient.get('/geo/geocode/', { params: { address } });
            return res.data;
        } catch (err) {
            const detail = err.response?.data?.detail || 'Geocoding failed due to a network error.';
            throw new Error(detail);
        }
    },

    async reverseGeocode(lat, lon) {
        try {
            const res = await apiClient.get('/geo/reverse-geocode/', { params: { lat, lon } });
            return res.data;
        } catch (err) {
            const detail = err.response?.data?.detail || 'Reverse geocoding failed.';
            throw new Error(detail);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DIRECTIONS
    // ═══════════════════════════════════════════════════════════════

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

    async getNearbyClasses(lat, lon, maxDistance = 500) {
        const params = { lat, lon, max_distance: maxDistance };
        const res = await apiClient.get('/geo/classes/nearby/', { params });
        return res.data;
    },

    async getClassDirections(entryId, lat, lon) {
        const params = { lat, lon };
        const res = await apiClient.get(`/geo/classes/${entryId}/directions/`, { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION CHECK‑IN (Backend‑verified)
    // ═══════════════════════════════════════════════════════════════

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

    async getCheckInHistory(limit = 20) {
        const res = await apiClient.get('/geo/check-in/history/', { params: { limit } });
        return res.data;
    },

    async getCheckInSummary() {
        const res = await apiClient.get('/geo/check-in/summary/');
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION RECORDING (Throttled)
    // ═══════════════════════════════════════════════════════════════

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
            console.debug('Failed to record location:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // VENUE OCCUPANCY & SCHEDULE
    // ═══════════════════════════════════════════════════════════════

    async getVenueOccupancy(venueId) {
        const res = await apiClient.get(`/geo/venues/${venueId}/occupancy/`);
        return res.data;
    },

    async getVenueSchedule(venueId, date = null) {
        const params = date ? { date } : {};
        const res = await apiClient.get(`/geo/venues/${venueId}/schedule/`, { params });
        return res.data;
    },
};

export default GeoService;