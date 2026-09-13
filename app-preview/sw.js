const CACHE = 'byggepiloten-v66'

function isAssetContentType(contentType) {
  if (!contentType) return false
  const ct = contentType.toLowerCase()
  return (
    ct.includes('javascript') ||
    ct.includes('ecmascript') ||
    ct.includes('text/css') ||
    ct.includes('wasm') ||
    ct.includes('font/') ||
    ct.includes('image/') ||
    ct.includes('application/json')
  )
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.svg', './icon-512.svg']),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SW_UPDATED' })
        }
      }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Altid netværk først — undgå gammel «kommer snart»-HTML på mobil/PWA
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((res) => {
          const ct = res.headers.get('content-type') || ''
          if (res.ok && ct.includes('text/html')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => {
              void c.put('./index.html', copy)
              void c.put(request, copy)
            })
          }
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html'))),
    )
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const ct = res.headers.get('content-type') || ''
          // Cache aldrig SPA-HTML der fejlagtigt returneres for manglende assets
          if (res.ok && isAssetContentType(ct) && !ct.includes('text/html')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request)),
    )
  }
})

/** Web Push — vis notifikation selv når appen er lukket */
self.addEventListener('push', (event) => {
  let data = {
    title: 'ByggePiloten',
    body: 'Du har en ny besked',
    url: '/',
    tag: 'byggepiloten',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data.body = text
    } catch {
      /* default */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ByggePiloten', {
      body: data.body || '',
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      tag: data.tag || 'byggepiloten',
      data: { url: data.url || '/' },
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target)
      }
    }),
  )
})
