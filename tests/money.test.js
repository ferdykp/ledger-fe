import test from "node:test";
import assert from "node:assert/strict";
import { formatRupiah, normalizeMoneyInput } from "../src/utils/formatters.js";
import { transactionPrintDocument } from "../src/utils/export.js";

test("rupiah uses Rp, Indonesian grouping, and preserves cents and signs", () => {
  for (const [input, expected] of [
    [0, "Rp 0"],
    [1250000, "Rp 1.250.000"],
    ["1250000.50", "Rp 1.250.000,5"],
    ["9007199254740993.01", "Rp 9.007.199.254.740.993,01"],
    ["999.999999", "Rp 1.000"],
    [-35000, "-Rp 35.000"],
    [null, "Rp 0"],
    [NaN, "Rp 0"],
    [Infinity, "Rp 0"],
  ]) {
    assert.equal(formatRupiah(input), expected);
  }
});
test("money input groups digits without changing the amount sent to the API", () => {
  assert.deepEqual(normalizeMoneyInput("Rp 1.250.000,50"), {
    display: "1.250.000,50",
    value: "1250000.50",
  });
  assert.deepEqual(normalizeMoneyInput("50000,"), {
    display: "50.000,",
    value: "50000",
  });
  assert.deepEqual(normalizeMoneyInput("-1200,25", true), {
    display: "-1.200,25",
    value: "-1200.25",
  });
  assert.deepEqual(normalizeMoneyInput(""), { display: "", value: "" });
});
test("print document uses the same Rupiah format", () => {
  assert.match(
    transactionPrintDocument([{ amount: "1250000.25" }]),
    /Rp 1\.250\.000,25/,
  );
});
