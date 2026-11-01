import test from "node:test";
import assert from "node:assert/strict";
import { addDecimal, compareDecimal, divideDecimal, multiplyDecimal } from "../src/utils/decimal.js";

test("decimal helpers preserve currency precision for large account values", () => {
  assert.equal(addDecimal("9999999999999.99", "0.01"), "10000000000000.00");
  assert.equal(multiplyDecimal("2.5000", "1250000.00", 4, 2, 2), "3125000.00");
});

test("quantity calculations round half up at the requested precision", () => {
  assert.equal(divideDecimal("1000000.00", "2450000.00000000", 2, 8, 8), "0.40816327");
  assert.equal(multiplyDecimal("0.12345678", "2450000.00000000", 8, 8, 2), "302469.11");
});

test("decimal comparisons stay exact beyond JavaScript safe integer range", () => {
  assert.equal(compareDecimal("9007199254740993.01", "9007199254740993.00"), 1);
  assert.equal(compareDecimal("0.00000001", "0.00000000", 8), 1);
});
