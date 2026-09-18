import { test, expect } from "@playwright/test";
import { login, settle, previewAI, summaryPreview } from "./helpers";
const widths = [360, 390, 768, 1024, 1440, 1920];
const pages = [
  ["01-Landing", "/"],
  ["02-Registration", "/register"],
  ["03-Login", "/login"],
  ["04-Dashboard", "/dashboard?month=2025-04"],
  ["05-AI-Expense-Entry", "/transactions/ai"],
  ["06-Transactions", "/transactions?month=2025-04"],
  ["07-Budgets", "/budgets?month=2025-04"],
  ["08-Reports", "/reports?month=2025-04&tab=ai"],
] as const;
for (const width of widths)
  for (const [name, path] of pages) {
    test(`visual ${name} ${width}px`, async ({ page }, info) => {
      test.skip(
        process.env.TT_OFFLINE_UI !== "1" && !process.env.E2E_EMAIL,
        "An explicitly configured isolated test account is required.",
      );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const height = width < 768 ? 844 : Math.round((width * 1456) / 2048);
      await page.setViewportSize({ width, height });
      if (Number(name.slice(0, 2)) >= 4) await login(page);
      if (name.startsWith("05")) await previewAI(page);
      else if (name.startsWith("08")) await summaryPreview(page);
      else await page.goto(path);
      await settle(page);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(
        dimensions.scroll,
        `${name} must not scroll horizontally at ${width}px`,
      ).toBeLessThanOrEqual(dimensions.client + 1);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`${name}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await info.attach("rendered-page", {
        path: info.outputPath(`${name}-${width}.png`),
        contentType: "image/png",
      });
      if (width < 768 && Number(name.slice(0, 2)) >= 4) {
        await page.getByRole("button", { name: "নেভিগেশন খুলুন" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("dialog").getByRole("link", { name: "Budgets", exact: true }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    });
  }
