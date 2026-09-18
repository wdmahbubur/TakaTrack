import { createClient } from "@supabase/supabase-js";
import { demoTransactions, demoBudgets } from "../src/lib/domain/demo.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";
// Explicit opt-in; no administrative key. Only the logged-in development account is changed.
if (process.env.DEMO_SEED_CONFIRM !== "isolated-development-account")
  throw new Error(
    "Set DEMO_SEED_CONFIRM=isolated-development-account only for a dedicated development account.",
  );
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.DEMO_EMAIL,
  password = process.env.DEMO_PASSWORD;
if (!url || !key || !email || !password)
  throw new Error(
    "Supabase public configuration and dedicated DEMO_EMAIL / DEMO_PASSWORD are required.",
  );
const db = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signedIn = await db.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.user)
  throw new Error("Development account login failed; verify the account email first.");
const user = signedIn.data.user;
try {
  const transactions = demoTransactions(user.id),
    budgets = demoBudgets(user.id);
  const ids = new Set(transactions.map((t) => t.id));
  const existing = await db
    .from("transactions")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .limit(1000);
  if (existing.error)
    throw new Error("Cannot read the development account. Apply migrations first.");
  if ((existing.count ?? 0) > ids.size || existing.data.some((t) => !ids.has(t.id)))
    throw new Error(
      "Refusing to seed: this account contains non-demo transactions. Use an empty dedicated development account.",
    );
  const existingBudgets = await db.from("budgets").select("id").eq("user_id", user.id);
  if (
    existingBudgets.error ||
    existingBudgets.data.some((b) => !budgets.some((d) => d.id === b.id))
  )
    throw new Error("Refusing to replace non-demo budgets.");
  const tx = await db.from("transactions").upsert(transactions, { onConflict: "id" });
  if (tx.error) throw new Error("Demo transaction seed failed. Check category migration and RLS.");
  const budget = await db.from("budgets").upsert(budgets, { onConflict: "id" });
  if (budget.error) throw new Error("Demo budget seed failed.");
  console.info(
    "Demo account seeded. Open /dashboard?month=2025-04. April: income 25,000; expenses 18,400; remaining 6,600 BDT.",
  );
} finally {
  await db.auth.signOut();
}
