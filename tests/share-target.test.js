import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = (
  await readFile(new URL("../src/sw.js", import.meta.url), "utf8")
).replace(/^import .*;$/m, "");
function setup({ failOpen = false, failWrite = false } = {}) {
  const stored = new Map();
  let handler;
  vm.runInNewContext(source, {
    precacheAndRoute() {},
    cleanupOutdatedCaches() {},
    File,
    Blob,
    Request,
    Response,
    URL,
    URLSearchParams,
    crypto: webcrypto,
    console: { error() {} },
    caches: {
      open: async () => {
        if (failOpen) throw new Error("Storage unavailable");
        return {
          put: async (request, response) => {
            if (failWrite) throw new Error("Quota exceeded");
            const key = new URL(
              typeof request === "string" ? request : request.url,
              "https://ledger.test",
            ).pathname;
            stored.set(key, response);
          },
        };
      },
    },
    self: {
      location: { origin: "https://ledger.test" },
      addEventListener: (_, fn) => {
        handler = fn;
      },
    },
  });
  return {
    stored,
    async send(request) {
      let result;
      handler({
        request,
        respondWith: (value) => {
          result = value;
        },
      });
      return result;
    },
    async share(file, field = "files", text = "") {
      const form = new FormData();
      if (file) form.append(field, file);
      if (text) form.append("text", text);
      return this.send(
        new Request("https://ledger.test/share-target", {
          method: "POST",
          body: form,
        }),
      );
    },
  };
}

function target(response) {
  assert.equal(response.status, 303);
  const url = new URL(response.headers.get("Location"));
  assert.equal(url.pathname, "/scan");
  return {
    id: url.searchParams.get("shareId"),
    status: url.searchParams.get("shareStatus"),
  };
}

test("concurrent shares retain separate files and metadata", async () => {
  const sw = setup();
  const names = ["one.png", "two.png"];
  const responses = await Promise.all(
    names.map((name) =>
      sw.share(new File([name], name, { type: "image/png" })),
    ),
  );
  assert.equal(sw.stored.size, 4);
  for (const [index, response] of responses.entries()) {
    const { id, status } = target(response);
    assert.equal(status, "received");
    const file = sw.stored.get(`/__ledger_shared_file__/${id}`);
    assert.equal(await file.text(), names[index]);
    assert.equal(file.headers.get("Content-Type"), "image/png");
    const meta = await sw.stored.get(`/__ledger_shared_meta__/${id}`).json();
    assert.equal(meta.file.name, names[index]);
  }
});

test("unknown Android field and octet-stream files are preserved", async () => {
  const sw = setup();
  const { id, status } = target(
    await sw.share(
      new File(["image-bytes"], "receipt", {
        type: "application/octet-stream",
      }),
      "android-file",
    ),
  );
  assert.equal(status, "received");
  assert.equal(
    await sw.stored.get(`/__ledger_shared_file__/${id}`).text(),
    "image-bytes",
  );
});

test("text-only share cannot reuse a previous invoice or store private text", async () => {
  const sw = setup();
  await sw.share(new File(["invoice"], "invoice.png", { type: "image/png" }));
  const { id, status } = target(
    await sw.share(null, "files", "PRIVATE PAYMENT DETAILS"),
  );
  assert.equal(status, "no-file");
  assert.equal(sw.stored.has(`/__ledger_shared_file__/${id}`), false);
  assert.ok(
    !(await sw.stored.get(`/__ledger_shared_meta__/${id}`).text()).includes(
      "PRIVATE PAYMENT DETAILS",
    ),
  );
});

test("storage open or quota failure still redirects to a recoverable error page", async () => {
  for (const options of [{ failOpen: true }, { failWrite: true }]) {
    const sw = setup(options);
    assert.equal(
      target(await sw.share(new File(["invoice"], "image.png"))).status,
      "error",
    );
  }
});

test("malformed multipart request produces parse-error", async () => {
  const sw = setup();
  const response = await sw.send(
    new Request("https://ledger.test/share-target", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: "broken",
    }),
  );
  assert.equal(target(response).status, "parse-error");
});

test("oversized file is not cached", async () => {
  const sw = setup();
  const { id, status } = target(
    await sw.share(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png"),
    ),
  );
  assert.equal(status, "too-large");
  assert.equal(sw.stored.has(`/__ledger_shared_file__/${id}`), false);
});
