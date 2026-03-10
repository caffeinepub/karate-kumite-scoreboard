// Service Worker - PASS-THROUGH ONLY
// This service worker does NOT cache anything and does NOT intercept any requests.
// Its only job is to self-destruct and unregister itself to clear any old broken caches.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Self-unregister after clearing caches
  self.registration.unregister();
});

// DO NOT add a fetch handler — let all requests pass through to the network normally
