import { parseMoney } from "../domain/money.ts";
import { validDate, validMonth } from "../domain/dates.ts";
import type { Category, TransactionInput } from "../domain/types.ts";
export class ValidationError extends Error {
  readonly fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("তথ্য সঠিক নয়।");
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string, max: number, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max)
    throw new ValidationError(`${name}: ${min}–${max} অক্ষর লিখুন।`, { [name]: "সঠিক তথ্য লিখুন।" });
  return value.trim();
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    throw new ValidationError("অনুরোধের পরিচয় সঠিক নয়। পাতা রিফ্রেশ করুন।");
  return value;
}
export function email(value: unknown): string {
  const result = text(value, "ইমেইল", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ValidationError("সঠিক ইমেইল লিখুন।");
  return result;
}
export function password(value: unknown, isNew = true): string {
  if (typeof value !== "string" || value.length < (isNew ? 8 : 1) || value.length > 128)
    throw new ValidationError("পাসওয়ার্ড ৮–১২৮ অক্ষরের হতে হবে।");
  return value; // Never trim or otherwise transform passwords.
}
export function transactionInput(
  value: unknown,
  categories: Category[],
): TransactionInput & { amount_paisa: number } {
  const v = record(value);
  if (v.type !== "income" && v.type !== "expense")
    throw new ValidationError("আয় অথবা খরচ নির্বাচন করুন।");
  const category = categories.find((c) => c.id === v.category_id && c.type === v.type);
  if (!category) throw new ValidationError("সঠিক বিভাগ নির্বাচন করুন।");
  if (typeof v.occurred_on !== "string" || !validDate(v.occurred_on))
    throw new ValidationError("সঠিক তারিখ নির্বাচন করুন।");
  let amount_paisa: number;
  try {
    amount_paisa = parseMoney(text(v.amount, "পরিমাণ", 24));
  } catch (error) {
    throw new ValidationError(error instanceof Error ? error.message : "সঠিক পরিমাণ লিখুন।");
  }
  const method = v.input_method ?? "manual";
  if (!["manual", "ai_text", "ai_voice"].includes(String(method)))
    throw new ValidationError("ইনপুট পদ্ধতি সঠিক নয়।");
  return {
    type: v.type,
    title: text(v.title, "বিবরণ", 120),
    amount: v.amount as string,
    amount_paisa,
    category_id: category.id,
    occurred_on: v.occurred_on,
    note: text(v.note ?? "", "নোট", 500, 0),
    input_method: method as TransactionInput["input_method"],
    client_request_id: uuid(v.client_request_id),
  };
}
export function budgetInput(value: unknown, categories: Category[]) {
  const v = record(value);
  if (!categories.some((c) => c.id === v.category_id && c.type === "expense"))
    throw new ValidationError("খরচের বিভাগ নির্বাচন করুন।");
  if (typeof v.month !== "string" || !validMonth(v.month))
    throw new ValidationError("সঠিক মাস নির্বাচন করুন।");
  let limit_paisa: number;
  try {
    limit_paisa = parseMoney(text(v.limit, "বাজেট", 24));
  } catch {
    throw new ValidationError("সঠিক বাজেট লিখুন।");
  }
  return { category_id: String(v.category_id), month: `${v.month}-01`, limit_paisa };
}
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  // Fixed internal destinations avoid encoded open-redirect tricks.
  return typeof value === "string" &&
    ["/dashboard", "/transactions", "/budgets", "/reports", "/profile", "/reset-password"].includes(
      value,
    )
    ? value
    : fallback;
}
