import type { Category, Draft, Snapshot, SummaryResult } from "../domain/types.ts";
import { money, parseMoney } from "../domain/money.ts";
import { resolveDraftDate } from "../domain/dates.ts";
import { budgetFacts, expenseChange } from "../domain/calculations.ts";
import { validateExtraction, validateSummary, validateTranscript } from "./schemas.ts";
import type { SummaryFact } from "./contracts.ts";
export function normalizeDrafts(
  output: unknown,
  categories: Category[],
  today: string,
  method: "ai_text" | "ai_voice",
  makeId: () => string,
): Draft[] {
  return validateExtraction(output).entries.map((entry) => {
    const issues: string[] = [];
    let amount = "";
    if (entry.amount !== null) {
      try {
        parseMoney(entry.amount);
        amount = entry.amount;
      } catch {
        issues.push("পরিমাণ ঠিক করুন।");
      }
    } else issues.push("পরিমাণ লিখুন।");
    const category = categories.find((c) => c.type === "expense" && c.id === entry.category_id);
    if (!category) issues.push("বিভাগ নির্বাচন করুন।");
    const date = resolveDraftDate(entry.date, today);
    if (date.invalid) issues.push("তারিখ ঠিক করুন।");
    if (!entry.title?.trim()) issues.push("বিবরণ লিখুন।");
    if (entry.issue) issues.push(entry.issue);
    return {
      key: makeId(),
      title: entry.title ?? "",
      amount,
      category_id: category?.id ?? "",
      occurred_on: date.date,
      selected: true,
      date_defaulted: date.defaulted,
      issue: issues.length ? issues.join(" ") : null,
      input_method: method,
    };
  });
}
export function editableTranscript(output: unknown): string {
  const result = validateTranscript(output);
  if (result.noSpeech || !result.transcript.trim()) throw new Error("NO_SPEECH");
  return result.transcript;
}
export function makeSummaryFacts(
  current: Snapshot,
  previous: Snapshot,
  categories: Category[],
  periodLabel: string,
): SummaryFact[] {
  const change = expenseChange(current, previous),
    budget = budgetFacts(current.budgets, current.categories);
  const facts: SummaryFact[] = [
    {
      id: "overview",
      heading: "এই মাসের নথিভুক্ত হিসাব",
      body: `মোট আয় ${money(current.income)}, মোট খরচ ${money(current.expense)}। আয় থেকে খরচ বাদ দিলে অবশিষ্ট ${money(current.remaining)}। এটি ব্যাংক ব্যালেন্স নয়।`,
    },
  ];
  const comparison =
    previous.count === 0
      ? "আগের তুলনামূলক সময়ে কোনো লেনদেন নেই, তাই শতকরা পরিবর্তন দেখানো হয়নি।"
      : previous.expense === 0
        ? `আগের সময়ে খরচ ছিল শূন্য। এখন খরচ ${money(current.expense)}; শূন্য ভিত্তি থেকে শতকরা পরিবর্তন নির্ণয় করা যায় না।`
        : change.difference === 0
          ? `আগের সময়ে খরচ ${money(previous.expense)}। খরচ অপরিবর্তিত রয়েছে (০% পরিবর্তন)।`
          : `আগের সময়ে খরচ ${money(previous.expense)}। এখন ${money(Math.abs(change.difference))} ${change.difference < 0 ? "কম" : "বেশি"}; পরিবর্তন ${Math.abs(change.percent ?? 0).toFixed(1)}%।`;
  facts.push({ id: "comparison", heading: "দুই সময়ের তুলনা", body: `${periodLabel}। ${comparison}` });
  const top = [...current.categories].sort((a, b) => b.amount_paisa - a.amount_paisa)[0];
  if (top && current.expense > 0) {
    const name = categories.find((c) => c.id === top.category_id)?.name_bn ?? "অন্যান্য";
    facts.push({
      id: "top-category",
      heading: `সবচেয়ে বেশি খরচ ${name} বিভাগে`,
      body: `${name} খাতে খরচ হয়েছে ${money(top.amount_paisa)}। এটি মোট খরচের ${((top.amount_paisa / current.expense) * 100).toFixed(0)}%।`,
    });
  }
  for (const b of budget.rows.filter((r) => r.overspent > 0)) {
    const name = categories.find((c) => c.id === b.category_id)?.name_bn ?? b.category_id;
    facts.push({
      id: `overrun-${b.category_id}`,
      heading: `${name} বিভাগের বাজেট ছাড়িয়েছে`,
      body: `বাজেট ছিল ${money(b.limit_paisa)}। খরচ হয়েছে ${money(b.spent)} — নির্ধারিত সীমার চেয়ে ${money(b.overspent)} বেশি।`,
    });
  }
  if (budget.unbudgeted > 0)
    facts.push({
      id: "unbudgeted",
      heading: "বাজেটবিহীন বিভাগেও খরচ আছে",
      body: `বাজেট নির্ধারণ করা হয়নি এমন বিভাগে মোট ${money(budget.unbudgeted)} খরচ হয়েছে। এই খরচ বাজেট ব্যবহারের শতাংশে অন্তর্ভুক্ত নয়।`,
    });
  return facts;
}
export function renderSummary(
  output: unknown,
  facts: SummaryFact[],
  version: string,
): SummaryResult {
  const plan = validateSummary(
    output,
    facts.map((f) => f.id),
  );
  // Critical facts and every overrun cannot be suppressed by provider selection.
  const ids = [
    ...new Set([
      "overview",
      "comparison",
      ...facts.filter((f) => f.id.startsWith("overrun-")).map((f) => f.id),
      ...plan.factIds,
    ]),
  ];
  const closing: Record<string, string> = {
    "review-categories": "পরের মাসের বাজেট নির্ধারণের আগে বিভাগভিত্তিক খরচগুলো দেখে নিন।",
    "review-overruns": "সীমা ছাড়ানো বিভাগের খরচ দেখে পরের মাসের বাজেট ঠিক করুন।",
    "keep-recording": "নিয়মিত আয় ও খরচ লিখে রাখলে আপনার হিসাব আরও পরিষ্কার হবে।",
  };
  const hasOverrun = facts.some((f) => f.id.startsWith("overrun-"));
  const closingId = hasOverrun
    ? "review-overruns"
    : plan.closing === "review-overruns"
      ? "review-categories"
      : plan.closing;
  return {
    version,
    sections: ids.flatMap((id) => {
      const fact = facts.find((f) => f.id === id);
      return fact ? [fact] : [];
    }),
    closing: closing[closingId],
  };
}
