import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const SHARE_CACHE = "ledger-share-target-v2";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "POST" || url.pathname !== "/share-target") {
    return;
  }

  event.respondWith(handleShare(event.request));
});

async function handleShare(request) {
  const shareId = crypto.randomUUID();

  let shareStatus = "no-file";
  let detectedType = "";
  let detectedName = "";
  let debug = {};

  try {
    const formData = await request.formData();

    const entries = [...formData.entries()];

    debug = {
      keys: entries.map(([key]) => key),
      values: entries.map(([key, value]) => ({
        key,
        kind: typeof value === "string" ? "text" : "file",
        type: typeof value === "string" ? "text/plain" : value?.type || "",
        name: typeof value === "string" ? "" : value?.name || "",
        size: typeof value === "string" ? value.length : value?.size || 0,
      })),
    };

    /*
     * Jangan hanya bergantung pada MIME.
     *
     * Beberapa aplikasi Android / m-banking mengirim file dengan:
     * application/octet-stream
     * MIME kosong
     * nama file tanpa extension
     */
    const candidates = entries
      .map(([, value]) => value)
      .filter(
        (value) =>
          typeof value !== "string" &&
          value &&
          typeof value.arrayBuffer === "function" &&
          value.size > 0,
      );

    const shared =
      candidates.find((value) =>
        String(value.type || "").startsWith("image/"),
      ) ||
      candidates.find((value) =>
        /\.(jpe?g|png|webp)$/i.test(value.name || ""),
      ) ||
      candidates[0];

    if (shared) {
      if (shared.size > MAX_FILE_SIZE) {
        shareStatus = "too-large";
      } else {
        detectedType = shared.type || "application/octet-stream";

        detectedName = shared.name || `shared-${Date.now()}`;

        const cache = await caches.open(SHARE_CACHE);

        await cache.put(
          `/__ledger_shared_file__/${shareId}`,
          new Response(shared, {
            headers: {
              "Content-Type": detectedType,
              "X-Ledger-Name": encodeURIComponent(detectedName),
              "X-Ledger-Created": String(Date.now()),
            },
          }),
        );

        await cache.put(
          `/__ledger_shared_meta__/${shareId}`,
          new Response(
            JSON.stringify({
              shareId,
              detectedType,
              detectedName,
              size: shared.size,
              debug,
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        );

        shareStatus = "received";
      }
    } else {
      const cache = await caches.open(SHARE_CACHE);

      await cache.put(
        `/__ledger_shared_meta__/${shareId}`,
        new Response(
          JSON.stringify({
            shareId,
            debug,
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );
    }
  } catch (error) {
    shareStatus = "error";

    try {
      const cache = await caches.open(SHARE_CACHE);

      await cache.put(
        `/__ledger_shared_meta__/${shareId}`,
        new Response(
          JSON.stringify({
            shareId,
            error: String(error),
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );
    } catch {
      // Jangan sampai debug menggagalkan redirect.
    }
  }

  const target = new URL("/scan", self.location.origin);

  target.search = new URLSearchParams({
    source: "share",
    shareId,
    shareStatus,
  }).toString();

  return Response.redirect(target.href, 303);
}
