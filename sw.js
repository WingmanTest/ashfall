/* ASHFALL service worker. Registered with scope "./" so it stays under
   https://wingmantest.github.io/ashfall/ (or any subpath host). Bump CACHE
   when publishing so Home Screen installs pick up the new build. */
const CACHE = "ashfall-2026-11-24-r16.2";
const CODE_RE = /\.(html?|js|mjs|css|json|webmanifest)$/i;

function isCodeRequest(req, url) {
  if (req.mode === "navigate" || req.destination === "document") return true;
  if (req.destination === "script" || req.destination === "style") return true;
  const path = url.pathname;
  if (path.endsWith("/") || path.endsWith("/ashfall")) return true;
  return CODE_RE.test(path);
}

function bareRequest(req) {
  try {
    const u = new URL(req.url);
    u.search = "";
    u.hash = "";
    return new Request(u.href, { method: "GET", credentials: req.credentials, mode: req.mode === "navigate" ? "same-origin" : req.mode });
  } catch {
    return req;
  }
}

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

  // Do not intercept media. WebKit / iOS Safari audio elements fail with
  // "access control checks" when a service worker wraps the response.
  if (req.destination === "audio" || req.destination === "video" || /\.(m4a|mp3|ogg|wav|mp4|webm|aac|flac)$/i.test(url.pathname)) return;

  const code = isCodeRequest(req, url);
  event.respondWith((async () => {
    try {
      const res = await fetch(req, code ? { cache: "no-store" } : undefined);
      if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
        const cache = await caches.open(CACHE);
        cache.put(bareRequest(req), res.clone());
      }
      return res;
    } catch (err) {
      const cache = await caches.open(CACHE);
      const bare = bareRequest(req);
      const cached = await cache.match(bare) || await caches.match(bare, { ignoreSearch: true }) || await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      throw err;
    }
  })());
});
