import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const SHARE_CACHE = "ledger-share-target-v3";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  const shareId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const cache = await caches.open(SHARE_CACHE);

  let shareStatus = "no-file";

  const debug = {
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type") || "",
    contentLength: request.headers.get("content-length") || "",
    keys: [],
    values: [],
  };

  try {
    /*
     * Clone request sebelum dibaca.
     *
     * Ini penting karena Request body merupakan stream
     * dan hanya boleh dikonsumsi satu kali.
     */
    const clonedRequest = request.clone();

    const formData = await clonedRequest.formData();

    const entries = [];

    for (const [key, value] of formData.entries()) {
      entries.push([key, value]);

      debug.keys.push(key);

      if (typeof value === "string") {
        debug.values.push({
          key,
          kind: "text",
          type: "text/plain",
          size: value.length,
          preview: value.slice(0, 200),
        });
      } else {
        debug.values.push({
          key,
          kind: "file",
          name: value.name || "",
          type: value.type || "",
          size: value.size || 0,
        });
      }
    }

    /*
     * Prioritas field "files" sesuai manifest.
     */
    let shared = formData.get("files");

    /*
     * Jika browser memakai field berbeda,
     * cari Blob/File pertama.
     */
    if (!shared || typeof shared === "string" || !shared.size) {
      shared = entries
        .map(([, value]) => value)
        .find(
          (value) =>
            typeof value !== "string" &&
            value &&
            typeof value.arrayBuffer === "function" &&
            value.size > 0,
        );
    }

    if (shared && typeof shared !== "string") {
      if (shared.size > MAX_FILE_SIZE) {
        shareStatus = "too-large";
      } else if (shared.size > 0) {
        const originalName = shared.name || `shared-${Date.now()}`;

        const originalType = shared.type || "application/octet-stream";

        /*
         * Salin bytes terlebih dahulu.
         *
         * Jangan simpan File stream secara langsung.
         */
        const buffer = await shared.arrayBuffer();

        await cache.put(
          new Request(`/__ledger_shared_file__/${shareId}`),
          new Response(buffer, {
            headers: {
              "Content-Type": originalType,
              "X-Ledger-Name": encodeURIComponent(originalName),
              "X-Ledger-Size": String(shared.size),
              "X-Ledger-Created": String(Date.now()),
            },
          }),
        );

        shareStatus = "received";
      }
    }

    await saveMeta(cache, shareId, {
      shareId,
      shareStatus,
      debug,
    });
  } catch (error) {
    shareStatus = "error";

    debug.error = error?.message || String(error);

    await saveMeta(cache, shareId, {
      shareId,
      shareStatus,
      debug,
    });
  }

  const target = new URL("/scan", self.location.origin);

  target.searchParams.set("source", "share");

  target.searchParams.set("shareId", shareId);

  target.searchParams.set("shareStatus", shareStatus);

  return Response.redirect(target.toString(), 303);
}

async function saveMeta(cache, shareId, data) {
  try {
    await cache.put(
      new Request(`/__ledger_shared_meta__/${shareId}`),
      new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  } catch (error) {
    console.error("Failed saving share metadata:", error);
  }
}
