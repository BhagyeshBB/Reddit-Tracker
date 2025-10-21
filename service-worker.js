// Service Worker for Reddit Engagement Tracker
// Enables offline functionality through caching

const CACHE_NAME = 'reddit-tracker-v1';

// Resources to cache
const RESOURCES_TO_CACHE = [
    './index.html',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/pivottable@2.23.0/dist/pivot.min.js',
    'https://cdn.jsdelivr.net/npm/pivottable@2.23.0/dist/pivot.min.css',
    'https://code.jquery.com/jquery-3.6.0.min.js'
];

// Install Event - Pre-cache all resources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all resources');
                return cache.addAll(RESOURCES_TO_CACHE);
            })
            .then(() => {
                console.log('[Service Worker] All resources cached');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('[Service Worker] Caching failed:', error);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // For HTML requests: Network first, fallback to cache
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone the response before caching
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Network failed, return cached version
                    return caches.match(request);
                })
        );
        return;
    }

    // For all other requests (CSS, JS, fonts): Cache first, fallback to network
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone the response before caching
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    })
                    .catch((error) => {
                        console.error('[Service Worker] Fetch failed:', error);
                        // Could return a custom offline page here
                        throw error;
                    });
            })
    );
});
