import { classesApi } from '../api/classesApi';

/**
 * Class Service - Business logic layer for class-related operations.
 * Handles data transformation, caching, and offline support.
 */
export const classService = {
    /**
     * Get today's classes with attendance status.
     * Falls back to cached data when offline.
     */
    async getTodayClasses() {
        try {
            const data = await classesApi.getTodayClasses();
            // Cache for offline access
            localStorage.setItem('today_classes', JSON.stringify(data));
            return data;
        } catch (error) {
            // Offline fallback
            const cached = localStorage.getItem('today_classes');
            if (cached) return JSON.parse(cached);
            throw error;
        }
    },

    /**
     * Mark attendance with optional GPS location.
     */
    async markAttendance(entryId, location = null) {
        const payload = {
            timetableEntryId: entryId,
            attemptedAt: new Date().toISOString(),
        };

        if (location) {
            payload.latitude = location.latitude;
            payload.longitude = location.longitude;
            payload.accuracy = location.accuracy;
        }

        return classesApi.markAttendance(
            payload.timetableEntryId,
            payload.attemptedAt,
            payload.latitude,
            payload.longitude,
            payload.accuracy
        );
    },

    /**
     * Get weekly attendance summary.
     */
    async getWeeklySummary(weekStart = null) {
        return classesApi.getWeeklySummary(weekStart);
    },

    /**
     * Get class timetable for a specific group.
     */
    async getClassTimetable(classGroupId) {
        return classesApi.getClassTimetable(classGroupId);
    },

    /**
     * Find nearby classes based on GPS location.
     */
    async getNearbyClasses(lat, lon, maxDistance = 500) {
        return classesApi.getNearbyClasses(lat, lon, maxDistance);
    },

    /**
     * Submit GPS location check-in for attendance verification.
     */
    async submitLocationCheckIn(entryId, latitude, longitude, accuracy) {
        return classesApi.submitCheckIn({
            timetable_entry_id: entryId,
            latitude,
            longitude,
            accuracy,
            device_info: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                timestamp: new Date().toISOString(),
            },
        });
    },
};

export default classService;