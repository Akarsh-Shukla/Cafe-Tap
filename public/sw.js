// CafeTap PWA Service Worker
const CACHE_NAME = 'cafetap-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Never cache Supabase API calls or authentication requests
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Network-first for HTML pages so updates are immediate, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static icons and assets
  if (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification listener
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'New CafeTap Order', body: event.data ? event.data.text() : 'A new order has arrived.' };
  }

  const title = data.title || 'CafeTap Order Alert';
  const options = {
    body: data.body || 'New order waiting for confirmation.',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    vibrate: [200, 100, 200],
    data: data.url || '/dashboard',
    tag: 'cafetap-order-notification',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus or open dashboard on notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
