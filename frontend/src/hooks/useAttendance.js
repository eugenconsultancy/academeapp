import { useState, useCallback, useEffect } from 'react';
import { openDB } from 'idb';
import apiClient from '../api/client';

const DB_NAME = 'AcademeOfflineDB';
const STORE_NAME = 'offlineAttendance';

async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }
        },
    });
}

export function useAttendance(entryId) {
    const [isMarked, setIsMarked] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [syncPending, setSyncPending] = useState(false);

    // Check if already marked
    useEffect(() => {
        checkMarkedStatus();
    }, [entryId]);

    const checkMarkedStatus = async () => {
        try {
            if (navigator.onLine) {
                const response = await apiClient.get('/classes/today/');
                const classData = response.data.find(c => c.id === entryId);
                setIsMarked(classData?.is_marked || false);
            }
        } catch (error) {
            console.error('Failed to check attendance status:', error);
        }
    };

    const markAttendance = useCallback(async () => {
        const attemptData = {
            timetable_entry_id: entryId,
            attempted_at: new Date().toISOString(),
        };

        if (!navigator.onLine) {
            // Store offline
            const db = await getDB();
            await db.add(STORE_NAME, attemptData);
            setIsMarked(true);
            setIsOffline(true);
            setSyncPending(true);
        } else {
            // Send online
            try {
                await apiClient.post('/classes/mark-attendance/', attemptData);
                setIsMarked(true);
            } catch (error) {
                console.error('Failed to mark attendance:', error);
                throw error;
            }
        }
    }, [entryId]);

    // Sync offline data when online
    useEffect(() => {
        const handleOnline = async () => {
            const db = await getDB();
            const offlineData = await db.getAll(STORE_NAME);

            for (const record of offlineData) {
                try {
                    await apiClient.post('/classes/mark-attendance/', record);
                    await db.delete(STORE_NAME, record.id);
                } catch (error) {
                    console.error('Failed to sync attendance:', error);
                }
            }

            setSyncPending(false);
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return { isMarked, isOffline, syncPending, markAttendance };
}