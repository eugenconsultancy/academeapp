// ── Service Worker v2 ──────────────────────────────────────────
const CACHE_NAME = 'academe-v2';
const OFFLINE_URL = '/offline.html';

// Import IndexedDB support for service worker
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // 1. Skip API calls and Biometric verification routes
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});

// ── BACKGROUND SYNC ──────────────────────────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncOfflineAttendance());
    }
});

async function syncOfflineAttendance() {
    // Use the idb library imported via importScripts
    const db = await idb.openDB('AcademeOfflineDB', 3);
    const offlineData = await db.getAll('offlineAttendance');

    for (const record of offlineData) {
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/classes/mark-attendance/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(record),
            });

            if (response.ok) {
                await db.delete('offlineAttendance', record.id);
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}

// Service workers cannot access localStorage. 
// You should store your token in IndexedDB for the SW to read it.
async function getAccessToken() {
    const db = await idb.openDB('AcademeOfflineDB', 3);
    const token = await db.get('settings', 'access_token');
    return token;
}