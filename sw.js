const STATIC_CACHE = "cuaderno-static-v3";
const API_CACHE = "cuaderno-api-v2";
const API_ORIGIN = "https://jsonplaceholder.typicode.com";
const APP_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const appKeys = keys.filter((key) => key.startsWith("cuaderno-static-") || key.startsWith("cuaderno-api-"));
        return Promise.all(
          appKeys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === API_ORIGIN) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstApp(request));
  }
});

function respondWithCachedFallback(cache, request, response) {
  if (!response || response.ok) return response;

  return cache.match(request).then((cachedResponse) => {
    if (!cachedResponse) return response;

    const headers = new Headers(cachedResponse.headers);
    headers.set("X-Cuaderno-Offline", "true");
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers
    });
  });
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.error("No se pudo guardar la respuesta de la API en caché:", error);
      }
      return response;
    }

    return respondWithCachedFallback(cache, request, response);
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set("X-Cuaderno-Offline", "true");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }
    throw error;
  }
}

async function cacheFirstApp(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;
  return fetch(request);
}
