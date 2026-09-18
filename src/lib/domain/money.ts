// Currency conversions use strings and BigInt, never float * 100.
// Percentages and chart coordinates are display-only floating-point calculations.
export const MAX_ITEM_PAISA = 9_000_000_000_000;
export function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));
}
export function parseMoney(value: string): number {
  const normalized = latinDigits(value).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("সঠিক পরিমাণ লিখুন (যেমন ৫০০ বা 500.50)।");
  }
  const [whole, fraction = ""] = normalized.replaceAll(",", "").split(".");
  const paisa = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paisa <= 0n || paisa > BigInt(MAX_ITEM_PAISA))
    throw new Error("পরিমাণ শূন্যের বেশি এবং অনুমোদিত সীমার মধ্যে হতে হবে।");
  return Number(paisa);
}
export function safePaisa(value: string | number | bigint): number {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new Error("Unsafe money value");
  const amount = BigInt(value);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < BigInt(Number.MIN_SAFE_INTEGER))
    throw new Error("Money total exceeds safe display range");
  return Number(amount);
}
export function sumPaisa(values: readonly number[]): number {
  return safePaisa(values.reduce((sum, value) => sum + BigInt(safePaisa(value)), 0n));
}
export function amountInput(paisa: number): string {
  const value = BigInt(safePaisa(paisa));
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const fraction = String(abs % 100n).padStart(2, "0");
  return `${sign}${abs / 100n}${fraction === "00" ? "" : `.${fraction}`}`;
}
export function money(paisa: number): string {
  const [whole, fraction] = amountInput(paisa).split(".");
  return `৳ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}
export function percentage(spent: number, limit: number): number | null {
  return limit === 0 ? null : (spent / limit) * 100;
}
