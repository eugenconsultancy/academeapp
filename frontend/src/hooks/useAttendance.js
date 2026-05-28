import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';
import apiClient from '../api/client';
import { useGeolocation } from './useGeolocation';

const DB_NAME = 'AcademeOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'offlineAttendance';
const SYNC_STORE = 'syncQueue';

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(SYNC_STORE)) {
                const syncStore = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('status', 'status');
                syncStore.createIndex('type', 'type');
            }
        },
    });
}

export function useAttendance(entryId, options = {}) {
    const {
        requireGps = false,
        maxDistance = 100,
        onSuccess = null,
        onError = null,
        onSyncComplete = null,
    } = options;

    const [isMarked, setIsMarked] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [syncPending, setSyncPending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [syncProgress, setSyncProgress] = useState({ total: 0, completed: 0 });
    const [attendanceHistory, setAttendanceHistory] = useState([]);

    const isMountedRef = useRef(true);
    const syncInProgressRef = useRef(false);

    const {
        location,
        error: gpsError,
        getLocation,
        isAccuracyAcceptable,
        checkVenueProximity,
    } = useGeolocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });

    const checkMarkedStatus = useCallback(async () => {
        if (!entryId) return;
        try {
            if (navigator.onLine) {
                const response = await apiClient.get('/classes/today/');
                const classData = Array.isArray(response.data)
                    ? response.data.find(c => c.id === entryId)
                    : response.data;
                const marked = classData?.is_marked || false;
                if (isMountedRef.current) setIsMarked(marked);
            }
        } catch (err) {
            console.error('Failed to check attendance status:', err);
        }
    }, [entryId]);

    const markAttendance = useCallback(async (remarks = '') => {
        if (!entryId) return;
        if (isMountedRef.current) {
            setLoading(true);
            setError(null);
        }
        const attemptData = {
            timetable_entry_id: entryId,
            attempted_at: new Date().toISOString(),
            // No status field – backend only records presence
        };
        try {
            if (requireGps || navigator.onLine) {
                try {
                    const freshLocation = await getLocation();
                    const target = freshLocation || location;
                    if (target) {
                        attemptData.latitude = target.latitude;
                        attemptData.longitude = target.longitude;
                        attemptData.accuracy = target.accuracy;
                    }
                } catch (gpsErr) {
                    if (requireGps) throw new Error(`GPS required: ${gpsErr.message}`);
                    console.warn('GPS unavailable:', gpsErr.message);
                }
            }
            if (navigator.onLine) {
                await apiClient.post('/classes/mark-attendance/', attemptData);
                if (isMountedRef.current) {
                    setIsMarked(true);
                    setIsOffline(false);
                }
                if (onSuccess) onSuccess({ entryId, remarks });
            } else {
                await saveOffline(attemptData);
            }
        } catch (err) {
            console.error('Failed to mark attendance online, saving offline:', err);
            await saveOffline(attemptData);
            if (onError) onError(err);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [entryId, location, requireGps, getLocation, isAccuracyAcceptable, onSuccess, onError]);

    const saveOffline = async (data) => {
        try {
            const db = await getDB();
            const record = { ...data, synced: false, createdAt: new Date().toISOString() };
            const savedId = await db.add(STORE_NAME, record);
            await db.add(SYNC_STORE, {
                type: 'ATTENDANCE_SINGLE',
                endpoint: '/classes/mark-attendance/',
                method: 'POST',
                data: { ...record, id: savedId },
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
            console.error('Failed to save offline:', err);
            if (isMountedRef.current) setError('Failed to save offline');
        }
    };

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
                    const attRecord = await db.get(STORE_NAME, item.data.id);
                    if (attRecord) {
                        attRecord.synced = true;
                        await db.put(STORE_NAME, attRecord);
                    }
                    completed++;
                    if (isMountedRef.current) setSyncProgress({ total, completed });
                } catch (err) {
                    console.error(`Sync failed for item ${item.id}:`, err);
                    const isValidationError = err.response?.status >= 400 && err.response?.status < 500;
                    item.attempts = (item.attempts || 0) + 1;
                    if (item.attempts >= 3 || isValidationError) item.status = 'failed';
                    await db.put(SYNC_STORE, item);
                }
            }
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

    const getPendingSyncCount = useCallback(async () => {
        try {
            const db = await getDB();
            return db.countFromIndex(SYNC_STORE, 'status', 'pending');
        } catch { return 0; }
    }, []);

    const loadHistory = useCallback(async () => {
        if (!entryId) return;
        try {
            if (navigator.onLine) {
                const response = await apiClient.get(`/classes/attendance/${entryId}/`);
                if (isMountedRef.current) setAttendanceHistory(response.data || []);
            }
        } catch (err) {
            console.error('Failed to load attendance history:', err);
        }
    }, [entryId]);

    useEffect(() => {
        isMountedRef.current = true;
        checkMarkedStatus();
        return () => { isMountedRef.current = false; };
    }, [entryId, checkMarkedStatus]);

    useEffect(() => {
        const handleOnline = () => syncOfflineData();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncOfflineData]);

    return {
        isMarked,
        isOffline,
        syncPending,
        loading,
        error,
        syncProgress,
        attendanceHistory,
        STATUS_OPTIONS: [
            { value: 'PRESENT', label: 'Present', color: 'emerald' },
            { value: 'ABSENT', label: 'Absent', color: 'red' },
            { value: 'LATE', label: 'Late', color: 'amber' },
            { value: 'EXCUSED', label: 'Excused', color: 'slate' },
        ],
        markAttendance,
        syncOfflineData,
        getPendingSyncCount,
        loadHistory,
        checkMarkedStatus,
        location,
        gpsError,
        getLocation,
        isAccuracyAcceptable,
        checkVenueProximity,
    };
}

export default useAttendance;