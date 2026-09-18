/** Loopback-only HTTP fixture for UI testing when the network is unavailable.
 * This is NOT Supabase and proves no database-security properties. Production
 * never imports this file. Real database/auth tests run against local Supabase.
 */
import { createServer } from "node:http";
import { createHmac, randomUUID, createHash } from "node:crypto";
import {
  demoTransactions,
  demoBudgets,
  demoCategories,
  demoId,
} from "../../src/lib/domain/demo.ts";
import { calculateTotals } from "../../src/lib/domain/calculations.ts";
import type { Transaction, Budget } from "../../src/lib/domain/types.ts";
if (process.env.TT_OFFLINE_UI !== "1")
  throw new Error("This fixture is test-only. Set TT_OFFLINE_UI=1 explicitly.");
const user = {
  id: demoId(0),
  aud: "authenticated",
  role: "authenticated",
  email: "visual@takatrack.test",
  email_confirmed_at: "2025-04-01T00:00:00Z",
  created_at: "2025-04-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Mahbub" },
  identities: [],
};
let transactions = demoTransactions(user.id),
  budgets = demoBudgets(user.id),
  displayName = "Mahbub";
const receipts = new Map<string, { hash: string; ids: string[] }>();
const token = () => {
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  return `${head}.${body}.${createHmac("sha256", "offline-test-not-a-real-key").update(`${head}.${body}`).digest("base64url")}`;
};
const session = () => ({
  access_token: token(),
  token_type: "bearer",
  refresh_token: "offline-fixture-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user,
});
function matches(row: Record<string, unknown>, q: URLSearchParams) {
  for (const [k, v] of q) {
    if (["select", "order", "offset", "limit", "on_conflict"].includes(k)) continue;
    const dot = v.indexOf(".");
    const op = v.slice(0, dot),
      expected = v.slice(dot + 1),
      actual = String(row[k] ?? "");
    if (op === "eq" && actual !== expected) return false;
    if (op === "gte" && actual < expected) return false;
    if (op === "lte" && actual > expected) return false;
    if (
      op === "ilike" &&
      !actual.toLowerCase().includes(expected.replace(/^%|%$/g, "").toLowerCase())
    )
      return false;
  }
  return true;
}
createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54321"),
    path = url.pathname;
  const send = (value: unknown, status = 200) => {
    res.statusCode = status;
    res.end(status === 204 ? undefined : JSON.stringify(value));
  };
  const fail = (message: string, code = "42501", status = 400) => send({ code, message }, status);
  let raw = "";
  for await (const chunk of req) {
    raw += String(chunk);
    if (raw.length > 2000000) return fail("Too large", "413", 413);
  }
  const body = raw ? JSON.parse(raw) : {};
  if (path === "/health") return send({ fixture: true });
  if (path === "/auth/v1/.well-known/jwks.json") return send({ keys: [] });
  if (path === "/auth/v1/token")
    return body.password === "FixturePassword!2026" || body.refresh_token
      ? send(session())
      : fail("Invalid login credentials", "invalid_credentials", 400);
  if (path === "/auth/v1/user") {
    if (!req.headers.authorization) return fail("Not authenticated", "bad_jwt", 401);
    return send(user);
  }
  if (path === "/auth/v1/logout") return send({}, 204);
  if (path === "/auth/v1/signup")
    return send({ user: { ...user, id: randomUUID(), email: body.email }, session: null });
  if (path === "/auth/v1/recover" || path === "/auth/v1/resend") return send({});
  if (!req.headers.authorization) return fail("Not authenticated", "bad_jwt", 401);
  if (path === "/rest/v1/rpc/month_snapshot") {
    const through = body.p_through ?? `${body.p_month.slice(0, 7)}-31`;
    const rows = transactions.filter(
      (t) => t.occurred_on >= body.p_month && t.occurred_on <= through,
    );
    const b = budgets.filter((v) => v.month === body.p_month),
      s = calculateTotals(rows);
    return send({
      income: String(s.income),
      expense: String(s.expense),
      count: s.count,
      categories: s.categories,
      budgets: b,
      revision: createHash("md5")
        .update(JSON.stringify([rows, b]))
        .digest("hex"),
    });
  }
  if (path === "/rest/v1/rpc/save_transactions") {
    const hash = JSON.stringify(body.p_items),
      previous = receipts.get(body.p_request_id);
    if (previous)
      return previous.hash === hash ? send(previous.ids) : fail("Request conflict", "22023");
    const now = new Date().toISOString();
    const rows: Transaction[] = body.p_items.map((v: Record<string, unknown>) => ({
      ...v,
      id: randomUUID(),
      user_id: user.id,
      created_at: now,
      updated_at: now,
    }));
    transactions.push(...rows);
    const ids = rows.map((r) => r.id);
    receipts.set(body.p_request_id, { hash, ids });
    return send(ids);
  }
  if (path === "/rest/v1/rpc/consume_ai_quota") return send(true);
  if (path.startsWith("/rest/v1/")) {
    const table = path.split("/").at(-1);
    let all: Record<string, unknown>[] =
      table === "transactions"
        ? transactions
        : table === "budgets"
          ? budgets
          : table === "categories"
            ? demoCategories
            : table === "profiles"
              ? [
                  {
                    id: user.id,
                    display_name: displayName,
                    created_at: user.created_at,
                    updated_at: user.created_at,
                  },
                ]
              : [];
    const q = url.searchParams;
    let rows = all.filter((r) => matches(r, q));
    if (req.method === "DELETE") {
      if (table === "transactions")
        transactions = transactions.filter((t) => !rows.some((r) => r.id === t.id));
      if (table === "budgets") budgets = budgets.filter((t) => !rows.some((r) => r.id === t.id));
      return send([], 204);
    }
    if (req.method === "POST") {
      if (table === "budgets") {
        if (budgets.some((b) => b.category_id === body.category_id && b.month === body.month))
          return fail("Duplicate budget", "23505", 409);
        const b = {
          ...body,
          id: randomUUID(),
          user_id: user.id,
          category_type: "expense",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Budget;
        budgets.push(b);
        rows = [b];
        all = rows;
      } else return fail("Unsupported fixture operation");
    }
    if (req.method === "PATCH") {
      rows = rows.map((r) => {
        Object.assign(r, body, { updated_at: new Date().toISOString() });
        return r;
      });
      if (table === "profiles" && rows.length) displayName = String(body.display_name);
    }
    const sort = (q.get("order") ?? "")
      .split(",")
      .filter(Boolean)
      .map((x) => x.split("."));
    rows.sort((a, b) => {
      for (const [key, direction] of sort) {
        const x = a[key],
          y = b[key];
        const cmp =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y));
        if (cmp) return direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
    const count = rows.length,
      offset = Number(q.get("offset") ?? 0),
      limit = Number(q.get("limit") ?? rows.length);
    rows = rows.slice(offset, offset + limit);
    res.setHeader(
      "Content-Range",
      `${offset}-${Math.max(offset, offset + rows.length - 1)}/${count}`,
    );
    if (req.headers.accept?.includes("application/vnd.pgrst.object+json"))
      return rows.length === 1 ? send(rows[0]) : fail("No row", "PGRST116", 406);
    return send(rows);
  }
  return fail("Not implemented by offline fixture", "NOT_IMPLEMENTED", 404);
}).listen(54321, "127.0.0.1", () =>
  console.info("Offline UI fixture listening on loopback:54321 (NOT a real database)"),
);
