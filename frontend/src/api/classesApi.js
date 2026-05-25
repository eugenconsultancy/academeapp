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
    getClassTimetable: (classGroupId) =>
        apiClient.get(`/classes/timetable/class/${classGroupId}/`),

    // ==========================================
    // ATTENDANCE
    // ==========================================

    /** Get today's classes */
    getTodayClasses: () => apiClient.get('/classes/today/'),

    /** Get the class where the current user is the class rep */
    getRepresentedClass: () => apiClient.get('/classes/my-represented-class/'),

    markAttendance: (timetableEntryId, attemptedAt, latitude, longitude) =>
        apiClient.post('/classes/mark-attendance/', {
            timetable_entry_id: timetableEntryId,
            attempted_at: attemptedAt || new Date().toISOString(),
            student_lat: latitude ?? null,
            student_lon: longitude ?? null,
        }),

    /** Get attendance records for a specific timetable entry */
    getAttendance: (entryId) => apiClient.get(`/classes/attendance/${entryId}/`),

    /**
     * Get weekly attendance summary.
     */
    getWeeklySummary: () => apiClient.get('/classes/weekly-summary/'),
};