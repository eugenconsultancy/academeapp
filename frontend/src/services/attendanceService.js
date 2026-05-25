import { classesApi } from '../api/classesApi';
import { academicsApi } from '../api/academicsApi.js';
import GeoService from './geoService';
import { offlineStorage } from '../utils/storage';
import { isWithinAttendanceWindow, isSchoolDay, formatISODate } from '../utils/time';

/**
 * Attendance Service - Handles attendance marking with location verification.
 * Supports online, offline (queued via IndexedDB), and GPS-verified modes.
 * 
 * Backend: apps/academics/views.py - AttendanceViewSet
 * Backend: apps/academics/models.py - Attendance, Class, Term
 */
export const attendanceService = {
    // ═══════════════════════════════════════════════════════════════
    // ATTENDANCE STATUS OPTIONS
    // Backend: Attendance.STATUS_CHOICES
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

    /**
     * Mark attendance for a single class entry.
     * Attempts GPS verification first, falls back to basic marking.
     * Backend: POST /api/academics/attendance/
     * 
     * @param {string} entryId - Timetable entry UUID
     * @param {Object} options - Additional options
     * @param {string} options.status - Attendance status (PRESENT/ABSENT/LATE/EXCUSED)
     * @param {boolean} options.requireGps - Whether GPS is required
     * @returns {Object} Attendance result
     */
    async markAttendance(entryId, options = {}) {
        const { status = 'PRESENT', requireGps = false } = options;

        try {
            let locationData = null;

            // Try to get GPS location
            try {
                const position = await this.getCurrentPosition({ timeout: 8000 });
                locationData = {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                };
            } catch (gpsError) {
                if (requireGps) {
                    throw new Error(`GPS required but unavailable: ${gpsError.message}`);
                }
                console.warn('GPS unavailable, marking without location:', gpsError.message);
            }

            // Submit attendance
            const payload = {
                timetableEntryId: entryId,
                status: status,
                attemptedAt: new Date().toISOString(),
                ...(locationData || {}),
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    timestamp: new Date().toISOString(),
                },
            };

            return await classesApi.markAttendance(
                payload.timetableEntryId,
                payload.attemptedAt,
                payload.latitude,
                payload.longitude,
                payload.accuracy
            );
        } catch (error) {
            console.warn('Failed to mark attendance online, saving offline:', error);
            // Save offline
            await this.queueOfflineAttendance(entryId, status);
            return {
                offline: true,
                message: 'Attendance saved offline - will sync when online',
                entryId,
                status,
            };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BULK ATTENDANCE MARKING
    // Backend: POST /api/academics/attendance/mark_bulk_attendance/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mark attendance for an entire class at once
     * Backend: AttendanceViewSet.mark_bulk_attendance()
     * 
     * @param {number} classId - Class ID
     * @param {Array} attendanceData - Array of { student_id, status, remarks }
     * @param {string} date - Attendance date (YYYY-MM-DD)
     * @returns {Object} Result
     */
    async markBulkAttendance(classId, attendanceData, date = null) {
        // Validate attendance data
        const validStatuses = this.STATUS_OPTIONS.map(s => s.value);
        const invalidEntries = attendanceData.filter(
            entry => !validStatuses.includes(entry.status)
        );

        if (invalidEntries.length > 0) {
            throw new Error(
                `Invalid status values found: ${invalidEntries.map(e => e.status).join(', ')}`
            );
        }

        // Check if within attendance window
        if (!isSchoolDay(date ? new Date(date) : new Date())) {
            console.warn('Attempting to mark attendance on a non-school day');
        }

        const payload = {
            class_id: classId,
            date: date || formatISODate(new Date()),
            attendance: attendanceData,
        };

        try {
            return await classesApi.markBulkAttendance(payload);
        } catch (error) {
            console.warn('Failed to mark bulk attendance online, queuing:', error);

            // Queue for offline sync via IndexedDB
            await offlineStorage.addToSyncQueue({
                type: 'ATTENDANCE_BULK',
                endpoint: '/api/academics/attendance/mark_bulk_attendance/',
                method: 'POST',
                data: payload,
            });

            // Also save locally for immediate display
            await offlineStorage.saveAttendance({
                classId,
                date: payload.date,
                attendance: attendanceData,
            });

            return {
                offline: true,
                message: 'Attendance saved offline - will sync when online',
                count: attendanceData.length,
            };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // QUICK ACTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate attendance data with all students marked as a specific status
     * Useful for "Mark All Present" or "Mark All Absent" quick actions
     * 
     * @param {Array} students - Array of student objects
     * @param {string} status - Status to apply
     * @returns {Array} Formatted attendance data
     */
    generateBulkAttendanceData(students, status = 'PRESENT') {
        if (!students || !students.length) return [];

        return students.map(student => ({
            student_id: student.id || student.student_id,
            status: status,
            remarks: status === 'ABSENT' ? 'Marked absent' : '',
        }));
    },

    /**
     * Toggle all students to a specific status
     * @param {Array} currentData - Current attendance data
     * @param {string} status - New status
     * @returns {Array} Updated attendance data
     */
    setAllStatus(currentData, status) {
        if (!currentData || !currentData.length) return [];
        return currentData.map(entry => ({
            ...entry,
            status: status,
            remarks: status === 'PRESENT' ? '' : entry.remarks,
        }));
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTENDANCE QUERIES
    // Backend: AttendanceViewSet (list, filter, search)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get attendance records with optional filters
     * Backend: GET /api/academics/attendance/
     * 
     * @param {Object} filters - Query filters
     * @param {number} filters.class_id - Filter by class
     * @param {number} filters.student_id - Filter by student
     * @param {number} filters.term_id - Filter by term
     * @param {string} filters.date_from - Start date (YYYY-MM-DD)
     * @param {string} filters.date_to - End date (YYYY-MM-DD)
     * @param {string} filters.status - Filter by status
     */
    async getAttendanceRecords(filters = {}) {
        try {
            const params = {};

            if (filters.class_id) params.class_obj = filters.class_id;
            if (filters.student_id) params.student = filters.student_id;
            if (filters.term_id) params.term = filters.term_id;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            if (filters.status) params.status = filters.status;

            const response = await academicsApi.getAttendance(params);
            return response.data;
        } catch (error) {
            console.error('Failed to get attendance records:', error);
            throw error;
        }
    },

    /**
     * Get class attendance summary
     * Backend: GET /api/academics/attendance/class_attendance_summary/
     * 
     * @param {number} classId - Class ID
     * @param {number} termId - Term ID
     */
    async getClassAttendanceSummary(classId, termId) {
        try {
            const response = await academicsApi.getClassAttendanceSummary(classId, termId);

            // Cache for offline access
            await offlineStorage.cacheApiResponse(
                `/api/academics/attendance/class_attendance_summary/?class_id=${classId}&term_id=${termId}`,
                response.data,
                15
            );

            return response.data;
        } catch (error) {
            console.error('Failed to get class attendance summary:', error);

            // Try cached data
            const cached = await offlineStorage.getCachedResponse(
                `/api/academics/attendance/class_attendance_summary/?class_id=${classId}&term_id=${termId}`
            );
            if (cached) return cached;

            throw error;
        }
    },

    /**
     * Get individual student attendance history
     * Backend: GET /api/academics/attendance/?student=studentId
     * 
     * @param {number} studentId - Student ID
     * @param {Object} filters - Additional filters
     */
    async getStudentAttendance(studentId, filters = {}) {
        try {
            const params = { student: studentId, ...filters };
            const response = await academicsApi.getAttendance(params);
            return response.data;
        } catch (error) {
            console.error('Failed to get student attendance:', error);
            throw error;
        }
    },

    /**
     * Get weekly attendance summary
     * Backend: GET /api/academics/attendance/class_attendance_summary/
     * 
     * @param {string} weekStart - Week start date (YYYY-MM-DD)
     */
    async getWeeklySummary(weekStart = null) {
        try {
            return await classesApi.getWeeklySummary(weekStart);
        } catch (error) {
            console.error('Failed to get weekly summary:', error);
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTENDANCE ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate attendance rate
     * @param {number} present - Number of present days
     * @param {number} total - Total days
     * @returns {number} Attendance rate percentage
     */
    calculateAttendanceRate(present, total) {
        if (!total || total === 0) return 0;
        return Math.round((present / total) * 100);
    },

    /**
     * Get attendance trend data for charts
     * @param {Array} records - Attendance records
     * @returns {Object} Trend data for visualization
     */
    getAttendanceTrend(records) {
        if (!records || !records.length) return { labels: [], present: [], absent: [], late: [] };

        // Group by date
        const grouped = {};
        records.forEach(record => {
            const date = record.date || formatISODate(record.created_at);
            if (!grouped[date]) {
                grouped[date] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            }
            grouped[date][record.status?.toLowerCase() || 'present']++;
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

    /**
     * Get at-risk students (attendance below threshold)
     * @param {Array} summaryData - Attendance summary data
     * @param {number} threshold - Minimum attendance rate (default: 75%)
     * @returns {Array} Students below threshold
     */
    getAtRiskStudents(summaryData, threshold = 75) {
        if (!summaryData || !summaryData.length) return [];

        return summaryData
            .filter(student => student.attendance_rate < threshold)
            .sort((a, b) => a.attendance_rate - b.attendance_rate);
    },

    // ═══════════════════════════════════════════════════════════════
    // GPS & LOCATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get current GPS position with timeout
     * @param {Object} options - Geolocation options
     * @param {number} options.timeout - Timeout in ms (default: 10000)
     * @param {number} options.maximumAge - Max age in ms (default: 60000)
     * @returns {Promise<Object>} Position object
     */
    getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser'));
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

                    // Validate accuracy
                    if (!GeoService.isAccuracyAcceptable(result.accuracy)) {
                        console.warn(
                            `GPS accuracy is ${GeoService.getAccuracyDescription(result.accuracy)} (${Math.round(result.accuracy)}m)`
                        );
                    }

                    resolve(result);
                },
                (error) => {
                    reject(new Error(this.getGeolocationErrorMessage(error)));
                },
                {
                    enableHighAccuracy: true,
                    timeout: options.timeout || 10000,
                    maximumAge: options.maximumAge || 60000,
                }
            );
        });
    },

    /**
     * Get human-readable geolocation error message
     * @param {GeolocationPositionError} error - Geolocation error
     * @returns {string} Error message
     */
    getGeolocationErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Location permission denied. Please enable GPS in your device settings.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information is currently unavailable. Check your signal and try again.';
            case error.TIMEOUT:
                return 'Location request timed out. Please ensure GPS is enabled and try again.';
            default:
                return `An unknown location error occurred (Code: ${error.code}).`;
        }
    },

    /**
     * Verify user is within acceptable range of class venue
     * @param {Object} userLocation - User's GPS coordinates
     * @param {Object} venueLocation - Venue's GPS coordinates
     * @param {number} maxDistance - Max allowed distance in meters
     * @returns {Object} Verification result
     */
    verifyLocationProximity(userLocation, venueLocation, maxDistance = 100) {
        if (!userLocation || !venueLocation) {
            return { verified: false, reason: 'Missing location data' };
        }

        const distance = GeoService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            venueLocation.latitude,
            venueLocation.longitude
        );

        return {
            verified: distance <= maxDistance,
            distance: distance,
            maxDistance: maxDistance,
            walkingTime: GeoService.estimateWalkTime(distance),
            reason: distance > maxDistance
                ? `You are ${Math.round(distance)}m away (max: ${maxDistance}m)`
                : `Within range (${Math.round(distance)}m)`,
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // OFFLINE SUPPORT (IndexedDB)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Queue attendance for offline sync via IndexedDB
     * @param {string} entryId - Timetable entry UUID
     * @param {string} status - Attendance status
     */
    async queueOfflineAttendance(entryId, status = 'PRESENT') {
        try {
            await offlineStorage.saveAttendance({
                entryId,
                status,
                timestamp: new Date().toISOString(),
                synced: false,
            });

            // Also add to sync queue
            await offlineStorage.addToSyncQueue({
                type: 'ATTENDANCE_SINGLE',
                endpoint: '/api/academics/attendance/',
                method: 'POST',
                data: {
                    timetable_entry_id: entryId,
                    status: status,
                    attempted_at: new Date().toISOString(),
                },
            });

            console.log(`📡 Attendance queued for offline sync: ${entryId}`);
        } catch (error) {
            console.error('Failed to queue offline attendance:', error);
            // Fallback to localStorage
            this._fallbackQueueOffline(entryId, status);
        }
    },

    /**
     * Fallback offline queue using localStorage
     * @private
     */
    _fallbackQueueOffline(entryId, status) {
        try {
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            queue.push({
                entryId,
                status,
                timestamp: new Date().toISOString(),
                synced: false,
            });
            localStorage.setItem('attendance_queue', JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to save to localStorage fallback:', error);
        }
    },

    /**
     * Sync all offline attendance records
     * @returns {Object} Sync results
     */
    async syncOfflineAttendance() {
        let synced = 0;
        let failed = 0;

        // Sync from IndexedDB
        try {
            const dbResult = await offlineStorage.processSyncQueue();
            synced += dbResult.synced || 0;
            failed += dbResult.failed || 0;
        } catch (error) {
            console.error('Failed to sync from IndexedDB:', error);
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
                } catch (error) {
                    item.lastError = error.message;
                    failed++;
                }
            }

            localStorage.setItem('attendance_queue', JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to sync from localStorage:', error);
        }

        return { synced, failed, total: synced + failed };
    },

    /**
     * Get pending sync count
     * @returns {number} Number of pending syncs
     */
    async getPendingSyncCount() {
        try {
            const dbCount = await offlineStorage.getPendingSyncCount();
            const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
            const localCount = queue.filter(item => !item.synced).length;
            return dbCount + localCount;
        } catch (error) {
            return 0;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECK-IN OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get attendance check-in history
     * Backend: GET /geo/check-in/history/
     */
    async getCheckInHistory(limit = 20) {
        try {
            return await classesApi.getCheckInHistory(limit);
        } catch (error) {
            console.error('Failed to get check-in history:', error);
            throw error;
        }
    },

    /**
     * Get today's check-in summary
     * Backend: GET /geo/check-in/summary/
     */
    async getCheckInSummary() {
        try {
            return await classesApi.getCheckInSummary();
        } catch (error) {
            console.error('Failed to get check-in summary:', error);
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Validate attendance data before submission
     * @param {Array} attendanceData - Attendance entries
     * @returns {Object} Validation result
     */
    validateAttendanceData(attendanceData) {
        const errors = [];
        const validStatuses = this.STATUS_OPTIONS.map(s => s.value);

        if (!attendanceData || !attendanceData.length) {
            errors.push('No attendance data provided');
        }

        attendanceData?.forEach((entry, index) => {
            if (!entry.student_id) {
                errors.push(`Entry ${index + 1}: Missing student_id`);
            }
            if (!validStatuses.includes(entry.status)) {
                errors.push(
                    `Entry ${index + 1}: Invalid status "${entry.status}". Valid: ${validStatuses.join(', ')}`
                );
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            totalEntries: attendanceData?.length || 0,
        };
    },

    /**
     * Check if attendance window is open
     * @param {string} startTime - Class start time (HH:MM)
     * @param {string} endTime - Class end time (HH:MM)
     * @returns {Object} Window status
     */
    checkAttendanceWindow(startTime, endTime) {
        const isOpen = isWithinAttendanceWindow(startTime, endTime);
        const remainingMinutes = getRemainingTime(endTime);

        return {
            isOpen,
            remainingMinutes,
            message: isOpen
                ? `Attendance window open for ${remainingMinutes} more minutes`
                : 'Attendance window is closed',
        };
    },
};

export default attendanceService;