// CrisisLink Service Worker for Offline Emergency Functionality
// This service worker enables critical emergency features to work offline

const CACHE_VERSION = 'crisislink-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`

// Critical resources to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  // Emergency contact numbers and basic resources
  '/emergency-contacts.json',
  '/safety-tips.json',
]

// API endpoints that should be cached for offline access
const CACHE_API_PATTERNS = [
  /\/api\/resources/,
  /\/api\/locations\/shelters/,
  /\/api\/locations\/evacuation-routes/,
  /\/api\/weather\/current/,
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 CrisisLink Service Worker Installing...')

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets for offline emergency access')
        return cache.addAll(
          STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' }))
        )
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error)
      })
  )

  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ CrisisLink Service Worker Activated')

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== OFFLINE_CACHE
            ) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle SOS alerts specially - always try to send, store if offline
  if (url.pathname.includes('/api/sos/alert')) {
    event.respondWith(handleSOSAlert(request))
    return
  }

  // Handle API requests with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

// Handle SOS alerts - critical emergency functionality
async function handleSOSAlert(request) {
  try {
    // Always try to send the SOS alert first
    const response = await fetch(request)

    if (response.ok) {
      console.log('✅ SOS Alert sent successfully')
      return response
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.warn('⚠️ SOS Alert failed to send, storing for retry:', error)

    // Store the SOS alert for later retry when online
    try {
      const alertData = await request.clone().json()
      await storeOfflineAlert({
        ...alertData,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        offline: true,
      })

      // Return a success response to the client
      return new Response(
        JSON.stringify({
          success: true,
          offline: true,
          message: 'SOS alert stored for sending when connection restored',
          alertId: Date.now(), // Temporary offline ID
        }),
        {
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (storeError) {
      console.error('❌ Failed to store offline SOS alert:', storeError)
      return new Response(
        JSON.stringify({
          error: 'Failed to process SOS alert offline',
          offline: true,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

// Handle API requests with caching strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url)

  // Check if this API should be cached
  const shouldCache = CACHE_API_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  )

  try {
    // Try network first
    const response = await fetch(request)

    if (response.ok && shouldCache) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.warn('🌐 Network failed, trying cache for:', url.pathname)

    // Try cache fallback
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📱 Serving from cache:', url.pathname)
      return cachedResponse
    }

    // Return offline response for critical endpoints
    if (url.pathname.includes('/api/resources')) {
      return getOfflineResources()
    }

    if (url.pathname.includes('/api/weather')) {
      return getOfflineWeatherData()
    }

    // Generic offline response
    return new Response(
      JSON.stringify({
        error: 'Service unavailable offline',
        offline: true,
        message: 'This feature requires an internet connection',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Fallback to network
    const response = await fetch(request)

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/')
      if (offlineResponse) {
        return offlineResponse
      }
    }

    return new Response('Service Unavailable', { status: 503 })
  }
}

// Store SOS alert for offline retry
async function storeOfflineAlert(alertData) {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['alerts'], 'readwrite')
    const store = transaction.objectStore('alerts')

    await new Promise((resolve, reject) => {
      const request = store.add(alertData)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    console.log('💾 SOS Alert stored offline for retry')
  } catch (error) {
    console.error('❌ Failed to store offline alert:', error)
    // Fallback to localStorage
    const offlineAlerts = JSON.parse(
      localStorage.getItem('crisislink_offline_alerts') || '[]'
    )
    offlineAlerts.push(alertData)
    localStorage.setItem(
      'crisislink_offline_alerts',
      JSON.stringify(offlineAlerts)
    )
  }
}

// Open IndexedDB for offline storage
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CrisisLinkOffline', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create alerts store
      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', {
          keyPath: 'id',
          autoIncrement: true,
        })
        alertStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Create cache store for location data
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { keyPath: 'key' })
      }
    }
  })
}

// Get offline emergency resources
function getOfflineResources() {
  const offlineResources = {
    emergencyContacts: {
      Police: '10111',
      'Fire & Ambulance': '10177',
      'Disaster Management': '021-590-1900',
      'Emergency Medical Services': '10177',
    },
    safetyTips: [
      {
        id: 1,
        category: 'general',
        title: 'General Emergency Safety',
        tips: [
          'Stay calm and assess the situation',
          'Call emergency services immediately',
          'Follow official evacuation orders',
          'Keep emergency supplies ready',
        ],
      },
      {
        id: 2,
        category: 'flood',
        title: 'Flood Safety',
        tips: [
          'Move to higher ground immediately',
          'Avoid walking or driving through flood water',
          'Stay away from power lines',
          'Listen to emergency broadcasts',
        ],
      },
    ],
    languages: {
      en: 'English',
      zu: 'Zulu',
      xh: 'Xhosa',
      af: 'Afrikaans',
    },
  }

  return new Response(JSON.stringify(offlineResources), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline': 'true',
    },
  })
}

// Get cached weather data or offline message
function getOfflineWeatherData() {
  const offlineWeather = {
    error: 'Weather data unavailable offline',
    offline: true,
    message:
      'Weather monitoring requires internet connection. Last location cached for emergency use.',
    dangerLevel: 'unknown',
  }

  return new Response(JSON.stringify(offlineWeather), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline': 'true',
    },
  })
}

// Listen for online event to retry failed SOS alerts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RETRY_OFFLINE_ALERTS') {
    retryOfflineAlerts()
  }
})

// Retry offline SOS alerts when connection is restored
async function retryOfflineAlerts() {
  try {
    console.log('🔄 Retrying offline SOS alerts...')

    const db = await openOfflineDB()
    const transaction = db.transaction(['alerts'], 'readwrite')
    const store = transaction.objectStore('alerts')

    const alerts = await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    for (const alert of alerts) {
      try {
        const response = await fetch('/api/sos/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        })

        if (response.ok) {
          // Remove successfully sent alert from offline storage
          store.delete(alert.id)
          console.log('✅ Offline SOS alert sent successfully')
        }
      } catch (error) {
        console.warn('⚠️ Failed to retry SOS alert:', error)
        // Increment retry count
        alert.retryCount = (alert.retryCount || 0) + 1
        if (alert.retryCount < 3) {
          store.put(alert)
        } else {
          console.error('❌ Max retries reached for SOS alert, removing')
          store.delete(alert.id)
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to retry offline alerts:', error)
  }
}

// Background sync for SOS alerts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-alert-retry') {
    event.waitUntil(retryOfflineAlerts())
  }
})

// Push notifications for emergency alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()

    const options = {
      body: data.body || 'Emergency alert received',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'emergency-alert',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || '🚨 CrisisLink Emergency Alert',
        options
      )
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(clients.openWindow('/'))
  }
})

console.log(
  '🚨 CrisisLink Service Worker Ready - Emergency features available offline'
)
