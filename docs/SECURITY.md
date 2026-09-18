# Security decisions

## Identity and authorization

Protected server reads and mutation/AI routes call verified Supabase identity helpers. Client navigation and the Next.js proxy improve routing and refresh cookies but do not replace authorization. Request identity comes from the verified session; submitted `user_id` is never authoritative. Normal requests use the publishable/anon key and user session, never service-role.

All six tables have RLS. Profiles are select-own/update-own with only `display_name` update permission. Categories are read-only to ordinary users. Transactions and budgets enforce both existing-row ownership and new-row ownership. Composite foreign keys validate income/expense categories. Aggregate and atomic-save RPCs are SECURITY INVOKER, explicitly scoped to `auth.uid()`, with an empty search path. Financial responses are private/no-store and protected pages are dynamic. No shared financial cache, logging of descriptions, or localStorage database is used.

## Intentional advisor notices

The hosted Supabase advisor reports two intentional items, not zero notices:

- `takatrack_private.ai_rate_windows` has RLS with no policies. Ordinary clients have neither schema access nor policies: this is deliberate default-deny. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- `public.consume_ai_quota(text)` is callable by authenticated users and is SECURITY DEFINER. This narrowly scoped function checks `auth.uid()`, validates the operation, only updates that user's private counters, pins an empty search path, and returns a Boolean. Clients cannot reset counters or request another user's quota. The privileged operation is necessary to prevent client tampering with rate windows. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Do not remove these boundaries just to silence a linter. Re-review the privilege scope after any function edit.

## Validation and writes

Money is integer poisha with positive bounds and safe-integer aggregation. Dates, bounded strings, category/type tuples, one-budget-per-month/category, and input methods are checked in both application and database where applicable. Text is never SQL or an executable tool command. User input cannot choose a provider endpoint or arbitrary URL.

Atomic saves use a transaction-level advisory lock and per-user immutable idempotency receipt. Identical retries return original IDs; changed payloads using the same key fail. Per-entry IDs also have a unique constraint. A failed batch rolls back all entries. Retrying after deletion does not recreate a deleted record. Receipts contain hashes and identifiers, not descriptions. A client with direct public API access can insert receipts for their own account, but cannot read/change another account or use those receipts to bypass transaction RLS.

## HTTP and providers

Mutations require an exact allowed Origin. Authentication endpoints use Supabase's own rate controls; AI additionally uses persistent per-user counters (8/minute, 60/day). Bodies and streams have byte bounds, text length limits, and provider calls have a bounded timeout. WAV bytes, size, duration, and RMS silence are checked server-side. The provider adapter normalizes upstream failures; no raw secrets, audio, transcripts or financial descriptions are written to production logs.

The mock adapter and offline Supabase protocol fixture exist only under tests and are not registered in production. Missing credentials fail explicitly. Audio is inline and not stored by the application; external provider policies remain applicable.

## Verification

`tests/sql/security.sql` exercises 37 assertions against PostgreSQL roles and RLS, including cross-user reads/inserts/updates/deletes, categories, budgets, complete aggregation above the API row cap, atomicity, idempotency, revision invalidation, quota protection and anonymous access. All test changes are enclosed in a rollback. This suite passed against the connected hosted database on 18 September 2026. See the CI and verification report for application/browser coverage.

Before public launch: configure SMTP, appropriate Supabase auth rate limits, production redirect URLs and strong project-owner account security. Test actual email delivery and any enabled Google OAuth flow. No external security audit or penetration test is claimed.
