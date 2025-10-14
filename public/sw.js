// siOsi PWA service worker
// Update this file to bust caches and deliver new functionality.

const STATIC_CACHE = "siosi-static-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // No HTML precache to avoid stale shells; just warm the offline page.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const acceptHeader = request.headers.get("accept") || "";
  const isHTMLRequest = request.mode === "navigate" || acceptHeader.includes("text/html");

  if (isHTMLRequest) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const offlineResponse = await cache.match(OFFLINE_URL);
        return offlineResponse || Response.error();
      })
    );
    return;
  }

  // Cache-first strategy for static assets.
  if (request.destination && ["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Network-first for everything else (e.g., API calls).
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
