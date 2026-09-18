/** Destructive test setup is restricted to a disposable LOOPBACK Supabase instance. */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { demoTransactions, demoBudgets } from "../src/lib/domain/demo.ts";
const url = process.env.API_URL || process.env.TEST_SUPABASE_URL || "";
const key = process.env.ANON_KEY || process.env.TEST_SUPABASE_KEY || "";
const adminKey = process.env.SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || "";
if (
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  process.env.TEST_SETUP_CONFIRM !== "disposable-local-project"
)
  throw new Error("Only an explicitly confirmed disposable localhost project may be initialized.");
if (!key || !adminKey) throw new Error("Load the LOCAL Supabase status environment first.");
const admin = createClient(url, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `LocalTest-${randomUUID()}!`;
const env: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  APP_ORIGIN: "http://localhost:3000",
  TEST_SUPABASE_URL: url,
  TEST_SUPABASE_KEY: key,
  TEST_SUPABASE_SERVICE_ROLE_KEY: adminKey,
  TEST_SETUP_CONFIRM: "disposable-local-project",
  GOOGLE_OAUTH_ENABLED: "false",
  GEMINI_API_KEY: "ui-test-not-a-real-gemini-key",
  E2E_ALLOW_MUTATIONS: "isolated-test-project",
};
for (const kind of ["a", "b", "visual"]) {
  const email = `${kind}-${randomUUID().slice(0, 8)}@takatrack.test`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: kind === "visual" ? "Mahbub" : `Test ${kind.toUpperCase()}` },
  });
  if (created.error || !created.data.user) throw new Error("Local test user creation failed");
  const prefix = kind === "visual" ? "E2E" : `TEST_USER_${kind.toUpperCase()}`;
  env[`${prefix}_EMAIL`] = email;
  env[`${prefix}_PASSWORD`] = password;
  env[`${prefix}_ID`] = created.data.user.id;
  if (kind === "visual") {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw new Error("Local test login failed");
    const tx = await client.from("transactions").insert(demoTransactions(created.data.user.id));
    if (tx.error) throw new Error(`Local fixture seed failed: ${tx.error.code}`);
    const b = await client.from("budgets").insert(demoBudgets(created.data.user.id));
    if (b.error) throw new Error(`Local budget seed failed: ${b.error.code}`);
    await client.auth.signOut();
  }
}
await writeFile(
  ".env.test.local",
  Object.entries(env)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.info(
  "Three isolated LOCAL users prepared. Credentials written to gitignored .env.test.local; not printed.",
);
