// Enhanced Service Worker for Aggressive Caching
// Version 1.0 - Performance Optimized

const CACHE_NAME = 'drain-fortin-v1.0';
const STATIC_CACHE = 'static-v1.0';
const DYNAMIC_CACHE = 'dynamic-v1.0';
const API_CACHE = 'api-v1.0';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192.png',
  '/pwa-512.png'
];

// API endpoints to cache with TTL
const API_CACHE_PATTERNS = [
  /^https:\/\/phiduqxcufdmgjvdipyu\.supabase\.co\/rest\/v1\//,
  /^https:\/\/phiduqxcufdmgjvdipyu\.supabase\.co\/auth\/v1\//
];

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  static: 365 * 24 * 60 * 60, // 1 year for static resources
  dynamic: 24 * 60 * 60,      // 1 day for dynamic content
  api: 5 * 60,                // 5 minutes for API responses
  images: 30 * 24 * 60 * 60   // 30 days for images
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip caching for chrome-extension and browser-internal requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Static Resources (Cache First with Long TTL)
    if (isStaticResource(url)) {
      return await cacheFirst(request, STATIC_CACHE, CACHE_DURATIONS.static);
    }

    // Strategy 2: API Requests (Stale While Revalidate with TTL)
    if (isApiRequest(url)) {
      return await staleWhileRevalidate(request, API_CACHE, CACHE_DURATIONS.api);
    }

    // Strategy 3: Images (Cache First with Medium TTL)
    if (isImageRequest(url)) {
      return await cacheFirst(request, DYNAMIC_CACHE, CACHE_DURATIONS.images);
    }

    // Strategy 4: JavaScript/CSS (Stale While Revalidate)
    if (isAssetRequest(url)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic);
    }

    // Strategy 5: HTML Pages (Network First with Fallback)
    if (isPageRequest(url)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }

    // Default: Network first
    return await fetch(request);

  } catch (error) {
    console.warn('[SW] Request failed:', request.url, error);
    
    // Return cached version if available
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return getOfflinePage();
    }

    throw error;
  }
}

// Cache First Strategy - Good for static resources
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, maxAge)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, addTimestamp(responseClone));
    }
    return response;
  } catch (error) {
    if (cached) {
      console.log('[SW] Serving stale cache for:', request.url);
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy - Good for API calls
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Background update
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, addTimestamp(responseClone));
    }
    return response;
  }).catch(error => {
    console.warn('[SW] Background fetch failed:', error);
  });

  // Return cached if available and not expired
  if (cached && !isExpired(cached, maxAge)) {
    fetchPromise; // Fire and forget
    return cached;
  }

  // Wait for network if no cache or expired
  try {
    return await fetchPromise;
  } catch (error) {
    if (cached) {
      console.log('[SW] Network failed, serving stale cache for:', request.url);
      return cached;
    }
    throw error;
  }
}

// Network First Strategy - Good for HTML pages
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, addTimestamp(responseClone));
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Network failed, serving cache for:', request.url);
      return cached;
    }
    throw error;
  }
}

// Helper Functions
function isStaticResource(url) {
  return STATIC_RESOURCES.some(resource => url.pathname === resource) ||
         url.pathname.includes('/assets/') ||
         url.pathname.includes('/fonts/');
}

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isAssetRequest(url) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

function isPageRequest(url) {
  return url.pathname.endsWith('.html') || 
         (!url.pathname.includes('.') && url.pathname !== '/');
}

function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-timestamp', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function isExpired(response, maxAge) {
  const timestamp = response.headers.get('sw-cache-timestamp');
  if (!timestamp) return true;
  
  const age = (Date.now() - parseInt(timestamp)) / 1000;
  return age > maxAge;
}

async function getCachedResponse(request) {
  const cacheNames = [API_CACHE, DYNAMIC_CACHE, STATIC_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(request);
    if (response) return response;
  }
  
  return null;
}

async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE);
  const response = await cache.match('/index.html');
  
  if (response) {
    return response;
  }

  // Fallback offline response
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hors ligne - Drain Fortin</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 400px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          h1 { color: #333; }
          button { 
            background: #0066cc; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 4px; 
            cursor: pointer; 
            margin-top: 20px; 
          }
          button:hover { background: #0052a3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔌 Hors ligne</h1>
          <p>Vous êtes actuellement hors ligne. Veuillez vérifier votre connexion internet.</p>
          <button onclick="window.location.reload()">Réessayer</button>
        </div>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Implement background sync logic for failed API calls
  console.log('[SW] Handling background sync...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Notification reçue',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Drain Fortin', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');

  event.notification.close();

  event.waitUntil(
    self.clients.openWindow('/')
  );
});

console.log('[SW] Service Worker loaded and ready!');