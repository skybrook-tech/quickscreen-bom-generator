const APP_CACHE = "quickscreen-app-v1";
const MAP_CACHE = "quickscreen-maps-v1";
const MAP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const APP_SHELL = ["/", "/fence-calculator", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_CACHE, MAP_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isSupabaseRequest(url) {
  return url.hostname.includes("supabase.co") || url.pathname.includes("/functions/v1/");
}

function isStaticMapRequest(url) {
  return url.hostname === "maps.googleapis.com" && url.pathname.includes("/maps/api/staticmap");
}

async function cacheFirstMaps(request) {
  const cache = await caches.open(MAP_CACHE);
  const metadataRequest = new Request(`${request.url}__cached_at`);
  const cached = await cache.match(request);
  if (cached) {
    const metadata = await cache.match(metadataRequest);
    const cachedAt = metadata ? Number(await metadata.text()) : 0;
    if (Date.now() - cachedAt < MAP_MAX_AGE_MS) return cached;
    await cache.delete(request);
    await cache.delete(metadataRequest);
  }

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    await cache.put(metadataRequest, new Response(String(Date.now())));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return;

  if (isStaticMapRequest(url)) {
    event.respondWith(cacheFirstMaps(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
