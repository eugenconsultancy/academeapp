import { classesApi } from '../api/classesApi';
import apiClient from '../api/client';   // for nearby classes via /geo
import { offlineStorage } from '../utils/storage';

/**
 * Class Service – business logic layer for class-related operations.
 * Wraps classesApi, adds caching, offline support, and normalised payloads.
 */
export const classService = {
    // ─────────────────────────────────────────────────────────
    // 1. TIMETABLE (full student timetable)
    // ─────────────────────────────────────────────────────────
    async getTimetable() {
        try {
            const res = await classesApi.getTimetable();
            const data = res.data ?? res;
            await offlineStorage.cacheApiResponse('/classes/timetable/', data, 60);
            return data;
        } catch (err) {
            const cached = await offlineStorage.getCachedResponse('/classes/timetable/');
            if (cached) return cached;
            throw err;
        }
    },

    // Timetable CRUD (for class reps / admins)
    async createTimetableEntry(payload) {
        try {
            const res = await classesApi.createTimetableEntry(payload);
            return res.data ?? res;
        } catch (err) {
            // Queue offline if needed
            await offlineStorage.addToSyncQueue({
                type: 'TIMETABLE_CREATE',
                endpoint: '/classes/timetable/',
                method: 'POST',
                data: payload,
            });
            return { offline: true, message: 'Entry queued for sync' };
        }
    },

    async updateTimetableEntry(id, payload) {
        try {
            const res = await classesApi.updateTimetableEntry(id, payload);
            return res.data ?? res;
        } catch (err) {
            await offlineStorage.addToSyncQueue({
                type: 'TIMETABLE_UPDATE',
                endpoint: `/classes/timetable/${id}/`,
                method: 'PUT',
                data: payload,
            });
            return { offline: true, message: 'Update queued for sync' };
        }
    },

    async deleteTimetableEntry(id) {
        try {
            await classesApi.deleteTimetableEntry(id);
            return { success: true };
        } catch (err) {
            throw err; // deletion not queued offline – must be online
        }
    },

    // Get timetable for a specific class group (used by reps)
    async getClassTimetable(classGroupId) {
        try {
            const res = await classesApi.getClassTimetable(classGroupId);
            const data = res.data ?? res;
            await offlineStorage.cacheApiResponse(`/classes/timetable/class/${classGroupId}/`, data, 60);
            return data;
        } catch (err) {
            const cached = await offlineStorage.getCachedResponse(`/classes/timetable/class/${classGroupId}/`);
            if (cached) return cached;
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 2. TODAY'S CLASSES
    // ─────────────────────────────────────────────────────────
    async getTodayClasses() {
        try {
            const res = await classesApi.getTodayClasses();
            const data = res.data ?? res;
            await offlineStorage.cacheApiResponse('/classes/today/', data, 10);
            return data;
        } catch (err) {
            const cached = await offlineStorage.getCachedResponse('/classes/today/');
            if (cached) return cached;
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 3. ATTENDANCE
    // ─────────────────────────────────────────────────────────
    /**
     * Mark attendance for a timetable entry.
     * Accepts optional location object { latitude, longitude }.
     */
    async markAttendance(entryId, location = null) {
        const attemptedAt = new Date().toISOString();
        const studentLat = location?.latitude ?? null;
        const studentLon = location?.longitude ?? null;

        try {
            const res = await classesApi.markAttendance(entryId, attemptedAt, studentLat, studentLon);
            return res.data ?? res;
        } catch (err) {
            // Save offline
            await offlineStorage.saveAttendance({
                timetableEntryId: entryId,
                studentLat,
                studentLon,
                attemptedAt,
            });
            return { offline: true, message: 'Attendance saved offline' };
        }
    },

    // Get attendance records for a specific timetable entry
    async getAttendance(entryId) {
        try {
            const res = await classesApi.getAttendance(entryId);
            return res.data ?? res;
        } catch (err) {
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 4. WEEKLY SUMMARY
    // ─────────────────────────────────────────────────────────
    async getWeeklySummary() {
        try {
            const res = await classesApi.getWeeklySummary();
            return res.data ?? res;
        } catch (err) {
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 5. CLASS REPRESENTATIVE
    // ─────────────────────────────────────────────────────────
    async getRepresentedClass() {
        try {
            const res = await classesApi.getRepresentedClass();
            return res.data ?? res;
        } catch (err) {
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 6. NEARBY CLASSES (via GeoService, not classesApi)
    // ─────────────────────────────────────────────────────────
    async getNearbyClasses(lat, lon, maxDistance = 500) {
        try {
            const res = await apiClient.get('/geo/classes/nearby/', {
                params: { lat, lon, max_distance: maxDistance },
            });
            return res.data;
        } catch (err) {
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────
    // 7. OFFLINE SYNC HELPERS
    // ─────────────────────────────────────────────────────────
    async syncOfflineData() {
        return offlineStorage.processSyncQueue();
    },

    async getPendingSyncCount() {
        return offlineStorage.getPendingSyncCount();
    },
};

export default classService;