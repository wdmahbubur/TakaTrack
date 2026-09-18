import test from "node:test";
import assert from "node:assert/strict";
import {
  todayDhaka,
  validDate,
  validMonth,
  monthOrCurrent,
  previousMonth,
  monthEnd,
  resolveDraftDate,
  comparisonPeriods,
} from "../../src/lib/domain/dates.ts";
test("Dhaka switches date six hours before UTC midnight", () => {
  assert.equal(todayDhaka(new Date("2026-09-17T17:59:59Z")), "2026-09-17");
  assert.equal(todayDhaka(new Date("2026-09-17T18:00:00Z")), "2026-09-18");
});
test("leap days are real calendar dates", () => {
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validDate("2025-04-31"), false);
});
test("invalid dates and months rejected", () => {
  for (const date of ["2025-13-01", "2025-1-1", "2101-01-01", "1899-12-31", "not a date"])
    assert.equal(validDate(date), false);
  assert.equal(validMonth("2025-04"), true);
  assert.equal(validMonth("2025-00"), false);
});
test("real accounts default to current Dhaka month", () =>
  assert.equal(monthOrCurrent(undefined, new Date("2026-01-31T19:00:00Z")), "2026-02"));
test("previous month crosses year boundary", () =>
  assert.equal(previousMonth("2026-01"), "2025-12"));
test("month end handles leap year and short months", () => {
  assert.equal(monthEnd("2024-02"), "2024-02-29");
  assert.equal(monthEnd("2025-04"), "2025-04-30");
});
test("omitted dates have an explicit visible default marker", () =>
  assert.deepEqual(resolveDraftDate(null, "2026-09-18"), {
    date: "2026-09-18",
    defaulted: true,
    invalid: false,
  }));
test("relative dates use supplied Dhaka context", () => {
  assert.equal(resolveDraftDate("yesterday", "2026-01-01").date, "2025-12-31");
  assert.equal(resolveDraftDate("গতকাল", "2026-03-01").date, "2026-02-28");
  assert.equal(resolveDraftDate("আজ", "2026-09-18").defaulted, false);
});
test("ambiguous explicit date is not silently made today", () =>
  assert.deepEqual(resolveDraftDate("unclear", "2026-09-18"), {
    date: "",
    defaulted: false,
    invalid: true,
  }));
test("current incomplete month compares matching date windows", () => {
  const p = comparisonPeriods("2026-09", new Date("2026-09-17T19:00:00Z"));
  assert.equal(p.partial, true);
  assert.equal(p.currentThrough, "2026-09-18");
  assert.equal(p.previousThrough, "2026-08-18");
});
test("short previous month comparison is clamped and labelled", () => {
  const p = comparisonPeriods("2025-03", new Date("2025-03-30T08:00:00Z"));
  assert.equal(p.previousThrough, "2025-02-28");
  assert.ok(p.label.includes("ছোট মাস"));
});
test("historical complete month uses full periods", () => {
  const p = comparisonPeriods("2025-04", new Date("2026-09-18"));
  assert.equal(p.partial, false);
  assert.equal(p.currentThrough, "2025-04-30");
  assert.equal(p.previousThrough, "2025-03-31");
});
