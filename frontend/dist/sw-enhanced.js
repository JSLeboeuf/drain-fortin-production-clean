/**
 * Enhanced Service Worker for Drain Fortin Dashboard
 * Performance-optimized caching and offline functionality
 */

const CACHE_NAME = 'drain-fortin-v2.0.0';
const STATIC_CACHE = 'drain-fortin-static-v2.0.0';
const API_CACHE = 'drain-fortin-api-v2.0.0';
const IMAGE_CACHE = 'drain-fortin-images-v2.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192.png',
  '/pwa-512.png',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/dashboard/metrics',
  '/api/calls',
  '/api/analytics',
];

// Cache configuration
const CACHE_CONFIG = {
  maxEntries: 100,
  maxAgeSeconds: 60 * 60 * 24, // 24 hours
  purgeOnQuotaError: true,
};

// Network timeout for requests
const NETWORK_TIMEOUT = 5000;

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2.0.0');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Initialize API cache
      caches.open(API_CACHE),
      
      // Initialize image cache
      caches.open(IMAGE_CACHE),
    ]).then(() => {
      console.log('[SW] Static assets cached successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2.0.0');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== API_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      });
    })
  );
});

// Fetch event - Route requests through appropriate cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Route requests based on type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isAPIRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirstWithFallback(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

// Cache strategies implementation

/**
 * Cache First Strategy - Good for static assets
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached version immediately
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetchWithTimeout(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Network error occurred', { status: 503 });
  }
}

/**
 * Network First Strategy - Good for dynamic content
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetchWithTimeout(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Content not available offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate Strategy - Good for API calls
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network in background
  const networkResponsePromise = fetchWithTimeout(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] Network update failed:', error.message);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  try {
    return await networkResponsePromise;
  } catch (error) {
    return new Response('Content not available', { status: 503 });
  }
}

/**
 * Network First with Offline Fallback
 */
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetchWithTimeout(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, serving offline page');
    
    // Try to serve cached version
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/index.html');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return new Response(getOfflineHTML(), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Utility functions

/**
 * Fetch with timeout
 */
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);
    
    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.includes('/assets/') ||
    STATIC_ASSETS.includes(url.pathname)
  );
}

/**
 * Check if URL is an API request
 */
function isAPIRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))
  );
}

/**
 * Check if URL is an image request
 */
function isImageRequest(url) {
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  );
}

/**
 * Get offline HTML page
 */
function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Drain Fortin - Hors ligne</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 2rem;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                color: #333;
                text-align: center;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .offline-container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                max-width: 500px;
            }
            .offline-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                color: #0066cc;
            }
            h1 {
                color: #0066cc;
                margin-bottom: 1rem;
                font-size: 2rem;
            }
            p {
                margin-bottom: 1.5rem;
                line-height: 1.6;
                color: #666;
            }
            .retry-btn {
                background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            .retry-btn:hover {
                transform: translateY(-2px);
            }
            .features {
                margin-top: 2rem;
                text-align: left;
            }
            .feature {
                margin: 0.5rem 0;
                color: #666;
            }
            .feature::before {
                content: '✓';
                color: #0066cc;
                margin-right: 0.5rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>Mode Hors Ligne</h1>
            <p>
                Vous êtes actuellement hors ligne. Le tableau de bord Drain Fortin 
                continuera de fonctionner avec les données mises en cache.
            </p>
            
            <div class="features">
                <div class="feature">Consultation des appels récents</div>
                <div class="feature">Visualisation des métriques</div>
                <div class="feature">Accès aux données CRM</div>
                <div class="feature">Synchronisation automatique au retour</div>
            </div>
            
            <button class="retry-btn" onclick="window.location.reload()">
                Réessayer la connexion
            </button>
        </div>
        
        <script>
            // Auto-retry when back online
            window.addEventListener('online', () => {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            });
            
            // Check connection periodically
            setInterval(() => {
                if (navigator.onLine) {
                    fetch('/api/health', { method: 'HEAD' })
                        .then(() => window.location.reload())
                        .catch(() => {});
                }
            }, 30000);
        </script>
    </body>
    </html>
  `;
}

// Background sync for API calls
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-api') {
    event.waitUntil(syncAPIData());
  }
});

/**
 * Sync API data when back online
 */
async function syncAPIData() {
  try {
    console.log('[SW] Starting background sync');
    
    // Sync critical API endpoints
    const syncPromises = API_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put(endpoint, response);
        }
      } catch (error) {
        console.log(`[SW] Failed to sync ${endpoint}:`, error.message);
      }
    });
    
    await Promise.all(syncPromises);
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nouvelle notification de Drain Fortin',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'drain-fortin-notification',
    renotify: true,
    requireInteraction: data.priority === 'P1',
    actions: [
      {
        action: 'view',
        title: 'Voir',
        icon: '/pwa-192.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Drain Fortin', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Periodic cache cleanup
setInterval(async () => {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Remove expired entries (older than 24 hours)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const responseAge = now - new Date(dateHeader).getTime();
            if (responseAge > maxAge) {
              await cache.delete(request);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour

console.log('[SW] Enhanced service worker loaded successfully');