// import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
// precacheAndRoute(self.__WB_MANIFEST);
// cleanupOutdatedCaches();

// self.addEventListener("fetch", (event) => {
//   const url = new URL(event.request.url);
//   if (event.request.method === "POST" && url.pathname === "/share-target") {
//     event.respondWith(
//       (async () => {
//         const shareId = crypto.randomUUID();
//         try {
//           const data = await event.request.formData();
//           const shared = data
//             .getAll("files")
//             .find((item) => item instanceof File && item.size > 0);
//           const cache = await caches.open("ledger-share-target-v1");
//           if (shared) {
//             await cache.put(
//               `/__ledger_shared_file__/${shareId}`,
//               new Response(shared, {
//                 headers: {
//                   "Content-Type": shared.type || "application/octet-stream",
//                   "X-Ledger-Name": encodeURIComponent(
//                     shared.name || "shared-file",
//                   ),
//                 },
//               }),
//             );
//           }
//         } catch (e) {
//           /* Smart Import will show fallback upload UI. */
//         }
//         return Response.redirect(new URL(`/scan?source=share&shareId=${shareId}`, self.location.origin).href, 303);
//       })(),
//     );
//   }
// });

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
          console.log("[Ledger Share Target] POST received", {
            url: event.request.url,
            contentType: event.request.headers.get("content-type"),
          });

          const data = await event.request.formData();

          // Log semua data yang dikirim oleh Android/Chrome
          const entries = [];

          for (const [key, value] of data.entries()) {
            if (value instanceof File) {
              entries.push({
                key,
                type: "File",
                name: value.name,
                mime: value.type,
                size: value.size,
              });
            } else {
              entries.push({
                key,
                type: "text",
                value: String(value).slice(0, 500),
              });
            }
          }

          console.log("[Ledger Share Target] FormData:", entries);

          // Utamakan field "files" sesuai manifest
          let shared = data
            .getAll("files")
            .find((item) => item instanceof File && item.size > 0);

          // Fallback:
          // kalau Android/Chrome ternyata memberi File
          // tetapi field-nya bukan "files", tetap coba ambil.
          if (!shared) {
            for (const [, value] of data.entries()) {
              if (
                value instanceof File &&
                value.size > 0 &&
                value.type.startsWith("image/")
              ) {
                shared = value;
                break;
              }
            }
          }

          const cache = await caches.open("ledger-share-target-v1");

          if (shared) {
            console.log("[Ledger Share Target] IMAGE RECEIVED", {
              name: shared.name,
              type: shared.type,
              size: shared.size,
            });

            await cache.put(
              `/__ledger_shared_file__/${shareId}`,
              new Response(shared, {
                headers: {
                  "Content-Type": shared.type || "application/octet-stream",

                  "X-Ledger-Name": encodeURIComponent(
                    shared.name || "shared-proof.jpg",
                  ),

                  "X-Ledger-Size": String(shared.size),
                },
              }),
            );

            console.log("[Ledger Share Target] IMAGE STORED", {
              shareId,
              cacheKey: `/__ledger_shared_file__/${shareId}`,
            });

            return Response.redirect(
              new URL(
                `/scan?source=share&shareId=${encodeURIComponent(
                  shareId,
                )}&shareStatus=received`,
                self.location.origin,
              ).href,
              303,
            );
          }

          console.warn("[Ledger Share Target] NO IMAGE FILE RECEIVED", {
            shareId,
            entries,
          });

          return Response.redirect(
            new URL(
              `/scan?source=share&shareId=${encodeURIComponent(
                shareId,
              )}&shareStatus=no-file`,
              self.location.origin,
            ).href,
            303,
          );
        } catch (e) {
          console.error("[Ledger Share Target] ERROR", e);

          return Response.redirect(
            new URL(
              `/scan?source=share&shareId=${encodeURIComponent(
                shareId,
              )}&shareStatus=error`,
              self.location.origin,
            ).href,
            303,
          );
        }
      })(),
    );
  }
});
