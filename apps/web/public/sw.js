// Service worker: makes the app installable and lets it open instantly, even offline.
//
// Privacy: nothing under /api is ever cached. Balances and transactions always come straight
// from the server and never sit in the browser's cache storage; only the app's own code does.
const CACHE = 'finance-shell-v1'
const SHELL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch(SHELL)
      .then(refreshShell)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // API calls, the Google login redirect and CSV downloads always go straight to the server.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') event.respondWith(networkThenShell(event))
  else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheThenNetwork(request))
})

/** Pages: network first so a new deploy shows up at once; offline, the saved shell. */
async function networkThenShell(event) {
  try {
    const response = await fetch(event.request)
    event.waitUntil(refreshShell(response.clone()))
    return response
  } catch {
    return (await caches.match(SHELL)) ?? Response.error()
  }
}

/** Files in /assets are fingerprinted by Vite and never change, so a cached copy is always right. */
async function cacheThenNetwork(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) await (await caches.open(CACHE)).put(request, response.clone())
  return response
}

/**
 * Keeps the latest index.html plus exactly the assets it loads: fetches new ones ahead of time
 * (so the app works offline right after the first visit) and drops the ones from old deploys.
 */
async function refreshShell(response) {
  const isPage = response.headers.get('content-type')?.includes('text/html')
  if (!response.ok || response.redirected || !isPage) return

  const html = await response.clone().text()
  const cache = await caches.open(CACHE)
  await cache.put(SHELL, response)

  const used = new Set(Array.from(html.matchAll(/\/assets\/[^"'\s?#)]+/g), (match) => match[0]))
  const cached = new Set()
  for (const key of await cache.keys()) {
    const { pathname } = new URL(key.url)
    if (!pathname.startsWith('/assets/')) continue
    if (used.has(pathname)) cached.add(pathname)
    else await cache.delete(key)
  }
  await cache.addAll([...used].filter((path) => !cached.has(path)))
}
