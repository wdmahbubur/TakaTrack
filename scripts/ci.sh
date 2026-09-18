#!/usr/bin/env bash
set -euo pipefail
mkdir -p verification-logs
npm ci 2>&1 | tee verification-logs/install.log
npm run typecheck 2>&1 | tee verification-logs/typecheck.log
npm run lint 2>&1 | tee verification-logs/lint.log
npm test 2>&1 | tee verification-logs/unit.log
# This starts only disposable Docker services on the runner, never the linked hosted project.
supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor > /tmp/takatrack-supabase-start.log 2>&1 || { echo "Disposable Supabase startup failed; private runner log withheld to avoid credential disclosure."; exit 1; }
supabase status -o env > .env.supabase.local
set -a; source .env.supabase.local; set +a
TEST_SETUP_CONFIRM=disposable-local-project node --experimental-strip-types scripts/prepare-test-users.ts
set -a; source .env.test.local; set +a
psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/sql/security.sql 2>&1 | tee verification-logs/database-security.log
npm run test:integration 2>&1 | tee verification-logs/integration.log
npm run build 2>&1 | tee verification-logs/build.log
npx playwright install --with-deps chromium 2>&1 | tee verification-logs/browser-install.log
# Production build, real local Supabase Auth/data, synthetic audio and explicit AI endpoint mocks.
E2E_PRODUCTION=1 npm run test:e2e 2>&1 | tee verification-logs/browser.log
# Preserve the full run's screenshots/report before the separate missing-key check.
mv test-results test-results-full
mv playwright-report playwright-report-full
GEMINI_API_KEY='' E2E_AI_UNAVAILABLE=1 E2E_PRODUCTION=1 E2E_BASE_URL=http://localhost:3001 APP_ORIGIN=http://localhost:3001 npx playwright test tests/e2e/availability.spec.ts 2>&1 | tee verification-logs/ai-unavailable.log
