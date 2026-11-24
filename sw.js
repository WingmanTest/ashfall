/* ASHFALL service worker. Registered with scope "./" so it stays under
   https://wingmantest.github.io/ashfall/ (or any subpath host). Bump CACHE
   when publishing so Home Screen installs pick up the new build. */
const CACHE = "ashfall-2026-11-23-r3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("ashfall-") && k !== CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
