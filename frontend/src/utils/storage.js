import { openDB } from 'idb';

const DB_NAME = 'AcademeOfflineDB';
const DB_VERSION = 1;

export async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Attendance store
            if (!db.objectStoreNames.contains('offlineAttendance')) {
                db.createObjectStore('offlineAttendance', {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }

            // Cache store for API responses
            if (!db.objectStoreNames.contains('apiCache')) {
                db.createObjectStore('apiCache', {
                    keyPath: 'url',
                });
            }

            // Settings store
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', {
                    keyPath: 'key',
                });
            }
        },
    });
}

export const offlineStorage = {
    async saveAttendance(data) {
        const db = await getDB();
        return db.add('offlineAttendance', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    },

    async getOfflineAttendance() {
        const db = await getDB();
        return db.getAll('offlineAttendance');
    },

    async clearOfflineAttendance(id) {
        const db = await getDB();
        return db.delete('offlineAttendance', id);
    },

    async cacheApiResponse(url, data) {
        const db = await getDB();
        return db.put('apiCache', {
            url,
            data,
            timestamp: new Date().toISOString(),
        });
    },

    async getCachedResponse(url) {
        const db = await getDB();
        return db.get('apiCache', url);
    },

    async setSetting(key, value) {
        const db = await getDB();
        return db.put('settings', { key, value });
    },

    async getSetting(key) {
        const db = await getDB();
        const setting = await db.get('settings', key);
        return setting?.value;
    },
};