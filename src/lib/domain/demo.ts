// Explicit demonstration data only. Never seeded by registration or application startup.
import type { Budget, Category, Snapshot, Transaction } from "./types.ts";
import { calculateTotals } from "./calculations.ts";
export const DEMO_MONTH = "2025-04";
export const demoCategories: Category[] = [
  {
    id: "food",
    name_bn: "খাবার",
    name_en: "Food",
    type: "expense",
    icon: "utensils",
    color: "amber",
    sort_order: 1,
  },
  {
    id: "groceries",
    name_bn: "বাজার",
    name_en: "Groceries",
    type: "expense",
    icon: "cart",
    color: "green",
    sort_order: 2,
  },
  {
    id: "transport",
    name_bn: "যাতায়াত",
    name_en: "Transport",
    type: "expense",
    icon: "bus",
    color: "blue",
    sort_order: 3,
  },
  {
    id: "bills",
    name_bn: "বিল",
    name_en: "Bills",
    type: "expense",
    icon: "receipt",
    color: "rose",
    sort_order: 4,
  },
  {
    id: "entertainment",
    name_bn: "বিনোদন",
    name_en: "Entertainment",
    type: "expense",
    icon: "gamepad",
    color: "purple",
    sort_order: 5,
  },
  {
    id: "other-expense",
    name_bn: "অন্যান্য",
    name_en: "Other expenses",
    type: "expense",
    icon: "more",
    color: "slate",
    sort_order: 6,
  },
  {
    id: "salary",
    name_bn: "বেতন",
    name_en: "Salary",
    type: "income",
    icon: "income",
    color: "green",
    sort_order: 7,
  },
  {
    id: "freelance",
    name_bn: "ফ্রিল্যান্স",
    name_en: "Freelance",
    type: "income",
    icon: "briefcase",
    color: "blue",
    sort_order: 8,
  },
  {
    id: "other-income",
    name_bn: "অন্যান্য আয়",
    name_en: "Other income",
    type: "income",
    icon: "income",
    color: "green",
    sort_order: 9,
  },
];
export const demoId = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function demoTransactions(userId = demoId(0)): Transaction[] {
  let index = 1;
  function entry(
    title: string,
    amount_paisa: number,
    category_id: string,
    occurred_on: string,
    created_at: string,
    type: "income" | "expense" = "expense",
  ): Transaction {
    const id = demoId(index++);
    return {
      id,
      user_id: userId,
      type,
      title,
      amount_paisa,
      category_id,
      occurred_on,
      note: null,
      input_method: "manual",
      client_request_id: id,
      created_at,
      updated_at: created_at,
    };
  }
  const transactions = [
    entry("বাজার", 50000, "groceries", "2025-04-21", "2025-04-21T12:00:00.000Z"),
    entry("রিকশা ভাড়া", 6000, "transport", "2025-04-21", "2025-04-21T11:00:00.000Z"),
    entry("দুপুরের খাবার", 15000, "food", "2025-04-21", "2025-04-21T10:00:00.000Z"),
    entry("বিদ্যুৎ বিল", 120000, "bills", "2025-04-20", "2025-04-20T10:00:00.000Z"),
    entry("সাপ্তাহিক বাজার", 110000, "groceries", "2025-04-19", "2025-04-19T10:00:00.000Z"),
    entry("সিনেমার টিকিট", 45000, "entertainment", "2025-04-18", "2025-04-18T10:00:00.000Z"),
    entry("বাস ভাড়া", 12000, "transport", "2025-04-17", "2025-04-17T10:00:00.000Z"),
    entry("এপ্রিলের বেতন", 2500000, "salary", "2025-04-01", "2025-04-01T12:00:00.000Z", "income"),
  ];
  // 34 older expenses + seven recent expenses + salary = 42 April records.
  const older: Record<string, number[]> = {
    food: [80000, 80000, 80000, 80000, 80000, 80000, 80000, 69000],
    groceries: [40000, 40000, 40000, 40000, 40000, 40000, 60000],
    transport: [43000, 43000, 43000, 43000, 43000, 43000],
    bills: [20000, 20000, 24000],
    entertainment: [25000, 25000, 25000, 25000, 39000],
    "other-expense": [18000, 18000, 18000, 18000, 20000],
  };
  for (const [category, amounts] of Object.entries(older))
    for (const [i, amount] of amounts.entries())
      transactions.push(
        entry(
          `${demoCategories.find((c) => c.id === category)?.name_bn} — ${i + 1}`,
          amount,
          category,
          "2025-04-01",
          `2025-04-01T01:${String(index).padStart(2, "0")}:00.000Z`,
        ),
      );
  for (const [category, amount] of Object.entries({
    food: 720000,
    groceries: 530000,
    transport: 310000,
    bills: 200000,
    entertainment: 180000,
    "other-expense": 120000,
  }))
    transactions.push(
      entry(
        `মার্চের ${demoCategories.find((c) => c.id === category)?.name_bn}`,
        amount,
        category,
        "2025-03-15",
        "2025-03-15T10:00:00.000Z",
      ),
    );
  transactions.push(
    entry("মার্চের বেতন", 2500000, "salary", "2025-03-01", "2025-03-01T10:00:00.000Z", "income"),
  );
  return transactions;
}
export function demoBudgets(userId = demoId(0)): Budget[] {
  return Object.entries({
    food: 700000,
    groceries: 600000,
    transport: 350000,
    bills: 300000,
    entertainment: 150000,
    "other-expense": 200000,
  }).map(([category_id, limit_paisa], i) => ({
    id: demoId(100 + i),
    user_id: userId,
    category_id,
    category_type: "expense",
    month: "2025-04-01",
    limit_paisa,
    created_at: "2025-04-01T00:00:00.000Z",
    updated_at: "2025-04-01T00:00:00.000Z",
  }));
}
export function demoSnapshot(month = DEMO_MONTH): Snapshot {
  return {
    ...calculateTotals(demoTransactions().filter((t) => t.occurred_on.startsWith(month))),
    budgets: demoBudgets().filter((b) => b.month.startsWith(month)),
    revision: `demo-${month}`,
  };
}
