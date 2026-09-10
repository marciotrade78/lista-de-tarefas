// Minimal service worker: exists only so the browser considers this app
// installable. It does not cache anything, so the app always loads fresh
// data and works exactly as it does without installation.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
