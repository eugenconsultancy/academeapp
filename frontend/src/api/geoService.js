import apiClient from './client';    // global Axios instance (no /api prefix)

const GeoService = {
    // ═══════════════════════════════════════════════════════════════
    // VENUES
    // ═══════════════════════════════════════════════════════════════

    async listVenues({ search, venue_type, limit = 20 } = {}) {
        const params = {};
        if (search) params.search = search;
        if (venue_type) params.venue_type = venue_type;
        if (limit) params.limit = limit;
        const res = await apiClient.get('/geo/venues/', { params });
        return res.data;
    },

    async getVenue(venueId) {
        const res = await apiClient.get(`/geo/venues/${venueId}/`);
        return res.data;
    },

    async getNearbyVenues(lat, lon, { institution, limit = 5 } = {}) {
        const params = { lat, lon, limit };
        if (institution) params.institution = institution;
        const res = await apiClient.get('/geo/venues/nearby/', { params });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // VENUE OCCUPANCY & SCHEDULE (NEW)
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

    // ═══════════════════════════════════════════════════════════════
    // GEOCODING
    // ═══════════════════════════════════════════════════════════════

    async geocodeAddress(address) {
        const res = await apiClient.get('/geo/geocode/', { params: { address } });
        return res.data;
    },

    async reverseGeocode(lat, lon) {
        const res = await apiClient.get('/geo/reverse-geocode/', { params: { lat, lon } });
        return res.data;
    },

    // ═══════════════════════════════════════════════════════════════
    // DIRECTIONS
    // ═══════════════════════════════════════════════════════════════

    async getDirections(originLat, originLon, destLat, destLon, travelMode = 'walking') {
        const params = {
            origin_lat: originLat, origin_lon: originLon,
            dest_lat: destLat, dest_lon: destLon,
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
    // LOCATION CHECK‑IN
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
        try {
            const res = await apiClient.post('/geo/check-in/', payload);
            return res.data;
        } catch (error) {
            // Network error → offline fallback (if implemented)
            if (!error.response && error.request) {
                // you could queue offline here
            }
            throw error;
        }
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
    // LOCATION RECORDING (NEW)
    // ═══════════════════════════════════════════════════════════════

    async recordLocation(latitude, longitude, accuracy) {
        try {
            await apiClient.post('/geo/location/record/', {
                latitude,
                longitude,
                accuracy,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            console.debug('Failed to record location:', err);
        }
    },
};

export default GeoService;