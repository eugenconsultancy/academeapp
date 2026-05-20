import { classesApi } from '../api/classesApi';
import GeoService from '../api/geoService';

/**
 * Attendance Service - Handles attendance marking with location verification.
 * Supports online, offline (queued), and GPS-verified modes.
 */
export const attendanceService = {
    /**
     * Mark attendance for a class.
     * Attempts GPS verification first, falls back to basic marking.
     */
    async markAttendance(entryId) {
        try {
            // Try to get GPS location
            const position = await this.getCurrentPosition();

            // Submit with location verification
            return await classesApi.submitCheckIn({
                timetable_entry_id: entryId,
                latitude: position.latitude,
                longitude: position.longitude,
                accuracy: position.accuracy,
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                },
            });
        } catch (gpsError) {
            // GPS not available - fall back to basic attendance
            console.warn('GPS unavailable, marking without location:', gpsError.message);
            return await classesApi.markAttendance(entryId, new Date().toISOString());
        }
    },

    /**
     * Get current GPS position with timeout.
     */
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
                        timestamp: position.timestamp,
                    });
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
     * Get human-readable geolocation error message.
     */
    getGeolocationErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Location permission denied. Please enable GPS in settings.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information unavailable. Check your signal.';
            case error.TIMEOUT:
                return 'Location request timed out. Please try again.';
            default:
                return 'Unknown location error.';
        }
    },

    /**
     * Get attendance check-in history.
     */
    async getCheckInHistory(limit = 20) {
        return classesApi.getCheckInHistory(limit);
    },

    /**
     * Get today's check-in summary.
     */
    async getCheckInSummary() {
        return classesApi.getCheckInSummary();
    },

    /**
     * Queue attendance for offline sync.
     */
    queueOfflineAttendance(entryId) {
        const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
        queue.push({
            entryId,
            timestamp: new Date().toISOString(),
            synced: false,
        });
        localStorage.setItem('attendance_queue', JSON.stringify(queue));
    },

    /**
     * Sync queued offline attendance records.
     */
    async syncOfflineAttendance() {
        const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
        const unsynced = queue.filter(item => !item.synced);

        const results = [];
        for (const item of unsynced) {
            try {
                await classesApi.markAttendance(item.entryId, item.timestamp);
                item.synced = true;
                results.push({ entryId: item.entryId, success: true });
            } catch (error) {
                results.push({ entryId: item.entryId, success: false, error: error.message });
            }
        }

        localStorage.setItem('attendance_queue', JSON.stringify(queue));
        return results;
    },
};

export default attendanceService;