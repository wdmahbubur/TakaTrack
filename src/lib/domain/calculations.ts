import type { Budget, CategoryTotal, Snapshot, Transaction } from "./types.ts";
import { percentage, sumPaisa } from "./money.ts";
export function calculateTotals(
  transactions: Pick<Transaction, "type" | "amount_paisa" | "category_id">[],
) {
  const income = sumPaisa(
    transactions.filter((t) => t.type === "income").map((t) => t.amount_paisa),
  );
  const expenses = transactions.filter((t) => t.type === "expense");
  const expense = sumPaisa(expenses.map((t) => t.amount_paisa));
  const byCategory = new Map<string, number[]>();
  for (const t of expenses) {
    const group = byCategory.get(t.category_id) ?? [];
    group.push(t.amount_paisa);
    byCategory.set(t.category_id, group);
  }
  return {
    income,
    expense,
    remaining: sumPaisa([income, -expense]),
    count: transactions.length,
    categories: Array.from(byCategory, ([category_id, amounts]) => ({
      category_id,
      amount_paisa: sumPaisa(amounts),
    })),
  };
}
export function budgetFacts(budgets: Budget[], categories: CategoryTotal[]) {
  const spending = new Map(categories.map((c) => [c.category_id, c.amount_paisa]));
  const rows = budgets.map((budget) => {
    const spent = spending.get(budget.category_id) ?? 0;
    return {
      ...budget,
      spent,
      remaining: sumPaisa([budget.limit_paisa, -spent]),
      percent: percentage(spent, budget.limit_paisa) ?? 0,
      overspent: Math.max(0, spent - budget.limit_paisa),
    };
  });
  const ids = new Set(budgets.map((b) => b.category_id));
  const limit = sumPaisa(budgets.map((b) => b.limit_paisa));
  const spent = sumPaisa(rows.map((b) => b.spent));
  const unbudgeted = sumPaisa(
    categories.filter((c) => !ids.has(c.category_id)).map((c) => c.amount_paisa),
  );
  return {
    rows,
    limit,
    spent,
    remaining: sumPaisa([limit, -spent]),
    unbudgeted,
    percent: percentage(spent, limit),
    within: rows.filter((b) => !b.overspent).length,
    over: rows.filter((b) => b.overspent > 0).length,
  };
}
export function expenseChange(current: Snapshot, previous: Snapshot) {
  const difference = sumPaisa([current.expense, -previous.expense]);
  return {
    difference,
    percent: previous.expense > 0 ? (difference / previous.expense) * 100 : null,
    noPreviousRecords: previous.count === 0,
  };
}
