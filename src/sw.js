import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

/*
|--------------------------------------------------------------------------
| Workbox
|--------------------------------------------------------------------------
*/

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/*
|--------------------------------------------------------------------------
| Share Target Configuration
|--------------------------------------------------------------------------
*/

const SHARE_CACHE = "ledger-share-target-v3";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/*
|--------------------------------------------------------------------------
| Fetch Handler
|--------------------------------------------------------------------------
|
| Android Web Share Target akan melakukan:
|
| POST /share-target
| Content-Type: multipart/form-data
|
*/

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShare(event.request));
  }
});

/*
|--------------------------------------------------------------------------
| Handle Android Share
|--------------------------------------------------------------------------
*/

async function handleShare(request) {
  const shareId = createShareId();

  const cache = await caches.open(SHARE_CACHE);

  let shareStatus = "no-file";

  /*
  |--------------------------------------------------------------------------
  | Debug information
  |--------------------------------------------------------------------------
  |
  | Jangan simpan isi gambar/raw body.
  | Kita hanya menyimpan metadata untuk diagnosis.
  |
  */

  const debug = {
    method: request.method,
    url: request.url,

    contentType: request.headers.get("content-type") || "",

    contentLength: request.headers.get("content-length") || "",

    rawByteLength: 0,

    keys: [],
    values: [],
  };

  try {
    /*
    |--------------------------------------------------------------------------
    | Clone request
    |--------------------------------------------------------------------------
    |
    | Body Request adalah stream dan hanya dapat dibaca satu kali.
    |
    | Clone pertama:
    | → mengetahui apakah Android benar-benar mengirim body.
    |
    | Clone kedua:
    | → parsing multipart/form-data.
    |
    */

    const rawRequest = request.clone();
    const formRequest = request.clone();

    /*
    |--------------------------------------------------------------------------
    | Inspect raw request size
    |--------------------------------------------------------------------------
    */

    try {
      const rawBuffer = await rawRequest.arrayBuffer();

      debug.rawByteLength = rawBuffer.byteLength;
    } catch (error) {
      debug.rawReadError = error?.message || String(error);
    }

    /*
    |--------------------------------------------------------------------------
    | Parse multipart/form-data
    |--------------------------------------------------------------------------
    */

    let formData;

    try {
      formData = await formRequest.formData();
    } catch (error) {
      debug.formDataError = error?.message || String(error);

      shareStatus = "parse-error";

      await saveMeta(cache, shareId, {
        shareId,
        shareStatus,
        debug,
      });

      return redirectToScan(shareId, shareStatus);
    }

    /*
    |--------------------------------------------------------------------------
    | Read FormData entries
    |--------------------------------------------------------------------------
    */

    const entries = [];

    for (const [key, value] of formData.entries()) {
      entries.push([key, value]);

      debug.keys.push(key);

      /*
       * Text field
       */
      if (typeof value === "string") {
        debug.values.push({
          key,
          kind: "text",
          type: "text/plain",
          size: value.length,

          /*
           * Jangan simpan isi lengkap.
           * Cukup sedikit preview untuk debugging.
           */
          preview: value.slice(0, 100),
        });

        continue;
      }

      /*
       * File / Blob field
       */
      debug.values.push({
        key,
        kind: "file",

        name: value?.name || "",

        type: value?.type || "",

        size: value?.size || 0,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find shared file
    |--------------------------------------------------------------------------
    |
    | Prioritas:
    |
    | 1. field "files"
    | 2. image file dari field mana pun
    | 3. file/blob pertama yang memiliki data
    |
    */

    let shared = formData.get("files");

    /*
     * Jika "files" tidak ditemukan atau
     * ternyata berupa string.
     */

    if (!isUsableFile(shared)) {
      shared = entries
        .map(([, value]) => value)
        .find(
          (value) =>
            isUsableFile(value) &&
            String(value.type || "").startsWith("image/"),
        );
    }

    /*
     * Fallback:
     * ambil File/Blob pertama.
     */

    if (!isUsableFile(shared)) {
      shared = entries
        .map(([, value]) => value)
        .find((value) => isUsableFile(value));
    }

    /*
    |--------------------------------------------------------------------------
    | No file received
    |--------------------------------------------------------------------------
    */

    if (!isUsableFile(shared)) {
      shareStatus = "no-file";

      await saveMeta(cache, shareId, {
        shareId,
        shareStatus,
        debug,
      });

      return redirectToScan(shareId, shareStatus);
    }

    /*
    |--------------------------------------------------------------------------
    | Validate size
    |--------------------------------------------------------------------------
    */

    if (shared.size > MAX_FILE_SIZE) {
      shareStatus = "too-large";

      await saveMeta(cache, shareId, {
        shareId,
        shareStatus,
        debug,
      });

      return redirectToScan(shareId, shareStatus);
    }

    /*
    |--------------------------------------------------------------------------
    | File metadata
    |--------------------------------------------------------------------------
    */

    const originalName = shared.name || `shared-${Date.now()}`;

    const originalType = shared.type || "application/octet-stream";

    /*
    |--------------------------------------------------------------------------
    | Copy file bytes
    |--------------------------------------------------------------------------
    |
    | Kita ubah File/Blob menjadi ArrayBuffer terlebih dahulu.
    |
    | Tujuannya supaya data yang disimpan ke Cache Storage
    | tidak bergantung pada lifetime stream request.
    |
    */

    const buffer = await shared.arrayBuffer();

    /*
    |--------------------------------------------------------------------------
    | Validate actual buffer
    |--------------------------------------------------------------------------
    */

    if (buffer.byteLength === 0) {
      shareStatus = "empty-file";

      await saveMeta(cache, shareId, {
        shareId,
        shareStatus,
        debug,
      });

      return redirectToScan(shareId, shareStatus);
    }

    /*
    |--------------------------------------------------------------------------
    | Store shared file
    |--------------------------------------------------------------------------
    */

    const fileRequest = new Request(`/__ledger_shared_file__/${shareId}`);

    const fileResponse = new Response(buffer, {
      headers: {
        "Content-Type": originalType,

        "X-Ledger-Name": encodeURIComponent(originalName),

        "X-Ledger-Size": String(buffer.byteLength),

        "X-Ledger-Created": String(Date.now()),
      },
    });

    await cache.put(fileRequest, fileResponse);

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    shareStatus = "received";

    await saveMeta(cache, shareId, {
      shareId,

      shareStatus,

      file: {
        name: originalName,

        type: originalType,

        size: buffer.byteLength,
      },

      debug,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Unexpected error
    |--------------------------------------------------------------------------
    */

    shareStatus = "error";

    debug.error = error?.message || String(error);

    try {
      await saveMeta(cache, shareId, {
        shareId,
        shareStatus,
        debug,
      });
    } catch (metaError) {
      console.error("[Ledger Share] Failed to save error metadata:", metaError);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Redirect to Smart Capture
  |--------------------------------------------------------------------------
  */

  return redirectToScan(shareId, shareStatus);
}

/*
|--------------------------------------------------------------------------
| Check File / Blob
|--------------------------------------------------------------------------
*/

function isUsableFile(value) {
  return (
    value &&
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number" &&
    value.size > 0
  );
}

/*
|--------------------------------------------------------------------------
| Save Metadata
|--------------------------------------------------------------------------
*/

async function saveMeta(cache, shareId, data) {
  try {
    const request = new Request(`/__ledger_shared_meta__/${shareId}`);

    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    await cache.put(request, response);
  } catch (error) {
    console.error("[Ledger Share] Failed saving metadata:", error);
  }
}

/*
|--------------------------------------------------------------------------
| Redirect
|--------------------------------------------------------------------------
*/

function redirectToScan(shareId, shareStatus) {
  const target = new URL("/scan", self.location.origin);

  target.searchParams.set("source", "share");

  target.searchParams.set("shareId", shareId);

  target.searchParams.set("shareStatus", shareStatus);

  return Response.redirect(target.toString(), 303);
}

/*
|--------------------------------------------------------------------------
| Share ID
|--------------------------------------------------------------------------
*/

function createShareId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [Date.now(), Math.random().toString(36).slice(2)].join("-");
}
