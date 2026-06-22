const CACHE_NAME = 'mena-inc-v2.3-offline-launch-shell';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mena-logo.png',
  '/mena-favicon-light.png',
  '/mena-favicon-dark.png'
];

const cacheFreshResponse = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    return undefined;
  }
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Let browser requests for files from other domains (e.g. Supabase API) pass through directly.
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(async (cachedResponse) => {
      const requestForCache = e.request.mode === 'navigate' ? new Request('/index.html') : e.request;
      const cachedNavigateResponse = e.request.mode === 'navigate'
        ? await caches.match(requestForCache)
        : undefined;
      const usableCachedResponse = cachedResponse || cachedNavigateResponse;

      if (usableCachedResponse) {
        e.waitUntil(cacheFreshResponse(requestForCache));
        return usableCachedResponse;
      }

      const freshResponse = await cacheFreshResponse(requestForCache);
      return freshResponse || caches.match('/index.html');
    })
  );
});
