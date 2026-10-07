import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  event.respondWith((async () => {
    const shareId = crypto.randomUUID();
    let shareStatus = "no-file";
    try {
      const data = await event.request.formData();
      const files = [...data.values()];
      const shared = files.find(value => value instanceof File && value.size > 0 &&
        (["image/jpeg", "image/png", "image/webp"].includes(value.type) || /\.(jpe?g|png|webp)$/i.test(value.name)));
      if (shared && shared.size <= 10 * 1024 * 1024) {
        const cache = await caches.open("ledger-share-target-v1");
        await cache.put(`/__ledger_shared_file__/${shareId}`, new Response(shared, {
          headers: { "Content-Type": shared.type || "application/octet-stream", "X-Ledger-Name": encodeURIComponent(shared.name), "X-Ledger-Created": String(Date.now()) },
        }));
        shareStatus = "received";
      } else if (shared) {
        shareStatus = "too-large";
      }
    } catch {
      shareStatus = "error";
    }
    const target = new URL("/scan", self.location.origin);
    target.search = new URLSearchParams({ source: "share", shareId, shareStatus }).toString();
    return Response.redirect(target.href, 303);
  })());
});
