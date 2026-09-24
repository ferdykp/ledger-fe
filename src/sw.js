import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        const shareId = crypto.randomUUID();
        try {
          const data = await event.request.formData();
          const shared = data
            .getAll("files")
            .find((item) => item instanceof File && item.size > 0);
          const cache = await caches.open("ledger-share-target-v1");
          if (shared) {
            await cache.put(
              `/__ledger_shared_file__/${shareId}`,
              new Response(shared, {
                headers: {
                  "Content-Type": shared.type || "application/octet-stream",
                  "X-Ledger-Name": encodeURIComponent(
                    shared.name || "shared-file",
                  ),
                },
              }),
            );
          }
        } catch (e) {
          /* Smart Import will show fallback upload UI. */
        }
        return Response.redirect(new URL(`/scan?source=share&shareId=${shareId}`, self.location.origin).href, 303);
      })(),
    );
  }
});
