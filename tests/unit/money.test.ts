import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMoney,
  money,
  amountInput,
  sumPaisa,
  safePaisa,
  percentage,
  latinDigits,
  MAX_ITEM_PAISA,
} from "../../src/lib/domain/money.ts";
for (const [input, expected] of [
  ["৫০০", 50000],
  ["500", 50000],
  ["৫০০.৫০", 50050],
  ["1,234.01", 123401],
  ["0.01", 1],
  ["০০৭.১", 710],
  ["  600  ", 60000],
] as const) {
  test(`exact BDT conversion: ${input}`, () => assert.equal(parseMoney(input), expected));
}
for (const input of [
  "-1",
  "0",
  "0.00",
  "1.001",
  "1e3",
  "NaN",
  "Infinity",
  "5,00",
  "৳ 500",
  "",
  ".25",
]) {
  test(`invalid money rejected: ${JSON.stringify(input)}`, () =>
    assert.throws(() => parseMoney(input)));
}
test("integer arithmetic does not accumulate binary rounding", () =>
  assert.equal(sumPaisa(Array.from({ length: 1000 }, () => parseMoney("0.10"))), 10000));
test("amounts at supported limit are safe", () =>
  assert.equal(parseMoney("90000000000"), MAX_ITEM_PAISA));
test("individual amount overflow rejected", () =>
  assert.throws(() => parseMoney("90000000000.01")));
test("aggregate overflow rejected rather than rounded", () =>
  assert.throws(() => sumPaisa([Number.MAX_SAFE_INTEGER, 1])));
test("unsafe and fractional paisa values rejected", () => {
  assert.throws(() => safePaisa(1.1));
  assert.throws(() => safePaisa("9007199254740992"));
});
test("negative remaining amount formats exactly", () =>
  assert.equal(money(-123456), "৳ -1,234.56"));
test("integer currency does not add fake fractional zeros", () =>
  assert.equal(amountInput(2500000), "25000"));
test("zero denominator has no percentage", () => assert.equal(percentage(100, 0), null));
test("overspending preserves actual percentage", () => assert.equal(percentage(150, 100), 150));
test("Bengali digits normalize without changing words", () =>
  assert.equal(latinDigits("খরচ ১২৩.৪৫"), "খরচ 123.45"));
