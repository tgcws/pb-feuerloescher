const CACHE_VERSION = 'feuerloescher-v23-hersteller-2026-06-08';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  '../../vendor/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName.startsWith('feuerloescher-') && cacheName !== CACHE_VERSION)
        .map(cacheName => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);

  if(request.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith((async () => {
      try{
        const networkResponse = await fetch(request, {cache:'no-store'});
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', networkResponse.clone());
        return networkResponse;
      }catch(error){
        return (await caches.match('./index.html', {ignoreSearch:true})) || caches.match('./', {ignoreSearch:true});
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request, {ignoreSearch:true});
    const networkPromise = fetch(request).then(networkResponse => {
      if(networkResponse && networkResponse.ok){
        caches.open(CACHE_VERSION).then(cache => cache.put(request, networkResponse.clone()));
      }
      return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || networkPromise;
  })());
});
