import test from "node:test";
import assert from "node:assert/strict";
import {
  demoTransactions,
  demoBudgets,
  demoSnapshot,
  demoCategories,
} from "../../src/lib/domain/demo.ts";
import { calculateTotals, budgetFacts, expenseChange } from "../../src/lib/domain/calculations.ts";
import {
  transactionInput,
  budgetInput,
  safeNext,
  password,
} from "../../src/lib/validation/input.ts";
test("optional demo matches all reference totals from actual rows", () => {
  const snapshot = demoSnapshot();
  assert.equal(snapshot.count, 42);
  assert.equal(snapshot.income, 2500000);
  assert.equal(snapshot.expense, 1840000);
  assert.equal(snapshot.remaining, 660000);
  assert.deepEqual(
    Object.fromEntries(snapshot.categories.map((c) => [c.category_id, c.amount_paisa])),
    {
      groceries: 460000,
      transport: 276000,
      food: 644000,
      bills: 184000,
      entertainment: 184000,
      "other-expense": 92000,
    },
  );
});
test("reference budget calculations and contained progress", () => {
  const b = budgetFacts(demoBudgets(), demoSnapshot().categories);
  assert.equal(b.limit, 2300000);
  assert.equal(b.spent, 1840000);
  assert.equal(b.remaining, 460000);
  assert.equal(b.percent, 80);
  assert.equal(b.over, 1);
  assert.equal(b.within, 5);
  const entertainment = b.rows.find((r) => r.category_id === "entertainment");
  assert.equal(entertainment?.overspent, 34000);
  assert.ok((entertainment?.percent ?? 0) > 100);
});
test("unbudgeted spending is not mixed into budget utilization", () => {
  const b = budgetFacts(
    demoBudgets().filter((b) => b.category_id === "food"),
    demoSnapshot().categories,
  );
  assert.equal(b.spent, 644000);
  assert.equal(b.unbudgeted, 1196000);
  assert.equal(b.percent, 92);
});
test("empty budgets avoid divide by zero", () => {
  const b = budgetFacts([], demoSnapshot().categories);
  assert.equal(b.percent, null);
  assert.equal(b.unbudgeted, 1840000);
});
test("totals use complete records, not first page", () => {
  const all = demoTransactions().filter((t) => t.occurred_on.startsWith("2025-04"));
  assert.equal(calculateTotals(all).expense, 1840000);
  assert.notEqual(calculateTotals(all.slice(0, 8)).expense, 1840000);
});
test("income minus expense can be negative", () =>
  assert.equal(
    calculateTotals([{ type: "expense", amount_paisa: 900, category_id: "food" }]).remaining,
    -900,
  ));
test("comparison decrease matches reference", () => {
  const change = expenseChange(demoSnapshot(), demoSnapshot("2025-03"));
  assert.equal(change.difference, -220000);
  assert.equal(Number(Math.abs(change.percent ?? 0).toFixed(1)), 10.7);
});
test("missing previous data differs from zero-spending previous data", () => {
  const noData = { ...demoSnapshot(), count: 0, expense: 0 };
  assert.equal(expenseChange(demoSnapshot(), noData).noPreviousRecords, true);
  assert.equal(expenseChange(demoSnapshot(), { ...noData, count: 1 }).noPreviousRecords, false);
  assert.equal(expenseChange(demoSnapshot(), noData).percent, null);
});
const input = {
  type: "expense",
  title: "বাজার",
  amount: "৫০০",
  category_id: "groceries",
  occurred_on: "2025-04-21",
  note: "",
  input_method: "manual",
  client_request_id: "11111111-1111-4111-8111-111111111111",
};
test("transaction validation derives safe paisa and ignores submitted identity", () => {
  const valid = transactionInput({ ...input, user_id: "attacker" }, demoCategories);
  assert.equal(valid.amount_paisa, 50000);
  assert.equal("user_id" in valid, false);
});
test("category type must match transaction type", () =>
  assert.throws(() => transactionInput({ ...input, category_id: "salary" }, demoCategories)));
test("unknown category cannot be inserted", () =>
  assert.throws(() => transactionInput({ ...input, category_id: "invented" }, demoCategories)));
test("invalid required date and title are rejected", () => {
  assert.throws(() => transactionInput({ ...input, occurred_on: "2025-02-30" }, demoCategories));
  assert.throws(() => transactionInput({ ...input, title: " " }, demoCategories));
});
test("budgets must use expense category and calendar month", () => {
  assert.throws(() =>
    budgetInput({ category_id: "salary", month: "2025-04", limit: "500" }, demoCategories),
  );
  assert.throws(() =>
    budgetInput({ category_id: "food", month: "2025-13", limit: "500" }, demoCategories),
  );
  assert.equal(
    budgetInput({ category_id: "food", month: "2025-04", limit: "500" }, demoCategories)
      .limit_paisa,
    50000,
  );
});
test("return URLs cannot redirect to external origins", () => {
  for (const value of ["//evil.test", "https://evil.test", "/\\evil.test", "/%2f%2fevil.test"])
    assert.equal(safeNext(value), "/dashboard");
  assert.equal(safeNext("/reset-password"), "/reset-password");
});
test("passwords are never trimmed", () => {
  assert.equal(password("  long pass  "), "  long pass  ");
  assert.throws(() => password("short"));
});
