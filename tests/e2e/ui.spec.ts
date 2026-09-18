import { test, expect } from "@playwright/test";
import { login, previewAI, offline, sampleText, sampleDrafts } from "./helpers";
test.beforeEach(async () => {
  test.skip(!offline && !process.env.E2E_EMAIL, "Configure isolated E2E users first.");
});
test("landing navigation, login visibility toggle, Google unavailable, protected routes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Log In", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const password = page.locator("input[name=password]");
  await password.fill("example-password");
  await page.getByRole("button", { name: "পাসওয়ার্ড দেখান" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: /Google দিয়ে/ })).toBeDisabled();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
test("manual create/edit/delete, dialog focus, filtering and stable pagination", async ({
  page,
}) => {
  await login(page);
  await page.goto("/transactions?month=2025-04");
  await expect(page.locator(".pagination")).toContainText("42");
  await page.getByRole("button", { name: "পরের পাতা" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.goto("/transactions?month=2025-04");
  await page.getByRole("combobox", { name: "লেনদেনের ধরন" }).selectOption("income");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/transactions?month=2026-01");
  const title = `UI test ${Date.now()}`;
  await page.getByRole("button", { name: "নতুন লেনদেন", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("[name=title]").fill(title);
  await dialog.locator("[name=amount]").fill("১২৩.৪৫");
  await dialog.locator("[name=occurred_on]").fill("2026-01-12");
  await dialog.locator("[name=category_id]").selectOption("food");
  await dialog.getByRole("button", { name: "সেভ করুন", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText(title);
  await page.getByRole("button", { name: `${title} সম্পাদনা`, exact: true }).click();
  await dialog.locator("[name=amount]").fill("150.01");
  await dialog.getByRole("button", { name: "সেভ করুন", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("150.01");
  await page.getByRole("button", { name: `${title} মুছুন`, exact: true }).click();
  await dialog.getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন", exact: true }).click();
  await expect(page.getByRole("button", { name: `${title} সম্পাদনা`, exact: true })).toHaveCount(0);
});
test("AI drafts require explicit confirmation; editing, selection and removal use application totals", async ({
  page,
}) => {
  await login(page);
  let writes = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/transactions")) writes++;
  });
  await previewAI(page);
  expect(writes).toBe(0);
  await page.getByRole("checkbox", { name: "রিকশা ভাড়া নির্বাচন", exact: true }).uncheck();
  await expect(page.locator(".draft-total")).toContainText("650");
  await page.getByRole("button", { name: "বাজার খসড়া সম্পাদনা" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("[name=amount]").fill("600");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "খসড়া আপডেট করুন" }).click();
  await expect(page.locator(".draft-total")).toContainText("750");
  await page.getByRole("button", { name: "দুপুরের খাবার খসড়া মুছুন" }).click();
  await expect(page.locator(".draft-total")).toContainText("600");
  expect(writes).toBe(0);
  // Network-boundary assertion: capture a double click without changing demo records.
  await page.route("**/api/transactions", async (route) => {
    expect(route.request().postDataJSON().confirmed).toBe(true);
    await new Promise((r) => setTimeout(r, 200));
    await route.fulfill({ json: { ids: ["test-id"] } });
  });
  await page.getByRole("button", { name: "নিশ্চিত করে সেভ করুন" }).dblclick();
  await expect(page.locator(".saved-panel")).toBeVisible();
  expect(writes).toBe(1);
});
test("voice permission denial leaves typed entry available", async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied by test", "NotAllowedError");
      },
    });
  });
  await login(page);
  await page.goto("/transactions/ai");
  await page.getByRole("button", { name: "কথা বলে লিখুন" }).click();
  await expect(page.getByRole("alert")).toContainText("মাইক্রোফোনের অনুমতি");
  await page.locator("#expense-text").fill(sampleText);
  await expect(page.getByRole("button", { name: "বিশ্লেষণ করুন", exact: true })).toBeEnabled();
});
test("transcription is editable before extraction, recorder stops its tracks, and failed uploads can retry", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as unknown as { stoppedTracks: number }).stoppedTracks = 0;
    navigator.mediaDevices.getUserMedia = async (c) => {
      const stream = await original(c);
      stream.getTracks().forEach((t) => {
        const stop = t.stop.bind(t);
        t.stop = () => {
          (window as unknown as { stoppedTracks: number }).stoppedTracks++;
          stop();
        };
      });
      return stream;
    };
  });
  await login(page);
  await page.goto("/transactions/ai");
  let attempts = 0,
    extracts = 0;
  await page.route("**/api/ai/transcribe", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 502, json: { error: { message: "Test upload failure" } } })
      : route.fulfill({ json: { transcript: "বাজার ৪০০ টাকা" } });
  });
  await page.route("**/api/ai/extract", (route) => {
    extracts++;
    expect(route.request().postDataJSON().text).toBe("বাজার ৫০০ টাকা");
    return route.fulfill({ json: { drafts: sampleDrafts().slice(0, 1) } });
  });
  await page.getByRole("button", { name: "কথা বলে লিখুন" }).click();
  await expect(page.getByRole("button", { name: "থামান", exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "থামান", exact: true }).click();
  await expect(page.locator("audio")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "পাঠিয়ে লেখায় রূপান্তর করুন" }).click();
  await expect(page.getByRole("alert")).toContainText("Test upload failure");
  await page.getByRole("button", { name: "পাঠিয়ে লেখায় রূপান্তর করুন" }).click();
  await expect(page.locator("#expense-text")).toHaveValue("বাজার ৪০০ টাকা");
  expect(extracts).toBe(0);
  await page.locator("#expense-text").fill("বাজার ৫০০ টাকা");
  await page.getByRole("button", { name: "বিশ্লেষণ করুন", exact: true }).click();
  await expect(page.locator(".draft-total")).toContainText("500");
  expect(extracts).toBe(1);
});
test("logout removes access to private pages", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
});
