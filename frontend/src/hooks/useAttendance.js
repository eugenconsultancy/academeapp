import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';
import apiClient from '../api/client';
import { useGeolocation } from './useGeolocation';

const DB_NAME = 'AcademeOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'offlineAttendance';
const SYNC_STORE = 'syncQueue';

/**
 * Initialize IndexedDB with attendance and sync stores
 */
async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Attendance store
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }

            // Sync queue store (v2)
            if (!db.objectStoreNames.contains(SYNC_STORE)) {
                const syncStore = db.createObjectStore(SYNC_STORE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                syncStore.createIndex('status', 'status');
                syncStore.createIndex('type', 'type');
            }
        },
    });
}

/**
 * Attendance status constants matching backend
 * Backend: apps/academics/models.py - Attendance.STATUS_CHOICES
 */
const ATTENDANCE_STATUS = {
    PRESENT: 'PRESENT',
    ABSENT: 'ABSENT',
    LATE: 'LATE',
    EXCUSED: 'EXCUSED',
};

/**
 * Hook for managing attendance marking with GPS verification,
 * offline support, and automatic sync.
 * 
 * Backend: apps/academics/views.py - AttendanceViewSet
 * Backend: apps/academics/models.py - Attendance
 * 
 * @param {string} entryId - Timetable entry UUID
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireGps - Whether GPS is required
 * @param {number} options.maxDistance - Max distance for GPS verification (meters)
 * @param {Function} options.onSuccess - Callback on successful marking
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onSyncComplete - Callback when sync completes
 * @returns {Object} Attendance hook API
 */
export function useAttendance(entryId, options = {}) {
    const {
        requireGps = false,
        maxDistance = 100,
        onSuccess = null,
        onError = null,
        onSyncComplete = null,
    } = options;

    // ── State ──────────────────────────────────────────────────
    const [isMarked, setIsMarked] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [syncPending, setSyncPending] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(ATTENDANCE_STATUS.PRESENT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [syncProgress, setSyncProgress] = useState({ total: 0, completed: 0 });
    const [attendanceHistory, setAttendanceHistory] = useState([]);

    // ── Refs ───────────────────────────────────────────────────
    const isMountedRef = useRef(true);
    const syncInProgressRef = useRef(false);

    // ── Geolocation ────────────────────────────────────────────
    const {
        location,
        error: gpsError,
        getLocation,
        isAccuracyAcceptable,
        checkVenueProximity,
    } = useGeolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
    });

    // ═══════════════════════════════════════════════════════════
    // STATUS CHECK
    // ═══════════════════════════════════════════════════════════

    /**
     * Check if attendance is already marked for this entry
     */
    const checkMarkedStatus = useCallback(async () => {
        if (!entryId) return;

        try {
            if (navigator.onLine) {
                const response = await apiClient.get('/classes/today/');
                const classData = Array.isArray(response.data)
                    ? response.data.find(c => c.id === entryId)
                    : response.data;

                const marked = classData?.is_marked || classData?.attendance_status || false;
                if (isMountedRef.current) setIsMarked(marked);

                if (marked && classData?.attendance_status && isMountedRef.current) {
                    setSelectedStatus(classData.attendance_status);
                }
            }
        } catch (err) {
            console.error('Failed to check attendance status:', err);
            // Don't set error - this is non-critical
        }
    }, [entryId]);

    // ═══════════════════════════════════════════════════════════
    // ATTENDANCE MARKING
    // ═══════════════════════════════════════════════════════════

    /**
     * Mark attendance with GPS verification
     * @param {string} status - Attendance status (PRESENT/ABSENT/LATE/EXCUSED)
     * @param {string} remarks - Optional remarks
     */
    const markAttendance = useCallback(
        async (status = ATTENDANCE_STATUS.PRESENT, remarks = '') => {
            if (!entryId) return;

            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }

            const attemptData = {
                timetable_entry_id: entryId,
                attempted_at: new Date().toISOString(),
                status: status,
                remarks: remarks,
            };

            try {
                // Try to get GPS location
                if (requireGps || navigator.onLine) {
                    try {
                        // Fix 1: Capture the fresh location directly from the promise
                        const freshLocation = await getLocation();
                        const targetLocation = freshLocation || location;

                        if (targetLocation) {
                            if (!isAccuracyAcceptable()) {
                                console.warn('GPS accuracy is poor but continuing...');
                            }

                            attemptData.latitude = targetLocation.latitude;
                            attemptData.longitude = targetLocation.longitude;
                            attemptData.accuracy = targetLocation.accuracy;
                            attemptData.device_info = {
                                userAgent: navigator.userAgent,
                                platform: navigator.platform,
                                timestamp: new Date().toISOString(),
                            };
                        }
                    } catch (gpsErr) {
                        if (requireGps) {
                            throw new Error(`GPS required: ${gpsErr.message}`);
                        }
                        console.warn('GPS unavailable, marking without location:', gpsErr.message);
                    }
                }

                // Submit online or save offline
                if (navigator.onLine) {
                    await apiClient.post('/classes/mark-attendance/', attemptData);
                    if (isMountedRef.current) {
                        setIsMarked(true);
                        setSelectedStatus(status);
                        setIsOffline(false);
                    }
                    if (onSuccess) onSuccess({ entryId, status, remarks });
                } else {
                    await saveOffline(attemptData);
                }
            } catch (err) {
                console.error('Failed to mark attendance online, saving offline:', err);

                // Save offline as fallback
                await saveOffline(attemptData);

                if (onError) onError(err);
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        },
        [entryId, location, requireGps, getLocation, isAccuracyAcceptable, onSuccess, onError]
    );

    /**
     * Mark bulk attendance for multiple students
     * Backend: POST /api/academics/attendance/mark_bulk_attendance/
     */
    const markBulkAttendance = useCallback(
        async (classId, attendanceData, date = null) => {
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }

            const payload = {
                class_id: classId,
                date: date || new Date().toISOString().split('T')[0],
                attendance: attendanceData,
            };

            try {
                if (navigator.onLine) {
                    await apiClient.post('/api/academics/attendance/mark_bulk_attendance/', payload);
                } else {
                    await saveOffline({
                        type: 'ATTENDANCE_BULK',
                        ...payload,
                        timestamp: new Date().toISOString(),
                    });
                }

                if (isMountedRef.current) {
                    setIsMarked(true);
                    setIsOffline(!navigator.onLine);
                }
                if (onSuccess) onSuccess(payload);
            } catch (err) {
                if (isMountedRef.current) setError(err.message);
                await saveOffline({
                    type: 'ATTENDANCE_BULK',
                    ...payload,
                    timestamp: new Date().toISOString(),
                });
                if (onError) onError(err);
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    /**
     * Save attendance record offline
     * Fix 4: Resolve IndexedDB auto-increment key collision
     */
    const saveOffline = async (data) => {
        try {
            const db = await getDB();
            const record = {
                ...data,
                synced: false,
                createdAt: new Date().toISOString(),
            };

            // Add to attendance store and capture the auto-generated ID
            const savedId = await db.add(STORE_NAME, record);

            // Add to sync queue with explicit ID reference
            await db.add(SYNC_STORE, {
                type: data.type || 'ATTENDANCE_SINGLE',
                endpoint: data.type === 'ATTENDANCE_BULK'
                    ? '/api/academics/attendance/mark_bulk_attendance/'
                    : '/classes/mark-attendance/',
                method: 'POST',
                data: { ...record, id: savedId }, // Include the generated ID
                status: 'pending',
                attempts: 0,
                createdAt: new Date().toISOString(),
            });

            if (isMountedRef.current) {
                setIsMarked(true);
                setIsOffline(true);
                setSyncPending(true);
            }
        } catch (err) {
            console.error('Failed to save offline attendance:', err);
            if (isMountedRef.current) setError('Failed to save offline');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // SYNC OPERATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Sync offline attendance records
     */
    const syncOfflineData = useCallback(async () => {
        if (syncInProgressRef.current) return;
        syncInProgressRef.current = true;

        try {
            const db = await getDB();
            const pendingItems = await db.getAllFromIndex(SYNC_STORE, 'status', 'pending');
            const total = pendingItems.length;
            let completed = 0;

            if (isMountedRef.current) setSyncProgress({ total, completed });

            for (const item of pendingItems) {
                try {
                    await apiClient.post(item.endpoint, item.data);
                    await db.delete(SYNC_STORE, item.id);

                    // Update attendance store record if exists
                    const attendanceRecord = await db.get(STORE_NAME, item.data.id);
                    if (attendanceRecord) {
                        attendanceRecord.synced = true;
                        await db.put(STORE_NAME, attendanceRecord);
                    }

                    completed++;
                    if (isMountedRef.current) setSyncProgress({ total, completed });
                } catch (err) {
                    console.error(`Failed to sync item ${item.id}:`, err);

                    // Fix 3: Detect validation errors (4xx) and mark as failed immediately
                    const isValidationError = err.response?.status >= 400 && err.response?.status < 500;
                    item.attempts = (item.attempts || 0) + 1;
                    if (item.attempts >= 3 || isValidationError) {
                        item.status = 'failed';
                    }
                    await db.put(SYNC_STORE, item);
                }
            }

            // Check remaining
            const remaining = await db.count(SYNC_STORE);
            if (isMountedRef.current) setSyncPending(remaining > 0);

            if (onSyncComplete) onSyncComplete({ total, completed, remaining });
        } catch (err) {
            console.error('Sync failed:', err);
            if (isMountedRef.current) setError('Sync failed');
        } finally {
            syncInProgressRef.current = false;
            if (isMountedRef.current) setSyncProgress({ total: 0, completed: 0 });
        }
    }, [onSyncComplete]);

    /**
     * Get pending sync count
     */
    const getPendingSyncCount = useCallback(async () => {
        try {
            const db = await getDB();
            return db.countFromIndex(SYNC_STORE, 'status', 'pending');
        } catch {
            return 0;
        }
    }, []);

    // ═══════════════════════════════════════════════════════════
    // HISTORY
    // ═══════════════════════════════════════════════════════════

    /**
     * Load attendance history for this entry
     */
    const loadHistory = useCallback(async () => {
        if (!entryId) return;

        try {
            if (navigator.onLine) {
                const response = await apiClient.get(
                    `/api/academics/attendance/?timetable_entry=${entryId}`
                );
                if (isMountedRef.current) {
                    setAttendanceHistory(response.data?.results || response.data || []);
                }
            }
        } catch (err) {
            console.error('Failed to load attendance history:', err);
        }
    }, [entryId]);

    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION & CLEANUP
    // ═══════════════════════════════════════════════════════════

    useEffect(() => {
        isMountedRef.current = true;
        checkMarkedStatus();

        return () => {
            isMountedRef.current = false;
        };
    }, [entryId, checkMarkedStatus]);

    // Auto-sync when coming online
    useEffect(() => {
        const handleOnline = () => {
            syncOfflineData();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncOfflineData]);

    // ═══════════════════════════════════════════════════════════
    // RETURN API
    // ═══════════════════════════════════════════════════════════

    return {
        // State
        isMarked,
        isOffline,
        syncPending,
        selectedStatus,
        loading,
        error,
        syncProgress,
        attendanceHistory,

        // Status options (from backend)
        STATUS_OPTIONS: [
            { value: ATTENDANCE_STATUS.PRESENT, label: 'Present', color: 'emerald' },
            { value: ATTENDANCE_STATUS.ABSENT, label: 'Absent', color: 'red' },
            { value: ATTENDANCE_STATUS.LATE, label: 'Late', color: 'amber' },
            { value: ATTENDANCE_STATUS.EXCUSED, label: 'Excused', color: 'slate' },
        ],

        // Actions
        markAttendance,
        markBulkAttendance,
        setSelectedStatus,
        syncOfflineData,
        getPendingSyncCount,
        loadHistory,
        checkMarkedStatus,

        // GPS
        location,
        gpsError,
        getLocation,
        isAccuracyAcceptable,
        checkVenueProximity,
    };
}

export { ATTENDANCE_STATUS };
export default useAttendance;