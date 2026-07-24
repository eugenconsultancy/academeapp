// frontend/src/services/attendanceService.js
import GeoService from '../api/geoService';
import { offlineStorage } from '../utils/storage';
import { isWithinAttendanceWindow, formatISODate } from '../utils/time';

/**
 * Attendance Service – location‑verified attendance via GeoService.
 * All GPS‑based marking now goes through /geo/check‑in/ (backend source of truth).
 */
export const attendanceService = {
    // ═══════════════════════════════════════════════════════════════
    // STATUS CONSTANTS (UI only – backend does not store status)
    // ═══════════════════════════════════════════════════════════════
    STATUS_OPTIONS: [
        { value: 'PRESENT', label: 'Present', color: 'emerald' },
        { value: 'ABSENT', label: 'Absent', color: 'red' },
        { value: 'LATE', label: 'Late', color: 'amber' },
        { value: 'EXCUSED', label: 'Excused', color: 'slate' },
    ],

    // ═══════════════════════════════════════════════════════════════
    // SINGLE ATTENDANCE MARKING (via GeoService)
    // ═══════════════════════════════════════════════════════════════
    async markAttendance(entryId, options = {}) {
        const { requireGps = false } = options;

        // 1. Fail fast if GPS is mandatory and we are offline
        if (requireGps && !navigator.onLine) {
            throw new Error('GPS attendance requires an internet connection.');
        }

        try {
            let latitude = null, longitude = null, accuracy = null;

            // Attempt to get current position
            try {
                const position = await this.getCurrentPosition({ timeout: 8000 });
                latitude = position.latitude;
                longitude = position.longitude;
                accuracy = position.accuracy;
            } catch (gpsError) {
                if (requireGps) {
                    throw new Error(`GPS required but unavailable: ${gpsError.message}`);
                }
                console.warn('GPS unavailable, marking without location:', gpsError.message);
            }

            // 2. Use the geo‑verified check‑in endpoint
            const response = await GeoService.submitCheckIn({
                timetable_entry_id: entryId,
                latitude,
                longitude,
                accuracy,
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                },
            });

            // Pass through all relevant fields
            return {
                verified: response.verified,
                distance_meters: response.distance_meters,
                distance_display: response.distance_display,
                check_in_id: response.check_in_id,
                message: response.message,
                requires_manual_review: response.requires_manual_review || false,
            };
        } catch (error) {
            // If online but request failed (server error, etc.), try offline fallback (only if GPS not required)
            if (navigator.onLine && !requireGps) {
                console.warn('Online mark failed, saving offline:', error);
                await this.queueOfflineAttendance(entryId, latitude, longitude, accuracy);
                return {
                    offline: true,
                    message: 'Attendance saved offline – will sync when online',
                    entryId,
                };
            }

            // Re‑throw for the caller to handle (with detail)
            const detail =
                error.response?.data?.detail || error.message || 'Failed to verify attendance.';
            throw new Error(detail);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BULK ATTENDANCE (each student marked individually via GeoService)
    // ═══════════════════════════════════════════════════════════════
    async markBulkAttendance(classId, attendanceData, date = null) {
        if (!attendanceData || !attendanceData.length) {
            throw new Error('No attendance data provided');
        }

        const validStatuses = this.STATUS_OPTIONS.map(s => s.value);
        const invalid = attendanceData.filter(e => !validStatuses.includes(e.status));
        if (invalid.length) {
            throw new Error(`Invalid status values: ${invalid.map(e => e.status).join(', ')}`);
        }

        const results = [];
        const errors = [];

        const promises = attendanceData.map(async (entry) => {
            try {
                const res = await this.markAttendance(entry.timetableEntryId, {
                    requireGps: false,  // bulk marks don't usually require GPS per student
                });
                results.push({ ...entry, success: true, ...res });
            } catch (err) {
                errors.push({ ...entry, error: err.message });
                // Queue offline for failed ones
                await this.queueOfflineAttendance(entry.timetableEntryId);
            }
        });

        await Promise.allSettled(promises);

        if (errors.length > 0) {
            console.warn(`${errors.length} bulk entries failed and were queued offline`);
        }

        return {
            total: attendanceData.length,
            success: results.length,
            failed: errors.length,
            offlineQueued: errors.length,
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // QUICK ACTIONS (unchanged)
    // ═══════════════════════════════════════════════════════════════
    generateBulkAttendanceData(students, status = 'PRESENT') {
        if (!students || !students.length) return [];
        return students.map(student => ({
            student_id: student.id || student.student_id,
            timetableEntryId: student.timetableEntryId,
            status,
            remarks: status === 'ABSENT' ? 'Marked absent' : '',
        }));
    },

    setAllStatus(currentData, status) {
        if (!currentData || !currentData.length) return [];
        return currentData.map(entry => ({
            ...entry,
            status,
            remarks: status === 'PRESENT' ? '' : entry.remarks,
        }));
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTENDANCE QUERIES (via classesApi – kept for admin/non‑GPS data)
    // ═══════════════════════════════════════════════════════════════
    async getAttendanceRecords(filters = {}) {
        try {
            const { classesApi } = await import('../api/classesApi');
            const params = {};
            if (filters.class_id) params.class_id = filters.class_id;
            if (filters.student_id) params.student = filters.student_id;
            if (filters.term_id) params.term = filters.term_id;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            const response = await classesApi.getAttendanceRecords(params);
            return response.data;
        } catch (error) {
            console.error('Failed to get attendance records:', error);
            throw error;
        }
    },

    async getClassAttendanceSummary(classId, termId) {
        try {
            const { classesApi } = await import('../api/classesApi');
            const response = await classesApi.getClassAttendanceSummary(classId, termId);
            await offlineStorage.cacheApiResponse(
                `/classes/attendance/class-summary/?class_id=${classId}&term_id=${termId}`,
                response.data,
                15
            );
            return response.data;
        } catch (error) {
            const cached = await offlineStorage.getCachedResponse(
                `/classes/attendance/class-summary/?class_id=${classId}&term_id=${termId}`
            );
            if (cached) return cached;
            throw error;
        }
    },

    async getStudentAttendance(studentId, filters = {}) {
        try {
            const { classesApi } = await import('../api/classesApi');
            const params = { student: studentId, ...filters };
            const response = await classesApi.getAttendanceRecords(params);
            return response.data;
        } catch (error) {
            console.error('Failed to get student attendance:', error);
            throw error;
        }
    },

    async getWeeklySummary(weekStart = null) {
        try {
            const { classesApi } = await import('../api/classesApi');
            return await classesApi.getWeeklySummary();
        } catch (error) {
            console.error('Failed to get weekly summary:', error);
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECK‑IN OPERATIONS (now via GeoService – location‑aware)
    // ═══════════════════════════════════════════════════════════════
    async getCheckInHistory(limit = 20) {
        try {
            const history = await GeoService.getCheckInHistory(limit);
            return history;  // already in correct format
        } catch (error) {
            console.error('Failed to get check‑in history:', error);
            throw error;
        }
    },

    async getCheckInSummary() {
        try {
            const summary = await GeoService.getCheckInSummary();
            // summary now includes rejected_checkins and average_gps_accuracy_meters
            return summary;
        } catch (error) {
            console.error('Failed to get check‑in summary:', error);
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // GPS & LOCATION (unchanged)
    // ═══════════════════════════════════════════════════════════════
    getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp,
                    });
                },
                (error) => reject(new Error(this.getGeolocationErrorMessage(error))),
                {
                    enableHighAccuracy: true,
                    timeout: options.timeout || 10000,
                    maximumAge: options.maximumAge || 60000,
                }
            );
        });
    },

    getGeolocationErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Location permission denied.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information unavailable.';
            case error.TIMEOUT:
                return 'Location request timed out.';
            default:
                return `Unknown location error (Code: ${error.code})`;
        }
    },

    verifyLocationProximity(userLocation, venueLocation, maxDistance = 100) {
        if (!userLocation || !venueLocation) {
            return { verified: false, reason: 'Missing location data' };
        }
        const distance = GeoService.calculateDistance(
            userLocation.latitude, userLocation.longitude,
            venueLocation.latitude, venueLocation.longitude
        );
        return {
            verified: distance <= maxDistance,
            distance,
            maxDistance,
            walkingTime: GeoService.estimateWalkTime(distance),
            reason: distance > maxDistance
                ? `You are ${Math.round(distance)}m away (max: ${maxDistance}m)`
                : `Within range (${Math.round(distance)}m)`,
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // OFFLINE SUPPORT (now queues to /geo/check‑in/)
    // ═══════════════════════════════════════════════════════════════
    async queueOfflineAttendance(entryId, latitude = null, longitude = null, accuracy = null) {
        try {
            await offlineStorage.saveAttendance({
                entryId,
                timestamp: new Date().toISOString(),
                synced: false,
            });
            await offlineStorage.addToSyncQueue({
                type: 'ATTENDANCE_SINGLE',
                endpoint: '/geo/check-in/',           // ✅ updated endpoint
                method: 'POST',
                data: {
                    timetable_entry_id: entryId,
                    latitude,
                    longitude,
                    accuracy,
                    attempted_at: new Date().toISOString(),
                    device_info: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        } catch (error) {
            console.error('Failed to queue offline attendance:', error);
            this._fallbackQueueOffline(entryId);
        }
    },

    _fallbackQueueOffline(entryId) {
        try {
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            queue.push({
                entryId,
                timestamp: new Date().toISOString(),
                synced: false,
            });
            localStorage.setItem('attendance_queue', JSON.stringify(queue));
        } catch (error) {
            console.error('localStorage fallback failed:', error);
        }
    },

    async syncOfflineAttendance() {
        let synced = 0, failed = 0;
        // Sync from IndexedDB (will use the new endpoint)
        try {
            const dbResult = await offlineStorage.processSyncQueue();
            synced += dbResult.synced || 0;
            failed += dbResult.failed || 0;
        } catch (error) {
            console.error('IndexedDB sync failed:', error);
        }
        // Sync from localStorage fallback (also updated endpoint)
        try {
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            const unsynced = queue.filter(item => !item.synced);
            for (const item of unsynced) {
                try {
                    await GeoService.submitCheckIn({
                        timetable_entry_id: item.entryId,
                        // no location available, backend will handle
                    });
                    item.synced = true;
                    synced++;
                } catch (err) {
                    item.lastError = err.message;
                    failed++;
                }
            }
            localStorage.setItem('attendance_queue', JSON.stringify(queue));
        } catch (error) {
            console.error('localStorage sync failed:', error);
        }
        return { synced, failed, total: synced + failed };
    },

    async getPendingSyncCount() {
        try {
            const dbCount = await offlineStorage.getPendingSyncCount();
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            const localCount = queue.filter(item => !item.synced).length;
            return dbCount + localCount;
        } catch {
            return 0;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS (unchanged)
    // ═══════════════════════════════════════════════════════════════
    calculateAttendanceRate(present, total) {
        if (!total) return 0;
        return Math.round((present / total) * 100);
    },

    getAttendanceTrend(records) {
        if (!records || !records.length) return { labels: [], present: [], absent: [], late: [] };
        const grouped = {};
        records.forEach(record => {
            const date = record.date || formatISODate(record.marked_at);
            if (!grouped[date]) grouped[date] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            grouped[date].present++;
            grouped[date].total++;
        });
        const dates = Object.keys(grouped).sort();
        return {
            labels: dates,
            present: dates.map(d => grouped[d].present),
            absent: dates.map(d => grouped[d].absent),
            late: dates.map(d => grouped[d].late),
            excused: dates.map(d => grouped[d].excused),
            total: dates.map(d => grouped[d].total),
        };
    },

    getAtRiskStudents(summaryData, threshold = 75) {
        if (!summaryData) return [];
        return summaryData
            .filter(s => s.attendance_rate < threshold)
            .sort((a, b) => a.attendance_rate - b.attendance_rate);
    },

    validateAttendanceData(attendanceData) {
        const errors = [];
        if (!attendanceData || !attendanceData.length) errors.push('No data');
        attendanceData?.forEach((entry, i) => {
            if (!entry.student_id) errors.push(`Entry ${i + 1}: missing student_id`);
            if (!this.STATUS_OPTIONS.find(s => s.value === entry.status))
                errors.push(`Entry ${i + 1}: invalid status "${entry.status}"`);
        });
        return { valid: errors.length === 0, errors, totalEntries: attendanceData?.length || 0 };
    },

    checkAttendanceWindow(startTime, endTime) {
        const { isWithinAttendanceWindow } = require('../utils/time'); // dynamic import not needed, it's already imported
        const isOpen = isWithinAttendanceWindow(startTime, endTime);
        const remainingMinutes = getRemainingTime(endTime);
        return {
            isOpen,
            remainingMinutes,
            message: isOpen
                ? `Window open for ${remainingMinutes} more minutes`
                : 'Window closed',
        };
    },
};

export default attendanceService;