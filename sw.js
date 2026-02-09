/* sw.js — Gestión Viaje Estudios
   Estrategia:
   - HTML (navegación): network-first (si hay red, trae lo último)
   - Estáticos: cache-first
   - Fuerza activación rápida con skipWaiting + clientsClaim
*/

const APP_VERSION = "2026-02-09-02"; // 🔥 CAMBIA ESTO en cada deploy
const CACHE_NAME = `gesalumno2-cache-${APP_VERSION}`;

// Ajusta esta lista a tus ficheros reales.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",

  // ✅ Icons en RAÍZ (según tu carpeta)
  "./icon-192.png",
  "./icon-512.png"
];

// Instala y precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: "reload" })));
      self.skipWaiting();
    })()
  );
});

// Activa: limpia caches antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("gesalumno2-cache-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Permite forzar actualización desde la página si quieres:
// navigator.serviceWorker.controller?.postMessage({type:"SKIP_WAITING"})
self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo mismo origen (evita cachear CDNs como chart.js)
  if (url.origin !== self.location.origin) return;

  // Navegación / HTML -> Network First
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Estáticos -> Cache First
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    const fallback = await cache.match("./index.html");
    if (fallback) return fallback;
    throw e;
  }
}