// frontend/src/hooks/useAttendance.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';
import GeoService from '../api/geoService';
import { useGeolocation } from './useGeolocation';
import toast from 'react-hot-toast';

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
    const [requiresManualReview, setRequiresManualReview] = useState(false);   // NEW

    const isMountedRef = useRef(true);
    const syncInProgressRef = useRef(false);

    const {
        location,
        error: gpsError,
        getLocation,
        isAccuracyAcceptable,
        isDataValid,
        isReadyForCheckIn,
    } = useGeolocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });

    // ── Check if already marked today (via GeoService check-in history) ──
    const checkMarkedStatus = useCallback(async () => {
        if (!entryId) return;
        try {
            if (navigator.onLine) {
                const history = await GeoService.getCheckInHistory(20);
                const today = new Date().toISOString().slice(0, 10);
                const alreadyMarked = history.some(
                    (record) =>
                        record.timetable_entry_id === entryId &&
                        record.created_at?.startsWith(today)
                );
                if (isMountedRef.current) setIsMarked(alreadyMarked);
            }
        } catch (err) {
            console.error('Failed to check attendance status:', err);
        }
    }, [entryId]);

    // ── Mark attendance (now via GeoService) ──
    const markAttendance = useCallback(async (remarks = '') => {
        if (!entryId) return;
        if (isMountedRef.current) {
            setLoading(true);
            setError(null);
            setRequiresManualReview(false);
        }

        // Fail fast if GPS is required but offline
        if (requireGps && !navigator.onLine) {
            const msg = 'GPS attendance requires an internet connection.';
            if (isMountedRef.current) {
                setError(msg);
                setLoading(false);
            }
            if (onError) onError(new Error(msg));
            return;
        }

        try {
            let lat, lon, acc;
            // Get fresh location
            try {
                const pos = await getLocation();
                const freshLocation = pos || location;
                if (freshLocation) {
                    lat = freshLocation.latitude;
                    lon = freshLocation.longitude;
                    acc = freshLocation.accuracy;
                }
            } catch (gpsErr) {
                if (requireGps) {
                    throw new Error(`GPS required: ${gpsErr.message}`);
                }
                console.warn('GPS unavailable:', gpsErr.message);
            }

            if (navigator.onLine) {
                const response = await GeoService.submitCheckIn({
                    timetable_entry_id: entryId,
                    latitude: lat,
                    longitude: lon,
                    accuracy: acc,
                    device_info: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                    },
                });

                if (isMountedRef.current) {
                    setIsMarked(true);
                    setIsOffline(false);
                    setRequiresManualReview(response.requires_manual_review || false);
                }
                if (onSuccess) onSuccess({ entryId, remarks, requiresManualReview: response.requires_manual_review });
            } else {
                // Offline – only if GPS not required (we already blocked requireGps earlier)
                await saveOffline({
                    timetable_entry_id: entryId,
                    attempted_at: new Date().toISOString(),
                    latitude: lat,
                    longitude: lon,
                    accuracy: acc,
                });
            }
        } catch (err) {
            console.error('Failed to mark attendance online, saving offline:', err);
            if (navigator.onLine) {
                // Online error – show detail
                const detail = err.response?.data?.detail || err.message || 'Failed to verify location';
                if (isMountedRef.current) setError(detail);
                if (onError) onError(err);
            } else {
                await saveOffline({
                    timetable_entry_id: entryId,
                    attempted_at: new Date().toISOString(),
                });
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [entryId, location, requireGps, getLocation, onSuccess, onError]);

    // ── Offline storage (unchanged) ──
    const saveOffline = async (data) => {
        try {
            const db = await getDB();
            const record = { ...data, synced: false, createdAt: new Date().toISOString() };
            const savedId = await db.add(STORE_NAME, record);
            await db.add(SYNC_STORE, {
                type: 'ATTENDANCE_SINGLE',
                endpoint: '/geo/check-in/',   // offline sync will use the same endpoint
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
                    await GeoService.submitCheckIn(item.data);
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
                const history = await GeoService.getCheckInHistory(50);
                if (isMountedRef.current) setAttendanceHistory(history);
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
        requiresManualReview,       // NEW
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
        isDataValid,           // expose accuracy gate
        isReadyForCheckIn,     // expose readiness for UI
    };
}

export default useAttendance;