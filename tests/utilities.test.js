import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, localMonth, previousMonth } from '../src/utils/dates.js';
import { transactionPrintDocument } from '../src/utils/export.js';

test('date helpers preserve local midnight and handle month-end rollover', () => {
  const date = new Date(2026, 2, 31, 0, 5);
  assert.equal(localDate(date), '2026-03-31');
  assert.equal(previousMonth(date), '2026-02');
  assert.equal(localMonth(new Date(2026, 0, 1)), '2026-01');
  assert.equal(previousMonth(new Date(2026, 0, 1)), '2025-12');
});

test('PDF print document escapes user fields and supports deleted categories', () => {
  const html = transactionPrintDocument([{ date: '2026-10-01', type: 'expense', amount: 100, note: '<img src=x onerror=alert(1)>', category: null }]);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('1 transaksi'));
});
