import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = process.env.TEST_SUPABASE_URL || "";
const enabled = Boolean(
  url &&
    process.env.TEST_SUPABASE_KEY &&
    process.env.TEST_USER_A_EMAIL &&
    process.env.TEST_USER_B_EMAIL,
);
if (
  enabled &&
  (!["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    process.env.TEST_SETUP_CONFIRM !== "disposable-local-project")
)
  throw new Error(
    "Integration mutations may only run against an explicitly confirmed local test project.",
  );
let a: SupabaseClient, b: SupabaseClient, aid: string, bid: string;
const month = "2099-01-01";
const options = { skip: !enabled };
before(async () => {
  if (!enabled) return;
  const make = () =>
    createClient(url, process.env.TEST_SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  a = make();
  b = make();
  const x = await a.auth.signInWithPassword({
    email: process.env.TEST_USER_A_EMAIL!,
    password: process.env.TEST_USER_A_PASSWORD!,
  });
  const y = await b.auth.signInWithPassword({
    email: process.env.TEST_USER_B_EMAIL!,
    password: process.env.TEST_USER_B_PASSWORD!,
  });
  assert.equal(x.error, null);
  assert.equal(y.error, null);
  aid = x.data.user!.id;
  bid = y.data.user!.id;
});
after(async () => {
  if (enabled) {
    await a.from("transactions").delete().eq("occurred_on", month);
    await b.from("transactions").delete().eq("occurred_on", month);
    await a.from("budgets").delete().eq("month", month);
    await a.auth.signOut();
    await b.auth.signOut();
  }
});
const item = (title = "Integration expense", amount = 12345) => ({
  type: "expense",
  title,
  amount_paisa: amount,
  category_id: "food",
  occurred_on: month,
  note: null,
  input_method: "manual",
  client_request_id: randomUUID(),
});
test("real Auth rejects a bad password", options, async () => {
  const c = createClient(url, process.env.TEST_SUPABASE_KEY!, { auth: { persistSession: false } });
  assert.ok(
    (
      await c.auth.signInWithPassword({
        email: process.env.TEST_USER_A_EMAIL!,
        password: "definitely-not-correct",
      })
    ).error,
  );
});
test("profiles and immutable categories are correctly isolated", options, async () => {
  assert.equal((await a.from("profiles").select("*")).data?.length, 1);
  assert.equal((await a.from("profiles").select("*").eq("id", bid)).data?.length, 0);
  assert.equal((await a.from("categories").select("*")).data?.length, 9);
  assert.ok((await a.from("categories").insert({ id: "malicious" })).error);
});
test("transaction CRUD stores exact integer paisa", options, async () => {
  const row = { ...item(), user_id: aid };
  const result = await a.from("transactions").insert(row).select("*").single();
  assert.equal(result.error, null);
  const id = result.data.id;
  assert.equal(result.data.amount_paisa, 12345);
  const changed = await a
    .from("transactions")
    .update({ amount_paisa: 54321 })
    .eq("id", id)
    .select("*")
    .single();
  assert.equal(changed.data.amount_paisa, 54321);
  assert.equal((await a.from("transactions").delete().eq("id", id)).error, null);
  assert.equal((await a.from("transactions").select("id").eq("id", id)).data?.length, 0);
});
test("User A cannot read, edit, delete or take ownership of User B records", options, async () => {
  const created = await b
    .from("transactions")
    .insert({ ...item("Private B", 77777), user_id: bid })
    .select("*")
    .single();
  assert.equal(created.error, null);
  const id = created.data.id;
  assert.deepEqual((await a.from("transactions").select("*").eq("id", id)).data, []);
  assert.deepEqual(
    (await a.from("transactions").update({ title: "Stolen" }).eq("id", id).select()).data,
    [],
  );
  assert.deepEqual((await a.from("transactions").delete().eq("id", id).select()).data, []);
  assert.ok((await a.from("transactions").insert({ ...item(), user_id: bid })).error);
  assert.equal(
    (await b.from("transactions").select("title").eq("id", id).single()).data?.title,
    "Private B",
  );
  await b.from("transactions").delete().eq("id", id);
});
test(
  "category/type and positive money constraints survive direct API access",
  options,
  async () => {
    assert.ok(
      (await a.from("transactions").insert({ ...item(), user_id: aid, type: "income" })).error,
    );
    assert.ok((await a.from("transactions").insert({ ...item("zero", 0), user_id: aid })).error);
    assert.ok(
      (await a.from("transactions").insert({ ...item(), user_id: aid, occurred_on: "2025-02-30" }))
        .error,
    );
  },
);
test(
  "concurrent retries return the same transaction without duplicate insertion",
  options,
  async () => {
    const request_id = randomUUID(),
      items = [item("Idempotent")];
    const [x, y] = await Promise.all([
      a.rpc("save_transactions", { p_request_id: request_id, p_items: items }),
      a.rpc("save_transactions", { p_request_id: request_id, p_items: items }),
    ]);
    assert.equal(x.error, null);
    assert.equal(y.error, null);
    assert.deepEqual(x.data, y.data);
    assert.equal(
      (
        await a
          .from("transactions")
          .select("id")
          .eq("client_request_id", items[0].client_request_id)
      ).data?.length,
      1,
    );
    const conflict = await a.rpc("save_transactions", {
      p_request_id: request_id,
      p_items: [{ ...items[0], amount_paisa: 1 }],
    });
    assert.equal(conflict.error?.code, "22023");
    await a.from("transactions").delete().eq("id", x.data[0]);
    const retry = await a.rpc("save_transactions", { p_request_id: request_id, p_items: items });
    assert.deepEqual(retry.data, x.data);
    assert.equal((await a.from("transactions").select("id").eq("id", x.data[0])).data?.length, 0);
  },
);
test("invalid AI batch rolls back every row", options, async () => {
  const first = item("First atomic"),
    second = { ...item("Invalid atomic"), type: "income" };
  const result = await a.rpc("save_transactions", {
    p_request_id: randomUUID(),
    p_items: [first, second],
  });
  assert.ok(result.error);
  assert.equal(
    (await a.from("transactions").select("id").eq("client_request_id", first.client_request_id))
      .data?.length,
    0,
  );
});
test("one budget per category/month and no income category budgets", options, async () => {
  const value = { user_id: aid, category_id: "food", month, limit_paisa: 50000 };
  const first = await a.from("budgets").insert(value).select("id").single();
  assert.equal(first.error, null);
  assert.equal((await a.from("budgets").insert(value)).error?.code, "23505");
  assert.ok((await a.from("budgets").insert({ ...value, category_id: "salary" })).error);
  assert.equal((await b.from("budgets").select("*").eq("id", first.data.id)).data?.length, 0);
  await a.from("budgets").delete().eq("id", first.data.id);
});
test(
  "month aggregation has no 1,000-row pagination cap and no cross-user leakage",
  options,
  async () => {
    const rows = Array.from({ length: 1001 }, () => ({ ...item("Aggregate", 1), user_id: aid }));
    assert.equal((await a.from("transactions").insert(rows)).error, null);
    const foreign = await b
      .from("transactions")
      .insert({ ...item("Unrelated", 99999), user_id: bid })
      .select("id")
      .single();
    assert.equal(foreign.error, null);
    const s = await a.rpc("month_snapshot", { p_month: month });
    assert.equal(s.error, null);
    assert.equal(s.data.count, 1001);
    assert.equal(s.data.expense, "1001");
    await a.from("transactions").delete().eq("occurred_on", month);
    await b.from("transactions").delete().eq("id", foreign.data.id);
  },
);
test("editing data changes the summary revision", options, async () => {
  const r = await a
    .from("transactions")
    .insert({ ...item(), user_id: aid })
    .select("id")
    .single();
  assert.equal(r.error, null);
  const first = await a.rpc("month_snapshot", { p_month: month });
  await a.from("transactions").update({ amount_paisa: 12346 }).eq("id", r.data.id);
  const second = await a.rpc("month_snapshot", { p_month: month });
  assert.notEqual(first.data.revision, second.data.revision);
  await a.from("transactions").delete().eq("id", r.data.id);
});
test(
  "search, exact counts, stable sorting, and range pagination work through PostgREST",
  options,
  async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      ...item(`Search ${String(i).padStart(2, "0")}`, i + 1),
      user_id: aid,
    }));
    await a.from("transactions").insert(rows);
    const q = () =>
      a
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("user_id", aid)
        .eq("occurred_on", month)
        .ilike("title", "%Search%")
        .order("amount_paisa", { ascending: false })
        .order("id");
    const p1 = await q().range(0, 7),
      p2 = await q().range(8, 15);
    assert.equal(p1.count, 12);
    assert.equal(p1.data?.length, 8);
    assert.equal(p2.data?.length, 4);
    assert.equal(p1.data?.[0].amount_paisa, 12);
    assert.equal(new Set([...p1.data!, ...p2.data!].map((v) => v.id)).size, 12);
    await a.from("transactions").delete().eq("occurred_on", month);
  },
);
test("anonymous clients cannot read tables or invoke aggregation", options, async () => {
  const c = createClient(url, process.env.TEST_SUPABASE_KEY!, { auth: { persistSession: false } });
  assert.ok((await c.from("transactions").select("*")).error);
  assert.ok((await c.rpc("month_snapshot", { p_month: month })).error);
});
