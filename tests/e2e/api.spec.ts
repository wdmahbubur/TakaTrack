import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const origin = process.env.E2E_BASE_URL || "http://localhost:3000";
const configured = Boolean(
  process.env.TEST_USER_A_EMAIL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
);
const post = (data: unknown) => ({ data, headers: { Origin: origin } });
async function signin(request: APIRequestContext) {
  const r = await request.post(
    "/api/auth/login",
    post({
      email: process.env.TEST_USER_A_EMAIL,
      password: process.env.TEST_USER_A_PASSWORD,
      remember: true,
    }),
  );
  expect(r.ok(), await r.text()).toBeTruthy();
}
test.beforeEach(() => {
  test.skip(!configured, "Requires real disposable local Supabase, not the offline fixture.");
});
test("all financial and AI API endpoints verify server identity", async ({ request }) => {
  for (const path of [
    "/api/transactions",
    "/api/ai/extract",
    "/api/ai/summary",
    "/api/ai/transcribe",
  ]) {
    const r = await request.post(path, post({}));
    expect(r.status(), path).toBe(401);
  }
  expect((await request.get("/api/transactions")).status()).toBe(401);
});
test("origin protection, request bounds, and confirmation requirement", async ({ request }) => {
  await signin(request);
  expect(
    (
      await request.post("/api/transactions", {
        data: {},
        headers: { Origin: "https://attacker.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await request.post("/api/transactions", post({ payload: "x".repeat(40000) }))).status(),
  ).toBe(413);
  expect(
    (await request.post("/api/transactions", post({ confirmed: false, entries: [] }))).status(),
  ).toBe(400);
});
test("server transaction CRUD, concurrent retry, filter preservation, and wrong-user payloads", async ({
  request,
}) => {
  await signin(request);
  const requestId = randomUUID(),
    clientId = randomUUID(),
    title = `API test ${requestId}`;
  const body = {
    confirmed: true,
    request_id: requestId,
    entries: [
      {
        title,
        type: "expense",
        amount: "১২০.৫০",
        category_id: "food",
        occurred_on: "2098-01-01",
        note: "",
        input_method: "manual",
        client_request_id: clientId,
        user_id: process.env.TEST_USER_B_ID,
      },
    ],
  };
  const [a, b] = await Promise.all([
    request.post("/api/transactions", post(body)),
    request.post("/api/transactions", post(body)),
  ]);
  expect(a.ok(), await a.text()).toBeTruthy();
  expect(b.ok()).toBeTruthy();
  const first = await a.json();
  expect((await b.json()).ids).toEqual(first.ids);
  const list = await request.get(
    "/api/transactions?month=2098-01&type=expense&category=food&q=API&sort=amount-asc",
  );
  const data = await list.json();
  expect(data.count).toBe(1);
  expect(data.transactions[0].amount_paisa).toBe(12050);
  expect(data.transactions[0].user_id).toBe(process.env.TEST_USER_A_ID);
  const transaction = data.transactions[0];
  const edited = await request.patch(
    `/api/transactions/${first.ids[0]}`,
    post({ ...body.entries[0], amount: "140.75", expected_updated_at: transaction.updated_at }),
  );
  expect(edited.ok(), await edited.text()).toBeTruthy();
  expect(
    (
      await request.delete(`/api/transactions/${first.ids[0]}`, { headers: { Origin: origin } })
    ).ok(),
  ).toBeTruthy();
  expect((await (await request.get("/api/transactions?month=2098-01")).json()).count).toBe(0);
});
test("budget CRUD and uniqueness are enforced by the server", async ({ request }) => {
  await signin(request);
  const body = { month: "2098-02", category_id: "food", limit: "500" };
  const created = await request.post("/api/budgets", post(body));
  expect(created.ok(), await created.text()).toBeTruthy();
  const { id } = await created.json();
  expect((await request.post("/api/budgets", post(body))).status()).toBe(409);
  expect(
    (await request.patch(`/api/budgets/${id}`, post({ ...body, limit: "800" }))).ok(),
  ).toBeTruthy();
  expect(
    (await request.delete(`/api/budgets/${id}`, { headers: { Origin: origin } })).ok(),
  ).toBeTruthy();
});
test("registration, verified email callback, forgot/reset password, login and logout with real Supabase Auth", async ({
  page,
  request,
}) => {
  const url = process.env.TEST_SUPABASE_URL!;
  expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
  const admin = createClient(url, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `signup-${randomUUID()}@takatrack.test`,
    password = `Strong-${randomUUID()}!`;
  let userId: string | undefined;
  try {
    await page.goto("/register");
    await page.locator("[name=name]").fill("Registration Test");
    await page.locator("[name=email]").fill(email);
    await page.locator("[name=password]").fill(password);
    await page.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন", exact: true }).click();
    await expect(page).toHaveURL(/verify-email/);
    const found = await admin.auth.admin.listUsers();
    userId = found.data.users.find((u) => u.email === email)?.id;
    expect(userId).toBeTruthy();
    const verification = await admin.auth.admin.generateLink({ type: "signup", email, password });
    expect(verification.error).toBeNull();
    await page.goto(
      `/auth/confirm?token_hash=${verification.data.properties?.hashed_token}&type=email`,
    );
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page).toHaveURL(/login/);
    const resetRequest = await request.post("/api/auth/forgot", post({ email }));
    expect(resetRequest.ok(), await resetRequest.text()).toBeTruthy();
    const recovery = await admin.auth.admin.generateLink({ type: "recovery", email });
    expect(recovery.error).toBeNull();
    await page.goto(
      `/auth/confirm?token_hash=${recovery.data.properties?.hashed_token}&type=recovery&next=/reset-password`,
    );
    await expect(page).toHaveURL(/reset-password/);
    const changed = `Changed-${randomUUID()}!`;
    await page.locator("[name=password]").fill(changed);
    await page.getByRole("button", { name: "পাসওয়ার্ড পরিবর্তন করুন" }).click();
    await expect(page).toHaveURL(/notice=password-reset/);
    const old = await request.post("/api/auth/login", post({ email, password }));
    expect(old.status()).toBe(400);
    const ok = await request.post("/api/auth/login", post({ email, password: changed }));
    expect(ok.ok(), await ok.text()).toBeTruthy();
    expect((await request.post("/api/auth/logout", post({}))).ok()).toBeTruthy();
    expect((await request.get("/api/transactions")).status()).toBe(401);
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
test("invalid and expired auth callback tokens fail closed", async ({ page, request }) => {
  await page.goto("/auth/callback?code=invalid&next=https://attacker.invalid");
  await expect(page).toHaveURL(/\/auth-error/);
  await page.goto("/auth/confirm?token_hash=invalid&type=email");
  await expect(page).toHaveURL(/\/auth-error/);
  expect(
    (await request.post("/api/auth/reset", post({ password: "A-strong-password" }))).status(),
  ).toBe(401);
});
