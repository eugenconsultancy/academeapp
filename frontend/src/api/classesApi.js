import apiClient from './client';

export const classesApi = {
    // ==========================================
    // TIMETABLE
    // ==========================================
    getTimetable: () => apiClient.get('/classes/timetable/'),
    createTimetableEntry: (data) => apiClient.post('/classes/timetable/', data),
    updateTimetableEntry: (id, data) => apiClient.put(`/classes/timetable/${id}/`, data),
    deleteTimetableEntry: (id) => apiClient.delete(`/classes/timetable/${id}/`),
    getClassTimetable: (classGroupId) =>
        apiClient.get(`/classes/timetable/class/${classGroupId}/`),

    // ==========================================
    // TODAY & REPRESENTED CLASS
    // ==========================================
    getTodayClasses: () => apiClient.get('/classes/today/'),
    getRepresentedClass: () => apiClient.get('/classes/my-represented-class/'),

    // ==========================================
    // SINGLE ATTENDANCE MARK
    // ==========================================
    markAttendance: (timetableEntryId, attemptedAt, latitude, longitude) =>
        apiClient.post('/classes/mark-attendance/', {
            timetable_entry_id: timetableEntryId,
            attempted_at: attemptedAt || new Date().toISOString(),
            student_lat: latitude ?? null,
            student_lon: longitude ?? null,
        }),

    // ==========================================
    // ATTENDANCE RECORDS (filters)
    // ==========================================
    getAttendanceRecords: (params) =>
        apiClient.get('/classes/attendance/', { params }),

    // ==========================================
    // CLASS ATTENDANCE SUMMARY (by class & term)
    // ==========================================
    getClassAttendanceSummary: (classId, termId) =>
        apiClient.get('/classes/attendance/class-summary/', {
            params: { class_id: classId, term_id: termId },
        }),

    // ==========================================
    // ATTENDANCE FOR A SPECIFIC ENTRY
    // ==========================================
    getAttendance: (entryId) => apiClient.get(`/classes/attendance/${entryId}/`),

    // ==========================================
    // WEEKLY SUMMARY – NOW ACCEPTS week_start PARAMETER
    // ==========================================
    getWeeklySummary: (weekStart) =>
        apiClient.get('/classes/weekly-summary/', {
            params: { week_start: weekStart },
        }),

    // ==========================================
    // CHECK‑IN
    // ==========================================
    getCheckInHistory: (limit = 20) =>
        apiClient.get('/classes/attendance/', {
            params: { limit, ordering: '-marked_at' },
        }),
    getCheckInSummary: () =>
        apiClient.get('/classes/attendance/checkin-summary/'),

    // ==========================================
    // NEW: LIST ALL CLASS GROUPS (admin only)
    // ==========================================
    listClassGroups: () => apiClient.get('/classes/class-groups/'),
};