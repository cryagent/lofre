const CACHE_PREFIX = "lofre";
const APP_CACHE = `${CACHE_PREFIX}-app`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;
const VERSION_CACHE = `${CACHE_PREFIX}-version`;
const VERSION_URL = "/version.json";
const APP_SHELL = [
  "/",
  "/index.html",
  VERSION_URL,
  "/favicon.svg",
  "/site.webmanifest",
  "/social-preview.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

async function fetchFreshVersion() {
  const response = await fetch(VERSION_URL, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch app version.");
  }

  return response;
}

async function getVersionValue(response) {
  try {
    const versionInfo = await response.clone().json();
    return typeof versionInfo.version === "string" ? versionInfo.version : null;
  } catch {
    return null;
  }
}

async function getCachedVersionValue() {
  const cachedVersion = await caches.match(VERSION_URL, {
    cacheName: VERSION_CACHE,
  });

  if (!cachedVersion) {
    return null;
  }

  return getVersionValue(cachedVersion);
}

async function cacheVersion(response) {
  const cache = await caches.open(VERSION_CACHE);
  await cache.put(VERSION_URL, response.clone());
}

async function clearContentCaches() {
  await Promise.all([caches.delete(APP_CACHE), caches.delete(RUNTIME_CACHE)]);
}

async function shouldBypassCacheForVersion() {
  try {
    const [freshVersionResponse, cachedVersion] = await Promise.all([
      fetchFreshVersion(),
      getCachedVersionValue(),
    ]);
    const freshVersion = await getVersionValue(freshVersionResponse);

    await cacheVersion(freshVersionResponse);

    if (!freshVersion || !cachedVersion || freshVersion === cachedVersion) {
      return false;
    }

    await clearContentCaches();
    return true;
  } catch {
    return false;
  }
}

async function putInCache(cacheName, request, response) {
  if (!response.ok) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)),
      fetchFreshVersion()
        .then(cacheVersion)
        .catch(() => {}),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => ![APP_CACHE, RUNTIME_CACHE, VERSION_CACHE].includes(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname === VERSION_URL) {
    event.respondWith(
      fetchFreshVersion()
        .then((response) => {
          cacheVersion(response);
          return response;
        })
        .catch(() => caches.match(VERSION_URL, { cacheName: VERSION_CACHE })),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      shouldBypassCacheForVersion()
        .then(() =>
          fetch(request).then((response) => {
            putInCache(APP_CACHE, "/index.html", response);
            return response;
          }),
        )
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    shouldBypassCacheForVersion().then((bypassCache) => {
      const networkResponse = fetch(request).then((response) => {
        putInCache(RUNTIME_CACHE, request, response);
        return response;
      });

      if (bypassCache) {
        return networkResponse;
      }

      return caches
        .match(request)
        .then((cachedResponse) => cachedResponse ?? networkResponse)
        .catch(() => networkResponse);
    }),
  );
});
