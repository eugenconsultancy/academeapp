import apiClient from './client';

export const classesApi = {
    // ==========================================
    // TIMETABLE
    // ==========================================

    /** Get current user's timetable */
    getTimetable: () => apiClient.get('/classes/timetable/'),

    /** Create a new timetable entry (class rep only) */
    createTimetableEntry: (data) => apiClient.post('/classes/timetable/', data),

    /** Update an existing timetable entry */
    updateTimetableEntry: (id, data) => apiClient.put(`/classes/timetable/${id}/`, data),

    /** Delete a timetable entry */
    deleteTimetableEntry: (id) => apiClient.delete(`/classes/timetable/${id}/`),

    /** Get timetable for a specific class group */
    getClassTimetable: (classGroupId) => apiClient.get(`/classes/timetable/class/${classGroupId}/`),

    /** Bulk upload timetable entries */
    bulkUploadTimetable: (entries) => apiClient.post('/classes/timetable/bulk/', { entries }),

    /** Get weekly timetable template */
    getWeeklyTemplate: () => apiClient.get('/classes/timetable/weekly-template/'),

    /** Create/update weekly timetable template */
    saveWeeklyTemplate: (data) => apiClient.post('/classes/timetable/weekly-template/', data),

    /** Create a session exception (cancellation/venue change) */
    createException: (data) => apiClient.post('/classes/timetable/exception/', data),

    /** List session exceptions */
    listExceptions: (params) => apiClient.get('/classes/timetable/exception/', { params }),

    // ==========================================
    // ATTENDANCE
    // ==========================================

    /** Get today's classes */
    getTodayClasses: () => apiClient.get('/classes/today/'),
    
    /** Get the class where the current user is the class rep */
    getRepresentedClass: () => apiClient.get('/classes/my-represented-class/'),

    /** Mark attendance for a class */
    markAttendance: (timetableEntryId, attemptedAt, latitude, longitude, accuracy) =>
        apiClient.post('/classes/mark-attendance/', {
            timetable_entry_id: timetableEntryId,
            attempted_at: attemptedAt || new Date().toISOString(),
            latitude: latitude || null,
            longitude: longitude || null,
            gps_accuracy: accuracy || null,
        }),

    /** Get attendance for a specific class entry */
    getAttendance: (entryId) => apiClient.get(`/classes/attendance/${entryId}/`),

    /** Get attendance for an entire class group */
    getClassAttendance: (classGroupId, params) =>
        apiClient.get(`/classes/attendance/class/${classGroupId}/`, { params }),

    /** Get weekly attendance summary */
    getWeeklySummary: (weekStart) =>
        apiClient.get('/classes/weekly-summary/', { params: { week_start: weekStart } }),

    // ==========================================
    // VENUES (Consolidated from GeoService)
    // ==========================================

    /** List all campus venues */
    listVenues: (params) => apiClient.get('/classes/venues/', { params }),

    /** Get single venue */
    getVenue: (id) => apiClient.get(`/classes/venues/${id}/`),

    /** Find nearest venues */
    getNearbyVenues: (lat, lon, params) =>
        apiClient.get('/classes/venues/nearby/', { params: { lat, lon, ...params } }),

    // ==========================================
    // LOCATION (Consolidated from GeoService)
    // ==========================================

    /** Find nearby classes */
    getNearbyClasses: (lat, lon, maxDistance) =>
        apiClient.get('/classes/classes/nearby/', {
            params: { lat, lon, max_distance: maxDistance }
        }),

    /** Get directions to class */
    getClassDirections: (entryId, lat, lon) =>
        apiClient.get(`/classes/classes/${entryId}/directions/`, { params: { lat, lon } }),

    /** Submit location check-in */
    submitCheckIn: (data) => apiClient.post('/classes/check-in/', data),

    /** Get check-in history */
    getCheckInHistory: (limit) => apiClient.get('/classes/check-in/history/', { params: { limit } }),

    /** Get check-in summary */
    getCheckInSummary: () => apiClient.get('/classes/check-in/summary/'),
};