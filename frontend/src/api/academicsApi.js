import apiClient from './client';

export const academicsApi = {
    getAttendance: (params) => apiClient.get('/academics/attendance/', { params }),
    getClassAttendanceSummary: (classId, termId) =>
        apiClient.get('/academics/attendance/class_attendance_summary/', {
            params: { class_id: classId, term_id: termId }
        }),
    getMarks: (params) => apiClient.get('/academics/marks/', { params }),
    getSubjects: () => apiClient.get('/academics/subjects/'),
    getClasses: (params) => apiClient.get('/academics/classes/', { params }),
    getTerms: () => apiClient.get('/academics/terms/'),
    getTimetable: (params) => apiClient.get('/academics/timetable/', { params }),
};
