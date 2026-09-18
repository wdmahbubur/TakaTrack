import "server-only";
import { cache } from "react";
import { createHash } from "node:crypto";
import { verifiedSession } from "./auth";
import { dbError } from "./errors";
import { record, ValidationError } from "../validation/input";
import { safePaisa, sumPaisa } from "../domain/money";
import { monthEnd, comparisonPeriods, validDate, validMonth } from "../domain/dates";
import type { Budget, Snapshot } from "../domain/types";
export const getCategories = cache(async () => {
  const { db } = await verifiedSession();
  const { data, error } = await db.from("categories").select("*").order("sort_order");
  dbError(error);
  return data ?? [];
});
export const getProfile = cache(async () => {
  const { db, user } = await verifiedSession();
  const { data, error } = await db.from("profiles").select("*").eq("id", user.id).single();
  dbError(error);
  return { profile: data, email: user.email ?? "" };
});
export async function getSnapshot(month: string, through?: string): Promise<Snapshot> {
  const { db } = await verifiedSession();
  if (!validMonth(month))
    return {
      income: 0,
      expense: 0,
      remaining: 0,
      count: 0,
      categories: [],
      budgets: [],
      revision: "outside-window",
    };
  const { data, error } = await db.rpc("month_snapshot", {
    p_month: `${month}-01`,
    ...(through ? { p_through: through } : {}),
  });
  dbError(error);
  const raw = record(data);
  const income = safePaisa(String(raw.income));
  const expense = safePaisa(String(raw.expense));
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((c: unknown) => {
        const row = record(c);
        return {
          category_id: String(row.category_id),
          amount_paisa: safePaisa(String(row.amount_paisa)),
        };
      })
    : [];
  const budgets = ((raw.budgets ?? []) as Budget[]).map((b) => ({
    ...b,
    limit_paisa: safePaisa(b.limit_paisa),
  }));
  return {
    income,
    expense,
    remaining: sumPaisa([income, -expense]),
    count: Number(raw.count),
    categories,
    budgets,
    revision: String(raw.revision),
  };
}
export type SearchParams = Record<string, string | string[] | undefined>;
export function single(params: SearchParams, key: string): string {
  const v = params[key];
  return typeof v === "string" ? v : "";
}
export async function listTransactions(month: string, params: SearchParams = {}, pageSize = 8) {
  const { db, user } = await verifiedSession();
  const requestedPage = Math.max(
    1,
    Math.min(1_000_000, Number.parseInt(single(params, "page"), 10) || 1),
  );
  const title = single(params, "q").trim().slice(0, 120);
  const type = single(params, "type");
  const category = single(params, "category");
  const from = validDate(single(params, "from")) ? single(params, "from") : `${month}-01`;
  const to = validDate(single(params, "to")) ? single(params, "to") : monthEnd(month);
  if (from > to) throw new ValidationError("শেষ তারিখ শুরুর তারিখের আগে হতে পারে না।");
  const sort = single(params, "sort") || "date-desc";
  const ascending = sort.endsWith("asc");
  const column = sort.startsWith("amount") ? "amount_paisa" : "occurred_on";
  const query = () => {
    let q = db
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .gte("occurred_on", from)
      .lte("occurred_on", to);
    if (title) q = q.ilike("title", `%${title.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    if (type === "income" || type === "expense") q = q.eq("type", type);
    if (category) q = q.eq("category_id", category);
    return q
      .order(column, { ascending })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  };
  let result = await query().range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  dbError(result.error);
  const count = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(requestedPage, pages);
  if (page !== requestedPage) {
    result = await query().range((page - 1) * pageSize, page * pageSize - 1);
    dbError(result.error);
  }
  return { transactions: result.data ?? [], count, page, pages, pageSize };
}
export async function getReport(month: string) {
  const periods = comparisonPeriods(month);
  const [current, previous, categories] = await Promise.all([
    getSnapshot(month, periods.currentThrough),
    getSnapshot(periods.previous, periods.previousThrough),
    getCategories(),
  ]);
  const version = createHash("sha256")
    .update(JSON.stringify({ current, previous, periods }))
    .digest("hex");
  return { current, previous, categories, periods, version };
}
