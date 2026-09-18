import { expect, type Page } from "@playwright/test";
import { demoSnapshot, demoCategories } from "../../src/lib/domain/demo";
import { makeSummaryFacts, renderSummary } from "../../src/lib/ai/core";
export const offline = process.env.TT_OFFLINE_UI === "1";
export const credentials = {
  email: process.env.E2E_EMAIL || "visual@takatrack.test",
  password: process.env.E2E_PASSWORD || "FixturePassword!2026",
};
export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("ইমেইল", { exact: true }).fill(credentials.email);
  await page.locator("input[name=password]").fill(credentials.password);
  await page.getByRole("button", { name: "লগ ইন করুন", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
export async function settle(page: Page) {
  // Wait for actual font loading + two layout frames, not an arbitrary chart timeout.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
}
export const sampleText = "আজ বাজারে ৫০০ টাকা, রিকশায় ৬০ টাকা আর দুপুরের খাবারে ১৫০ টাকা খরচ হয়েছে।";
export function sampleDrafts() {
  return [
    { title: "বাজার", amount: "500", category_id: "groceries" },
    { title: "রিকশা ভাড়া", amount: "60", category_id: "transport" },
    { title: "দুপুরের খাবার", amount: "150", category_id: "food" },
  ].map((v, i) => ({
    ...v,
    key: `a0000000-0000-4000-8000-00000000000${i}`,
    occurred_on: "2025-04-21",
    selected: true,
    date_defaulted: false,
    issue: null,
    input_method: "ai_text",
  }));
}
export async function previewAI(page: Page) {
  await page.route("**/api/ai/extract", (route) =>
    route.fulfill({ json: { drafts: sampleDrafts() } }),
  );
  await page.goto("/transactions/ai");
  await page.locator("#expense-text").fill(sampleText);
  await page.getByRole("button", { name: "বিশ্লেষণ করুন", exact: true }).click();
  await expect(page.locator(".draft-total")).toContainText("710");
}
export async function summaryPreview(page: Page) {
  await page.goto("/reports?month=2025-04&tab=ai");
  // The server-rendered version is a hash, not user data or a credential.
  const version = await page.locator("[data-report-version]").getAttribute("data-report-version");
  const facts = makeSummaryFacts(
    demoSnapshot(),
    demoSnapshot("2025-03"),
    demoCategories,
    "April 2025 বনাম March 2025",
  );
  const summary = renderSummary(
    { factIds: ["top-category"], closing: "review-categories" },
    facts,
    version || "",
  );
  await page.route("**/api/ai/summary", (route) => route.fulfill({ json: summary }));
  await page.getByRole("button", { name: /সারাংশ তৈরি করুন/ }).click();
  await expect(page.locator(".summary-sections")).toBeVisible();
}
