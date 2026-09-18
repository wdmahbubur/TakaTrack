import { test, expect } from "@playwright/test";
import { login, sampleText } from "./helpers";
test("missing AI configuration leaves manual entry and reports usable", async ({ page }) => {
  test.skip(process.env.E2E_AI_UNAVAILABLE !== "1", "Run separately with GEMINI_API_KEY unset.");
  await login(page);
  await page.goto("/transactions/ai");
  await page.locator("#expense-text").fill(sampleText);
  await expect(page.getByRole("button", { name: "বিশ্লেষণ করুন", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "কথা বলে লিখুন" })).toBeDisabled();
  await expect(
    page.getByText("Gemini API key সেটআপ করা হয়নি। ম্যানুয়াল এন্ট্রি ব্যবহার করুন।").first(),
  ).toBeVisible();
  await page.goto("/transactions?month=2025-04");
  await page.getByRole("button", { name: "নতুন লেনদেন", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/reports?month=2025-04&tab=category");
  await expect(page.getByRole("heading", { name: "বিভাগ অনুযায়ী খরচ", exact: true })).toBeVisible();
});
