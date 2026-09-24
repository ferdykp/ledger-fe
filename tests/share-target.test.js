import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = (await readFile(new URL('../src/sw.js', import.meta.url), 'utf8'))
  .replace(/^import .*;$/m, '');
function setup() {
  const stored = new Map();
  let handler;
  vm.runInNewContext(source, {
    precacheAndRoute() {}, cleanupOutdatedCaches() {},
    File, Response, URL, crypto: webcrypto,
    caches: { open: async () => ({ put: async (key, response) => stored.set(key, response) }) },
    self: { location: { origin: 'https://ledger.test' }, addEventListener: (_, fn) => { handler = fn; } },
  });
  return {
    stored,
    async share(file) {
      const form = new FormData();
      if (file) form.append('files', file);
      let result;
      handler({ request: { method: 'POST', url: 'https://ledger.test/share-target', formData: async () => form }, respondWith: (r) => { result = r; } });
      return await result;
    },
  };
}

test('concurrent shares keep independent file payloads and redirect to matching IDs', async () => {
  const sw = setup();
  const responses = await Promise.all(['one.png', 'two.png'].map(name => sw.share(new File([name], name, { type: 'image/png' }))));
  assert.equal(sw.stored.size, 2);
  for (const [i, response] of responses.entries()) {
    assert.equal(response.status, 303);
    const url = new URL(response.headers.get('Location'));
    assert.equal(url.pathname, '/scan');
    const cached = sw.stored.get(`/__ledger_shared_file__/${url.searchParams.get('shareId')}`);
    assert.equal(await cached.text(), ['one.png', 'two.png'][i]);
    assert.equal(cached.headers.get('Content-Type'), 'image/png');
  }
});

test('text-only share cannot accidentally reuse a previous invoice', async () => {
  const sw = setup();
  await sw.share(new File(['invoice'], 'invoice.png', { type: 'image/png' }));
  const response = await sw.share();
  const id = new URL(response.headers.get('Location')).searchParams.get('shareId');
  assert.equal(sw.stored.has(`/__ledger_shared_file__/${id}`), false);
});
