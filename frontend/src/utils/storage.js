import { openDB } from 'idb';

const DB_NAME = 'AcademeOfflineDB';
const DB_VERSION = 3;

let _syncLock = false;
let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        _isOnline = true;
        console.log('🌐 Back online - starting sync...');
        setTimeout(() => {
            offlineStorage.processSyncQueue();
        }, 100);
    });

    window.addEventListener('offline', () => {
        _isOnline = false;
        console.log('📡 Offline - data will be queued');
    });
}

export function getNetworkStatus() {
    return _isOnline;
}

export async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            if (!db.objectStoreNames.contains('offlineAttendance')) {
                db.createObjectStore('offlineAttendance', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('offlineMarks')) {
                db.createObjectStore('offlineMarks', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('status', 'status');
                syncStore.createIndex('type', 'type');
                syncStore.createIndex('createdAt', 'createdAt');
            }
            if (!db.objectStoreNames.contains('apiCache')) {
                const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
                cacheStore.createIndex('timestamp', 'timestamp');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('formDrafts')) {
                db.createObjectStore('formDrafts', { keyPath: 'formId' });
            }
            if (!db.objectStoreNames.contains('preferences')) {
                db.createObjectStore('preferences', { keyPath: 'key' });
            }
            // if (!db.objectStoreNames.contains('preferences')) {
            //     db.createObjectStore('preferences', {keyPath: 'key' });
            // }
            if (!db.objectStoreNames.contains('biometrics')) {
                db.createObjectStore('biometrics', { keyPath: 'id' });
            }
        },
    });
}

export const offlineStorage = {
    async saveAttendance(data) {
        try {
            const db = await getDB();
            const record = { ...data, timestamp: new Date().toISOString(), synced: false };
            return db.add('offlineAttendance', record);
        } catch (error) {
            console.error('Failed to save attendance:', error);
            throw error;
        }
    },

    async getOfflineAttendance() {
        try {
            const db = await getDB();
            return db.getAll('offlineAttendance');
        } catch (error) {
            console.error('Failed to get attendance:', error);
            return [];
        }
    },

    async getUnsyncedAttendance() {
        const all = await this.getOfflineAttendance();
        return all.filter(a => !a.synced);
    },

    async clearOfflineAttendance(id) {
        try {
            const db = await getDB();
            return db.delete('offlineAttendance', id);
        } catch (error) {
            console.error('Failed to clear attendance:', error);
            throw error;
        }
    },

    async clearAllOfflineAttendance() {
        try {
            const db = await getDB();
            return db.clear('offlineAttendance');
        } catch (error) {
            console.error('Failed to clear all attendance:', error);
            throw error;
        }
    },

    async markAttendanceSynced(ids) {
        try {
            const db = await getDB();
            const tx = db.transaction('offlineAttendance', 'readwrite');
            for (const id of ids) {
                const record = await tx.store.get(id);
                if (record) {
                    record.synced = true;
                    await tx.store.put(record);
                }
            }
            await tx.done;
        } catch (error) {
            console.error('Failed to mark attendance synced:', error);
        }
    },

    async saveOfflineMarks(marksData) {
        try {
            const db = await getDB();
            const record = { ...marksData, synced: false, createdAt: new Date().toISOString() };
            return db.add('offlineMarks', record);
        } catch (error) {
            console.error('Failed to save marks:', error);
            throw error;
        }
    },

    async getOfflineMarks() {
        try {
            const db = await getDB();
            return db.getAll('offlineMarks');
        } catch (error) {
            console.error('Failed to get marks:', error);
            return [];
        }
    },

    async getUnsyncedMarks() {
        const all = await this.getOfflineMarks();
        return all.filter(m => !m.synced);
    },

    async markMarksSynced(ids) {
        try {
            const db = await getDB();
            const tx = db.transaction('offlineMarks', 'readwrite');
            for (const id of ids) {
                const record = await tx.store.get(id);
                if (record) {
                    record.synced = true;
                    await tx.store.put(record);
                }
            }
            await tx.done;
        } catch (error) {
            console.error('Failed to mark marks synced:', error);
        }
    },

    async clearAllOfflineMarks() {
        try {
            const db = await getDB();
            return db.clear('offlineMarks');
        } catch (error) {
            console.error('Failed to clear marks:', error);
            throw error;
        }
    },

    async addToSyncQueue(operation) {
        try {
            const db = await getDB();
            return db.add('syncQueue', {
                type: operation.type,
                endpoint: operation.endpoint,
                method: operation.method || 'POST',
                data: operation.data,
                status: 'pending',
                attempts: 0,
                maxAttempts: 3,
                lastError: null,
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to add to sync queue:', error);
            throw error;
        }
    },

    async getSyncQueue(status = null) {
        try {
            const db = await getDB();
            if (status) {
                const index = db.transaction('syncQueue').store.index('status');
                return index.getAll(status);
            }
            return db.getAll('syncQueue');
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    },

    async getPendingSyncCount() {
        const pending = await this.getSyncQueue('pending');
        return pending.length;
    },

    async updateSyncItem(id, updates) {
        try {
            const db = await getDB();
            const item = await db.get('syncQueue', id);
            if (item) {
                Object.assign(item, updates);
                return db.put('syncQueue', item);
            }
        } catch (error) {
            console.error('Failed to update sync item:', error);
        }
    },

    async clearSyncItem(id) {
        try {
            const db = await getDB();
            return db.delete('syncQueue', id);
        } catch (error) {
            console.error('Failed to clear sync item:', error);
        }
    },

    async processSyncQueue(apiInstance = null) {
        if (_syncLock) {
            console.warn('⚠️ Sync already in progress, skipping duplicate call');
            return { synced: 0, failed: 0, skipped: true };
        }

        if (!_isOnline) {
            console.log('📡 Still offline, skipping sync');
            return { synced: 0, failed: 0 };
        }

        // Check if user is logged in (has a valid access token)
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            console.warn('🔒 No access token, cannot sync. User must login first.');
            return { synced: 0, failed: 0 };
        }

        _syncLock = true;
        console.log('🔒 Sync lock acquired');

        try {
            const pending = await this.getSyncQueue('pending');
            if (pending.length === 0) {
                console.log('✅ No pending items to sync');
                return { synced: 0, failed: 0 };
            }

            console.log(`🔄 Processing ${pending.length} pending sync items...`);
            let synced = 0;
            let failed = 0;

            for (const item of pending) {
                try {
                    let client = apiInstance;
                    if (!client) {
                        try {
                            const apiModule = await import('../api/client');
                            client = apiModule.default;
                        } catch (importError) {
                            console.error('Failed to import API client:', importError);
                            await this.updateSyncItem(item.id, {
                                attempts: item.attempts + 1,
                                status: 'pending',
                                lastError: 'API client unavailable',
                            });
                            failed++;
                            continue;
                        }
                    }

                    // Mark this request as a sync background request
                    const config = {
                        headers: {},
                        _syncRequest: true,   // flag for interceptor
                    };

                    let response;
                    switch (item.method.toUpperCase()) {
                        case 'POST':
                            response = await client.post(item.endpoint, item.data, config);
                            break;
                        case 'PUT':
                            response = await client.put(item.endpoint, item.data, config);
                            break;
                        case 'PATCH':
                            response = await client.patch(item.endpoint, item.data, config);
                            break;
                        case 'DELETE':
                            response = await client.delete(item.endpoint, config);
                            break;
                        default:
                            response = await client.post(item.endpoint, item.data, config);
                    }

                    if (response?.status >= 200 && response?.status < 300) {
                        await this.clearSyncItem(item.id);
                        synced++;
                    } else {
                        await this.updateSyncItem(item.id, {
                            attempts: item.attempts + 1,
                            status: item.attempts + 1 >= item.maxAttempts ? 'failed' : 'pending',
                            lastError: `HTTP ${response?.status}`,
                        });
                        failed++;
                    }
                } catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error.message);
                    await this.updateSyncItem(item.id, {
                        attempts: item.attempts + 1,
                        status: item.attempts + 1 >= item.maxAttempts ? 'failed' : 'pending',
                        lastError: error.message,
                    });
                    failed++;
                }
            }

            console.log(`🔄 Sync complete: ${synced} synced, ${failed} failed`);
            return { synced, failed };
        } finally {
            _syncLock = false;
            console.log('🔓 Sync lock released');
        }
    },

    async processSyncQueueAtomic(apiInstance = null) {
        return this.processSyncQueue(apiInstance);
    },

    async clearFailedSyncItems() {
        try {
            const failed = await this.getSyncQueue('failed');
            const db = await getDB();
            for (const item of failed) {
                await db.delete('syncQueue', item.id);
            }
        } catch (error) {
            console.error('Failed to clear failed items:', error);
        }
    },

    async cacheApiResponse(url, data, ttlMinutes = 5) {
        try {
            const db = await getDB();
            const now = Date.now();
            return db.put('apiCache', {
                url,
                data,
                timestamp: new Date().toISOString(),
                expiresAt: now + ttlMinutes * 60000,
            });
        } catch (error) {
            console.error('Failed to cache API response:', error);
        }
    },

    async getCachedResponse(url) {
        try {
            const db = await getDB();
            const cached = await db.get('apiCache', url);
            if (!cached) return null;
            if (Date.now() > cached.expiresAt) {
                await db.delete('apiCache', url);
                return null;
            }
            return cached.data;
        } catch (error) {
            console.error('Failed to get cached response:', error);
            return null;
        }
    },

    async cleanupExpiredCache() {
        try {
            const db = await getDB();
            const all = await db.getAll('apiCache');
            const now = Date.now();
            let cleaned = 0;
            for (const item of all) {
                if (now > item.expiresAt) {
                    await db.delete('apiCache', item.url);
                    cleaned++;
                }
            }
            if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
            return cleaned;
        } catch (error) {
            console.error('Failed to cleanup cache:', error);
            return 0;
        }
    },

    async clearAllCache() {
        try {
            const db = await getDB();
            return db.clear('apiCache');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    },

    async getCacheSize() {
        try {
            const db = await getDB();
            const all = await db.getAll('apiCache');
            return new Blob([JSON.stringify(all)]).size;
        } catch (error) {
            return 0;
        }
    },

    async setSetting(key, value) {
        try {
            const db = await getDB();
            return db.put('settings', { key, value });
        } catch (error) {
            console.error('Failed to save setting:', error);
        }
    },

    async getSetting(key) {
        try {
            const db = await getDB();
            const setting = await db.get('settings', key);
            return setting?.value;
        } catch (error) {
            console.error('Failed to get setting:', error);
            return null;
        }
    },

    async saveFormDraft(formId, data) {
        try {
            const db = await getDB();
            return db.put('formDrafts', { formId, data, savedAt: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to save form draft:', error);
        }
    },

    async getFormDraft(formId) {
        try {
            const db = await getDB();
            return db.get('formDrafts', formId);
        } catch (error) {
            console.error('Failed to get form draft:', error);
            return null;
        }
    },

    async deleteFormDraft(formId) {
        try {
            const db = await getDB();
            return db.delete('formDrafts', formId);
        } catch (error) {
            console.error('Failed to delete form draft:', error);
        }
    },

    async setPreference(key, value) {
        try {
            const db = await getDB();
            return db.put('preferences', { key, value });
        } catch (error) {
            console.error('Failed to save preference:', error);
        }
    },

    async getPreference(key) {
        try {
            const db = await getDB();
            const pref = await db.get('preferences', key);
            return pref?.value;
        } catch (error) {
            console.error('Failed to get preference:', error);
            return null;
        }
    },

    async getAllPreferences() {
        try {
            const db = await getDB();
            const all = await db.getAll('preferences');
            const prefs = {};
            for (const item of all) prefs[item.key] = item.value;
            return prefs;
        } catch (error) {
            console.error('Failed to get preferences:', error);
            return {};
        }
    },

    async saveBiometricStatus(status) {
        try {
            const db = await getDB();
            return db.put('biometrics', { id: 'enrollment_status', ...status, updatedAt: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to save biometric status:', error);
            throw error;
        }
    },

    async getBiometricStatus() {
        try {
            const db = await getDB();
            return await db.get('biometrics', 'enrollment_status');
        } catch (error) {
            console.error('Failed to retrieve biometric status:', error);
            return null;
        }
    },

    async clearAllOfflineData() {
        try {
            const db = await getDB();
            const stores = ['offlineAttendance', 'offlineMarks', 'syncQueue', 'formDrafts', 'biometrics'];
            for (const store of stores) {
                if (db.objectStoreNames.contains(store)) await db.clear(store);
            }
            console.log('🧹 Cleared all offline data including biometrics');
        } catch (error) {
            console.error('Failed to clear offline data:', error);
        }
    },

    async getDBStats() {
        try {
            const db = await getDB();
            const stats = {};
            for (const storeName of db.objectStoreNames) {
                stats[storeName] = await db.count(storeName);
            }
            return stats;
        } catch (error) {
            console.error('Failed to get DB stats:', error);
            return {};
        }
    },

    async performMaintenance() {
        await this.cleanupExpiredCache();
        await this.clearFailedSyncItems();
        console.log('🔧 Database maintenance complete');
    },
};