# Verification record

This document separates implemented behavior from measured checks. It will be updated with the final CI run and deployment result.

## Completed on 18 September 2026

- Both version-controlled SQL migrations are applied to the connected TakaTrack project: 20260918061016 and 20260918061252.
- Six tables have RLS; nine category rows are seeded; no example financial data was inserted into a real account.
- 37 live PostgreSQL security/constraint/aggregate/idempotency assertions passed. Temporary Auth users, 1,001-row aggregation fixtures and other test data were rolled back.
- 80 deterministic unit tests passed for money, Dhaka dates, budgets, AI contracts, audio, and mocked Gemini transport/errors.
- Latest source type checking and lint passed after the demo-seeder typing fix.

## Reproducible tests included

- Unit tests: `tests/unit`.
- Real local Supabase integration tests: `tests/integration` (not an in-memory database).
- Browser authentication, API/CRUD, AI draft review, double click, origin limits, microphone denial, synthetic recording and transcript editing: `tests/e2e`.
- Forty-eight visual viewport cases: eight pages × six widths, with fonts awaited and animations disabled.
- Explicit no-Gemini-key browser state test on a separately configured server.
- Full workflow: `.github/workflows/ci.yml` and `scripts/ci.sh`.

## External limitations to report honestly

The editing container cannot resolve package registries and its Chromium blocks localhost by administrative policy. Browser testing is therefore performed on the authorized GitHub Actions runner rather than bypassing that policy. No successful local browser test is claimed.

Mocked browser AI responses verify review/confirmation and failure handling, not Gemini model accuracy. Synthetic Chromium audio verifies the recorder lifecycle, not a person's physical microphone. No live Gemini call can be verified without a real server-side key. Google OAuth remains disabled until its credentials are configured. Local Auth tests with generated email tokens do not verify external SMTP delivery. Safari/iOS/Android physical-device testing and an external security audit are not included in the automated checks.
