import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const data = await event.request.formData();
        const shared = data.getAll('files').find((item) => item instanceof File && item.size > 0);
        const meta = { title: data.get('title') || '', text: data.get('text') || '', url: data.get('url') || '' };
        const cache = await caches.open('ledger-share-target-v1');
        if (shared) {
          await cache.put('/__ledger_shared_file__', new Response(shared, { headers: { 'Content-Type': shared.type || 'application/octet-stream', 'X-Ledger-Name': encodeURIComponent(shared.name || 'shared-file') } }));
        }
        await cache.put('/__ledger_shared_meta__', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
      } catch (e) { /* Smart Import will show fallback upload UI. */ }
      return Response.redirect('/scan?source=share', 303);
    })());
  }
});
