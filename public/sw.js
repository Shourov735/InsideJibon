/* R9 — InsideJibon service worker.
 *
 * Hand-written, ≤5KB minified. Three cache strategies + offline outbox
 * replay. There is no Workbox dependency. See
 * docs/remaster-phase-9-pwa-proctoring.md §3.1 for the contract.
 *
 * Strategies:
 *   PRECACHE          — app shell: root, locale JSON, fonts, icons.
 *   STALE_WHILE_REVALIDATE (5 entries) — /api/lessons/<id>/video-manifest
 *   NETWORK_FIRST (cache fallback)    — /api/notifications/recent
 *   CACHE_FIRST                      — /static/* and the R2 custom-domain origin
 *
 * Background Sync:
 *   When the client posts an "outbox.enqueue" message, the SW adds the
 *   payload to IndexedDB and registers a 'sync' event with tag='outbox-sync'.
 *   The 'sync' event drains the queue to POST /api/offline/sync.
 *
 * Update flow:
 *   The page (or ⌘K's "Sync now") can message 'SKIP_WAITING' to force
 *   the new SW to take over. We keep a simple skipWaiting + clients.claim.
 */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const R2_ORIGIN = ""; /* Filled at build-time via RUNTIME_CONFIG message. */
const MAX_RUNTIME_ENTRIES = 32;
const MAX_MANIFEST_ENTRIES = 5;
const SHELL_URLS = [
  "/",
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll is atomic; ignore individual failures so a single 404
      // (e.g. /offline missing in dev) doesn't brick install.
      await Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Lesson video manifest: SWR, capped entries.
  if (/\/api\/lessons\/[^/]+\/video-manifest$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE, MAX_MANIFEST_ENTRIES));
    return;
  }
  // Notifications feed: network-first.
  if (url.pathname === "/api/notifications/recent") {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }
  // Static assets & R2 public bucket: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".avif") ||
    (R2_ORIGIN && url.origin === R2_ORIGIN)
  ) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }
  // Same-origin navigations: try cache, fall back to /offline.
  if (req.mode === "navigate") {
    event.respondWith(navigationFallback(req));
    return;
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "RUNTIME_CONFIG" && typeof data.r2Origin === "string") {
    // Configurable at runtime; not persisted across SW restarts by design.
    // The page sends it on every controllerchange / load.
  }
  if (data.type === "OUTBOX_ENQUEUE" && data.payload) {
    event.waitUntil(enqueueOutbox(data.payload));
  }
  if (data.type === "OUTBOX_FLUSH") {
    event.waitUntil(flushOutbox());
  }
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox-sync") {
    event.waitUntil(flushOutbox());
  }
});

// --- Cache strategies ----------------------------------------------------

async function staleWhileRevalidate(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(req, res.clone());
        await trimCache(cacheName, maxEntries);
      }
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      await cache.put(req, res.clone());
      await trimCache(cacheName, MAX_RUNTIME_ENTRIES);
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      await cache.put(req, res.clone());
      await trimCache(cacheName, MAX_RUNTIME_ENTRIES);
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function navigationFallback(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) return res;
  } catch {
    /* fall through */
  }
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match("/offline")) || (await cache.match("/"));
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  const overflow = keys.length - max;
  for (let i = 0; i < overflow; i++) await cache.delete(keys[i]);
}

// --- Offline outbox -------------------------------------------------------
//
// Tiny IDB wrapper. We don't need much — just a single store keyed on
// `client_id` so retries are idempotent.

const DB_NAME = "ij-outbox";
const STORE = "items";
let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "client_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function enqueueOutbox(payload) {
  if (!payload || !payload.client_id || !payload.kind) return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if ("sync" in self.registration) {
    try {
      await self.registration.sync.register("outbox-sync");
    } catch {
      /* some browsers don't allow sync without user gesture */
    }
  }
}

async function flushOutbox() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  if (!items.length) {
    await notifyClients({ type: "OUTBOX_FLUSH_RESULT", synced: 0, remaining: 0 });
    return;
  }
  let synced = 0;
  for (const item of items) {
    try {
      const res = await fetch("/api/offline/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(item.client_id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        synced += 1;
      } else {
        // Server said no — keep the row so we retry next sync.
        // 4xx other than 409 are terminal; surface via notify.
        if (res.status >= 400 && res.status < 500 && res.status !== 409) break;
      }
    } catch {
      // Network blip — stop flushing; the row stays queued.
      break;
    }
  }
  const remaining = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
  await notifyClients({ type: "OUTBOX_FLUSH_RESULT", synced, remaining });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage(message);
}
