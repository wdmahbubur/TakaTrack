export const TIME_ZONE = "Asia/Dhaka";
export function todayDhaka(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2100-12-31")
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function validMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && validDate(`${value}-01`);
}
export function monthOrCurrent(value?: string, now = new Date()): string {
  return value && validMonth(value) ? value : todayDhaka(now).slice(0, 7);
}
export function addDays(date: string, days: number): string {
  if (!validDate(date)) throw new Error("Invalid calendar date");
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function previousMonth(month: string): string {
  if (!validMonth(month)) throw new Error("Invalid month");
  return addDays(`${month}-01`, -1).slice(0, 7);
}
export function monthEnd(month: string): string {
  // Internal comparison may include December 1899 (before the supported data window).
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0, 12)).toISOString().slice(0, 10);
}
export function monthLabel(month: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(`${month}-01T12:00:00Z`));
}
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(`${date}T12:00:00Z`));
}
export function resolveDraftDate(
  value: string | null,
  today: string,
): { date: string; defaulted: boolean; invalid: boolean } {
  if (value === null || value.trim() === "")
    return { date: today, defaulted: true, invalid: false };
  const relative = value.toLowerCase().trim();
  if (["today", "আজ"].includes(relative)) return { date: today, defaulted: false, invalid: false };
  if (["yesterday", "গতকাল"].includes(relative))
    return { date: addDays(today, -1), defaulted: false, invalid: false };
  return {
    date: validDate(relative) ? relative : "",
    defaulted: false,
    invalid: !validDate(relative),
  };
}
export function comparisonPeriods(month: string, now = new Date()) {
  const today = todayDhaka(now);
  const previous = previousMonth(month);
  const partial = month === today.slice(0, 7) && today !== monthEnd(month);
  const currentThrough = partial ? today : monthEnd(month);
  const previousThrough = partial
    ? `${previous}-${String(Math.min(Number(today.slice(-2)), Number(monthEnd(previous).slice(-2)))).padStart(2, "0")}`
    : monthEnd(previous);
  return {
    month,
    previous,
    currentThrough,
    previousThrough,
    partial,
    label: partial
      ? `${shortDate(`${month}-01`)} – ${shortDate(currentThrough)} বনাম ${shortDate(`${previous}-01`)} – ${shortDate(previousThrough)} (একই দিনসংখ্যা; ছোট মাসে শেষ দিন পর্যন্ত)`
      : `${monthLabel(month)} বনাম ${monthLabel(previous)} — নির্বাচিত দুই মাসের নথিভুক্ত হিসাব`,
  };
}
