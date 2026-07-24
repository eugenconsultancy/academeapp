// frontend/src/services/classService.js
import { classesApi } from '../api/classesApi';
import GeoService from '../api/geoService';   // ✅ centralized geo calls
import { offlineStorage } from '../utils/storage';

/**
 * Class Service – business logic layer for class‑related operations.
 * All location‑based queries now go through GeoService for consistency.
 */
export const classService = {
    // ─────────────────────────────────────────────────────────
    // 1. TIMETABLE
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

    async createTimetableEntry(payload) {
        try {
            const res = await classesApi.createTimetableEntry(payload);
            return res.data ?? res;
        } catch (err) {
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
            throw err;
        }
    },

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
    // 3. ATTENDANCE (delegates to attendanceService; no direct calls)
    // ─────────────────────────────────────────────────────────
    // (Removed markAttendance and getAttendance – now handled by attendanceService)

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
    // 6. NEARBY CLASSES (now uses GeoService exclusively)
    // ─────────────────────────────────────────────────────────
    async getNearbyClasses(lat, lon, maxDistance = 500) {
        try {
            const data = await GeoService.getNearbyClasses(lat, lon, maxDistance);
            return data;  // already enriched with backend distances
        } catch (err) {
            const detail = err.response?.data?.detail || err.message || 'Failed to fetch nearby classes';
            throw new Error(detail);
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