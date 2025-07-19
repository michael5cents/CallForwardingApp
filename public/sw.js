// Service Worker for Call Forwarding Dashboard PWA
// Enhanced for Samsung Z Fold 3 background monitoring
// Provides background sync, push notifications, and offline functionality

const CACHE_NAME = 'call-forwarding-v1.4.0';
const BASE_URL = self.location.origin;
let lastSyncTime = 0;

// Files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/index.html',
  '/app.js',
  '/notification-helper.js',
  '/styles.css',
  '/manifest.json',
  '/socket.io/socket.io.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external resources
  if (event.request.method !== 'GET' || !event.request.url.startsWith(BASE_URL)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then cache for call logs
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok && event.request.url.includes('/api/call-logs')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for call logs when offline
          if (event.request.url.includes('/api/call-logs')) {
            return caches.match(event.request);
          }
          throw new Error('Network failed and no cache available');
        })
    );
    return;
  }

  // For static resources, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Enhanced background sync for Samsung Z Fold 3
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-call-logs') {
    event.waitUntil(syncCallLogs());
  } else if (event.tag === 'sync-contacts') {
    event.waitUntil(syncContacts());
  } else if (event.tag === 'sync-blacklist') {
    event.waitUntil(syncBlacklist());
  } else if (event.tag === 'sync-all-data') {
    event.waitUntil(syncAllData());
  }
});

// Enhanced background sync for all data
async function syncAllData() {
  console.log('[SW] Syncing all data in background...');
  
  try {
    const results = await Promise.allSettled([
      syncCallLogs(),
      syncContacts(), 
      syncBlacklist()
    ]);
    
    console.log('[SW] Background sync completed:', results);
    
    // Update last sync time
    lastSyncTime = Date.now();
    
    return true;
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    return false;
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Call Forwarding Alert',
    body: 'New call activity detected',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'call-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss', 
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }

  // Show notification with vibration for Samsung devices
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      ...notificationData,
      vibrate: [200, 100, 200, 100, 200], // Strong vibration pattern for call alerts
      silent: false,
      renotify: true
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'view' action - open the app
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app is already open
      for (let client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background fetch for large data updates
self.addEventListener('backgroundfetch', (event) => {
  console.log('[SW] Background fetch triggered:', event.tag);
  
  if (event.tag === 'update-call-data') {
    event.waitUntil(updateCallData());
  }
});

// Enhanced message handler for Samsung Z Fold 3 communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data.type === 'SYNC_DATA') {
    // Trigger background sync
    self.registration.sync.register('sync-all-data');
  } else if (event.data.type === 'APP_FOREGROUNDED') {
    // App came back to foreground - sync if needed
    const timeSinceLastSync = Date.now() - lastSyncTime;
    if (timeSinceLastSync > 30000) { // 30 seconds
      console.log('[SW] App foregrounded - triggering sync');
      self.registration.sync.register('sync-all-data');
    }
  } else if (event.data.type === 'APP_BACKGROUNDED') {
    // App went to background - prepare for background operation
    console.log('[SW] App backgrounded - enabling background monitoring');
    lastSyncTime = Date.now();
  } else if (event.data.type === 'FOCUS_CLIENT') {
    // Enhanced client focus for Samsung devices
    console.log('[SW] Focusing client:', event.data.url);
    focusClient(event.data.url);
  }
});

// Enhanced client focus function for Samsung Z Fold 3
async function focusClient(targetUrl) {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    console.log('[SW] Found clients:', clients.length);
    
    for (let client of clients) {
      if (client.url.includes(targetUrl) || !targetUrl) {
        console.log('[SW] Attempting to focus client:', client.url);
        
        // Try multiple focus methods
        if (client.focus) {
          await client.focus();
        }
        
        // Send focus message to client
        client.postMessage({
          type: 'FORCE_FOCUS',
          timestamp: Date.now()
        });
        
        return;
      }
    }
    
    // If no existing client found, try to open new window
    if (self.clients.openWindow && targetUrl) {
      console.log('[SW] Opening new window for:', targetUrl);
      await self.clients.openWindow(targetUrl);
    }
    
  } catch (error) {
    console.error('[SW] Focus client failed:', error);
  }
}

// Periodic background sync for Samsung Internet
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'call-logs-sync') {
    event.waitUntil(syncCallLogs());
  }
});

// Helper functions for background operations

async function syncCallLogs() {
  console.log('[SW] Syncing call logs...');
  
  try {
    const response = await fetch('/api/call-logs');
    if (response.ok) {
      const callLogs = await response.json();
      
      // Cache the updated call logs
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/call-logs', new Response(JSON.stringify(callLogs)));
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CALL_LOGS_UPDATED',
          data: callLogs
        });
      });
      
      console.log('[SW] Call logs synced successfully');
      return true;
    }
  } catch (error) {
    console.error('[SW] Call logs sync failed:', error);
    return false;
  }
}

async function syncContacts() {
  console.log('[SW] Syncing contacts...');
  
  try {
    const response = await fetch('/api/contacts');
    if (response.ok) {
      const contacts = await response.json();
      
      // Cache the updated contacts
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/contacts', new Response(JSON.stringify(contacts)));
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CONTACTS_UPDATED',
          data: contacts
        });
      });
      
      console.log('[SW] Contacts synced successfully');
      return true;
    }
  } catch (error) {
    console.error('[SW] Contacts sync failed:', error);
    return false;
  }
}

async function syncBlacklist() {
  console.log('[SW] Syncing blacklist...');
  
  try {
    const response = await fetch('/api/blacklist');
    if (response.ok) {
      const blacklist = await response.json();
      
      // Cache the updated blacklist
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/blacklist', new Response(JSON.stringify(blacklist)));
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BLACKLIST_UPDATED',
          data: blacklist
        });
      });
      
      console.log('[SW] Blacklist synced successfully');
      return true;
    }
  } catch (error) {
    console.error('[SW] Blacklist sync failed:', error);
    return false;
  }
}

async function updateCallData() {
  console.log('[SW] Updating call data...');
  
  try {
    await Promise.all([
      syncCallLogs(),
      syncContacts(),
      syncBlacklist()
    ]);
    
    console.log('[SW] All call data updated successfully');
    return true;
  } catch (error) {
    console.error('[SW] Call data update failed:', error);
    return false;
  }
}

// Error handler
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

// Unhandled promise rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker script loaded');