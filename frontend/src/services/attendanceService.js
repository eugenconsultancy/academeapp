import { classesApi } from '../api/classesApi';
import GeoService from '../api/geoService';
import { offlineStorage } from '../utils/storage';
import { isWithinAttendanceWindow, isSchoolDay, formatISODate } from '../utils/time';

/**
 * Attendance Service - Handles attendance marking with location verification.
 * All features now use the 'classes' backend exclusively.
 */
export const attendanceService = {
    // ═══════════════════════════════════════════════════════════════
    // STATUS CONSTANTS (for UI only; backend does not store status)
    // ═══════════════════════════════════════════════════════════════
    STATUS_OPTIONS: [
        { value: 'PRESENT', label: 'Present', color: 'emerald' },
        { value: 'ABSENT', label: 'Absent', color: 'red' },
        { value: 'LATE', label: 'Late', color: 'amber' },
        { value: 'EXCUSED', label: 'Excused', color: 'slate' },
    ],

    // ═══════════════════════════════════════════════════════════════
    // SINGLE ATTENDANCE MARKING
    // ═══════════════════════════════════════════════════════════════
    async markAttendance(entryId, options = {}) {
        const { requireGps = false } = options;  // no status field sent

        try {
            let latitude = null, longitude = null, accuracy = null;

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

            const result = await classesApi.markAttendance(
                entryId,
                new Date().toISOString(),
                latitude,
                longitude
            );
            return result;
        } catch (error) {
            console.warn('Failed to mark attendance online, saving offline:', error);
            await this.queueOfflineAttendance(entryId);
            return {
                offline: true,
                message: 'Attendance saved offline - will sync when online',
                entryId,
            };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BULK ATTENDANCE (frontend loops over single marks)
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
                // Each student’s attendance is marked individually.
                // We assume the caller has the timetableEntryId for each student.
                // If you need to mark by student_id, you must first obtain the student’s timetable entry.
                // For now we just pass a dummy timetableEntryId – adapt as needed.
                // This function should be called with proper entry IDs.
                const res = await classesApi.markAttendance(entry.timetableEntryId, new Date().toISOString());
                results.push({ ...entry, success: true, ...res });
            } catch (err) {
                errors.push({ ...entry, error: err.message });
                // Save offline for failed ones
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
    // QUICK ACTIONS
    // ═══════════════════════════════════════════════════════════════
    generateBulkAttendanceData(students, status = 'PRESENT') {
        if (!students || !students.length) return [];
        return students.map(student => ({
            student_id: student.id || student.student_id,
            timetableEntryId: student.timetableEntryId,  // must be provided by caller
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
    // ATTENDANCE QUERIES
    // ═══════════════════════════════════════════════════════════════
    async getAttendanceRecords(filters = {}) {
        try {
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
            const response = await classesApi.getClassAttendanceSummary(classId, termId);
            // Cache for offline
            await offlineStorage.cacheApiResponse(
                `/classes/attendance/class-summary/?class_id=${classId}&term_id=${termId}`,
                response.data,
                15
            );
            return response.data;
        } catch (error) {
            console.error('Failed to get class attendance summary:', error);
            const cached = await offlineStorage.getCachedResponse(
                `/classes/attendance/class-summary/?class_id=${classId}&term_id=${termId}`
            );
            if (cached) return cached;
            throw error;
        }
    },

    async getStudentAttendance(studentId, filters = {}) {
        try {
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
            return await classesApi.getWeeklySummary();
        } catch (error) {
            console.error('Failed to get weekly summary:', error);
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECK-IN OPERATIONS (derived from attendance records)
    // ═══════════════════════════════════════════════════════════════
    async getCheckInHistory(limit = 20) {
        try {
            const response = await classesApi.getCheckInHistory(limit);
            // Map attendance records to check-in format
            const records = response.data?.results || response.data || [];
            return records.map(r => ({
                id: r.id,
                unit_name: r.timetable_entry?.unit_name || 'Unknown',
                date: r.date,
                marked_at: r.marked_at,
                sync_method: r.sync_method,
            }));
        } catch (error) {
            console.error('Failed to get check-in history:', error);
            throw error;
        }
    },

    async getCheckInSummary() {
        try {
            const response = await classesApi.getCheckInSummary();
            return response.data;
        } catch (error) {
            console.error('Failed to get check-in summary:', error);
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
                    const result = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp,
                    };
                    resolve(result);
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
    // OFFLINE SUPPORT (using classes endpoint)
    // ═══════════════════════════════════════════════════════════════
    async queueOfflineAttendance(entryId) {
        try {
            await offlineStorage.saveAttendance({
                entryId,
                timestamp: new Date().toISOString(),
                synced: false,
            });
            await offlineStorage.addToSyncQueue({
                type: 'ATTENDANCE_SINGLE',
                endpoint: '/classes/mark-attendance/',
                method: 'POST',
                data: {
                    timetable_entry_id: entryId,
                    attempted_at: new Date().toISOString(),
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
        // Sync from IndexedDB
        try {
            const dbResult = await offlineStorage.processSyncQueue();
            synced += dbResult.synced || 0;
            failed += dbResult.failed || 0;
        } catch (error) {
            console.error('IndexedDB sync failed:', error);
        }
        // Sync from localStorage fallback
        try {
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            const unsynced = queue.filter(item => !item.synced);
            for (const item of unsynced) {
                try {
                    await classesApi.markAttendance(item.entryId, item.timestamp);
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
            grouped[date].present++; // every record is a presence
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