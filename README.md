# TakaTrack

A Bengali-first personal income, expense, and monthly-budget application. Built with **Next.js App Router, TypeScript, Supabase Auth/PostgreSQL, and a server-only Gemini adapter**. The eight supplied screen designs guide the visual components; the screenshots are not page backgrounds.

## What is included

| Route | Purpose |
|---|---|
| `/` | Landing page, labelled demo preview, feature and how-it-works sections |
| `/register`, `/login` | Name/email/password registration, login, optional Google OAuth |
| `/dashboard` | Monthly income, expenses, recorded remainder, category charts, recent activity |
| `/transactions` | Manual income/expense CRUD, search, filters, date ranges, sorting, pagination |
| `/transactions/ai` | Typed or recorded description → editable transcript → draft review → explicit save |
| `/budgets` | Category/month budgets, spending, overspending and unbudgeted spending |
| `/reports` | Category breakdown, comparable monthly periods, on-demand Bengali AI summary |
| `/profile` | Display name, email, password reset, logout |

Supporting routes include `/forgot-password`, `/reset-password`, `/verify-email`, `/auth-error`, `/auth/callback`, and `/auth/confirm`.

**All amounts are BDT.** Money is stored as integer poisha (`amount_paisa`); the displayed remainder is recorded income minus recorded expenses, **not a verified bank balance**. Dates use Asia/Dhaka. New accounts start empty. There is no bank integration, receipt OCR, subscription, admin panel, or automatic financial decision-making.

## 1. Install and start

Install Node.js 22.16 or later in the Node 22 line and npm. Clone this repository, then run:

```sh
npm ci
cp .env.example .env.local
```

On Windows, copy `.env.example` to `.env.local` using your editor. Fill in the Supabase configuration described below, then:

```sh
npm run dev
```

Open `http://localhost:3000`. The landing and authentication screens render without credentials but authentication clearly reports missing configuration. With Supabase configured, **manual transactions, budgets, charts, and non-AI reports work without a Gemini key**.

For a production build locally:

```sh
npm run build
npm run start
```

Keep `.env.local` private. Never place a service-role key or AI key in a variable beginning `NEXT_PUBLIC_`. Commit the lockfile and use `npm ci` for reproducible installation.

## 2. Configure Supabase and migrations

Use a dedicated Supabase project. From its Connect/API settings, copy its URL and **publishable key**, or the legacy anon key, into:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
APP_ORIGIN=http://localhost:3000
```

These two Supabase values are intentionally public client configuration. Row Level Security is the authorization boundary. Application requests never use an administrative key.

Version-controlled migrations, in order:

1. `supabase/migrations/20260918061016_takatrack_core.sql`
2. `supabase/migrations/20260918061252_takatrack_categories.sql`

For a **new, empty hosted project**, install the Supabase CLI, then:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Review the proposed migration before approving it. Do not run `db reset --linked` on a live database. The connected TakaTrack project already has these two migration versions applied; do not manually rerun the creation SQL there. `supabase migration list` shows the applied versions.

The migrations create profiles, nine read-only categories, transactions, budgets, idempotency receipts, and private AI quota counters. They also create complete-month aggregate and atomic-save functions. Amounts must be positive, category/type combinations must match, and a budget is unique per user/category/month.

For local development with Docker and the CLI, the configuration is already included:

```sh
supabase start
supabase status
```

Use the local API URL and anon key in `.env.local`. `supabase db reset` is appropriate **only for this disposable local database** and applies the migrations again from scratch.

## 3. Email authentication and redirects

In Supabase **Authentication → Providers/Sign-in → Email**, enable email/password and email confirmations. Supabase manages password hashes. No application password table exists.

In **Authentication → URL Configuration**, set the Site URL to the final application origin, for example `https://your-app.vercel.app`. Add explicit allowed redirects for each environment:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/reset-password
http://localhost:3000/auth/confirm
http://localhost:3000/reset-password
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/auth/callback?next=/reset-password
https://your-app.vercel.app/auth/confirm
https://your-app.vercel.app/reset-password
```

Use your actual hostname, not the example. Avoid a broad production wildcard. Set `APP_ORIGIN` to the same exact origin with no path. On Vercel, when omitted, the server uses the platform's production hostname or deployment hostname as appropriate. Explicit `APP_ORIGIN` is preferable with a custom domain.

The default Supabase PKCE confirmation links are handled by `/auth/callback`. PKCE links should open in the browser where the request began. For email verification that also works from another browser, use the token-hash email template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm email</a>
```

For a password-recovery template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a>
```

The confirmation endpoint validates the token with Supabase before creating cookies. The reset screen requires a verified session, updates the password through Supabase, then signs that session out. Invalid callbacks fail closed. The “remember me” option controls persistent versus session cookies; Supabase refresh/session policy still determines session validity.

**Configure a production SMTP provider before inviting public users.** Supabase's built-in mail service has delivery and rate restrictions; a successful local test with generated verification links is not proof of real inbox delivery. Confirm your sender/domain and test actual registration and password-reset emails after configuring SMTP.

## 4. Google sign-in

Create a Google OAuth web client in Google Cloud, configure its consent screen, and put the client ID and secret in **Supabase Authentication → Providers → Google**. Add the callback shown by Supabase (normally `https://YOUR_PROJECT.supabase.co/auth/v1/callback`) to Google's authorized redirect URIs. Configure the application redirect allowlist above.

Only then set server-side `GOOGLE_OAUTH_ENABLED=true` and redeploy. When false, the Google button displays an unavailable state instead of pretending to sign in. No Google secret belongs in this repository or the browser bundle.

## 5. Gemini configuration

Create a Gemini API key in Google AI Studio and add it as a **server-only** environment variable:

```dotenv
GEMINI_API_KEY=YOUR_PRIVATE_KEY
VOICE_AI_PROVIDER=gemini
TEXT_AI_PROVIDER=gemini
GEMINI_VOICE_MODEL=gemini-2.5-flash
GEMINI_TEXT_MODEL=gemini-2.5-flash
AI_REQUEST_TIMEOUT_MS=30000
AUDIO_MAX_DURATION_SECONDS=60
AUDIO_MAX_UPLOAD_BYTES=2000000
```

`gemini-2.5-flash` is the initial stable model selection, checked against Google's model, audio, structured-output and deprecation documentation on 18 September 2026. Check those documents again before changing models or upgrading. The adapter uses Google's `generateContent` REST API with structured JSON output and independent runtime validation, rather than assuming an OpenAI-compatible endpoint supports all features.

Voice and text selection are **independent**. For example, `VOICE_AI_PROVIDER=disabled` keeps typed extraction and summaries working, while `TEXT_AI_PROVIDER=disabled` leaves manual entry available. Only `gemini` and the explicit `disabled` setting are supported in production. Unknown providers return a configuration error. Test mocks are never silently selected.

AI requests require a verified user and same-origin request, bounded input, a timeout, and a per-user database quota (8 requests/minute and 60/day, combined across operations). Failed upstream calls may still consume quota. There are no unbounded automatic retries; users can retry explicitly. Errors are sanitized and input text/audio is not logged by the application.

### Text and summary rules

Bengali, English and mixed descriptions are accepted. Numeric strings are converted to integer poisha by application code. The category allowlist comes from seeded database categories. Unclear fields remain review issues rather than invented values. “Today” and “yesterday” use the supplied Dhaka date context. An omitted date defaults to **today in Asia/Dhaka**, visibly marked in the preview. Drafts are never saved until the user confirms selected, valid rows. Stable request and entry IDs make retries idempotent.

Report calculations happen in the application/database. An incomplete current month is compared with an equivalent previous-month period, with dates displayed. Summaries are generated only on request. To keep amounts trustworthy, Gemini selects relevant calculated fact IDs and a constrained closing message; the application renders the associated Bengali facts and all actual budget overruns. This is deliberately more constrained than free-form financial advice. A changed transaction or budget revision invalidates the previous summary.

### Add another provider

The small provider boundary is under `src/lib/ai`:

```text
contracts.ts        provider-neutral operation/result types
schemas.ts          structured schemas and independent output validation
prompts.ts          business-level instructions
config.ts           environment and capability configuration
registry.ts         adapter selection
adapters/gemini.ts  Gemini authentication, requests, response conversion
service.ts          authenticated application services
core.ts             validated drafts and calculated summary facts
```

Implement the relevant `VoiceProvider` and/or `TextProvider` contracts in a new adapter, normalize failures to the shared error type, register the factory in `registry.ts`, and update capabilities in `config.ts`. Add tests and document its credentials and supported formats. Do not change page components, financial tables or business calculations. Switching between **implemented** adapters then only needs configuration and a restart/redeployment. A provider name in an environment variable does not implement that provider.

## 6. Voice and microphone requirements

Voice means recording an expense description, not a live conversation. It requires HTTPS in production (or localhost), microphone permission, AudioContext and AudioWorklet support. Typed input remains available when recording is unsupported or permission is denied.

The recorder captures PCM through an AudioWorklet, resamples to mono 16 kHz, and **encodes an actual PCM16 WAV**. It does not rename WebM data as WAV. Conversion lives in `src/lib/audio`, not page components. Sixty seconds is approximately 1.92 MB, below the conservative 2 MB default upload cap. Client and server both validate size, duration and silence; the server also verifies the WAV header and PCM format. Lower configured limits reduce the effective recording duration.

Start is explicit. Stop/cancel/navigation releases microphone tracks. After recording, users can play, discard, submit, retry, and edit the returned transcript before extraction. Transcription alone never writes a transaction.

Audio is sent to the configured provider only after submission. It is held temporarily in application memory and sent inline; no permanent audio bucket or provider file upload is created. The UI discloses external processing. **Provider-side handling/retention is governed by that provider's terms; the application does not promise zero retention by Google.**

## 7. Optional visual/demo data

Create and verify a **separate development-only account**, then add its credentials to your private `.env.local`:

```dotenv
DEMO_SEED_CONFIRM=isolated-development-account
DEMO_EMAIL=YOUR_DEVELOPMENT_ACCOUNT
DEMO_PASSWORD=YOUR_PASSWORD
```

Run `npm run seed:demo`. The seeder authenticates normally and respects RLS; it has no admin key. The deterministic April 2025 dataset has income ৳25,000, expenses ৳18,400 and remainder ৳6,600, with six matching category totals, six budgets, and March comparison data. Deterministic IDs prevent accidental repeated seed duplication. Use only one designated demo account per project because fixture IDs are fixed. Production registration never seeds records. Real users default to the actual current month; select April 2025 for this dataset.

## 8. Tests and checks

Fast checks:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

For full local integration/browser tests, use a disposable local Supabase project. The setup script refuses a non-loopback URL or missing explicit confirmation:

```sh
supabase start
supabase status -o env > .env.supabase.local
set -a; . ./.env.supabase.local; set +a
TEST_SETUP_CONFIRM=disposable-local-project node --experimental-strip-types scripts/prepare-test-users.ts
set -a; . ./.env.test.local; set +a
npm run test:integration
npx playwright install --with-deps chromium
npm run build
E2E_PRODUCTION=1 npm run test:e2e
```

The POSIX `set -a` lines export variables from the private test file; use equivalent environment loading on Windows. The test setup uses a local service-role key **only to create/delete isolated test Auth users**. Normal application and integration transaction requests still use authenticated public clients. Do not add that key to production configuration or artifacts.

For direct PostgreSQL policy/constraint tests:

```sh
psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/sql/security.sql
```

That SQL uses real authenticated/anonymous roles, checks cross-user isolation and aggregate/idempotency constraints, and rolls all fixture data back. Review it before running on any hosted project.

`npm run test:visual` captures all eight pages at 360, 390, 768, 1024, 1440 and 1920 pixels. Font readiness and animation suppression make snapshots deterministic. AI response interception is confined to browser tests so the reference review states can be inspected without billing an external model. Compare the saved screenshots with the supplied individual references; generating screenshots alone is not a pixel-perfect claim.

The browser suite exercises synthetic microphone permission/failure/recording/transcript editing. This is not a physical device test. Real Gemini accuracy, Safari/iOS microphone behavior, real Google OAuth, and external email delivery need credentialed/device checks. See `docs/VERIFICATION.md` for the exact evidence and limitations.

An optional `TT_OFFLINE_UI=1 npm run test:e2e` fixture exists for UI-only work. It is explicitly a localhost in-memory protocol fixture under `tests/fixtures`, not Supabase, not a security test, and never part of production provider selection.

## 9. Deployment to Vercel

Import this repository into Vercel using the Next.js preset, root directory `.`, Node 22, install command `npm ci`, build command `npm run build`. Supply the environment variables from `.env.example` in the project settings. Add production Supabase URL/key and the exact application origin. Add the Gemini key only as a server-side environment variable. Keep test flags and test-admin credentials out of Vercel.

After the initial deployment, set Supabase Site URL and allowed redirects to the assigned production domain, then verify registration/login/reset from a real browser. A custom domain also needs its own `APP_ORIGIN` and redirect entries. Environment changes require redeployment. Without Gemini or Google credentials their buttons are honestly unavailable; manual finance features do not depend on them.

Voice uploads are bounded to 2 MB by default. AI routes have 45-second maximum duration metadata and provider timeouts of 30 seconds, configurable up to 40 seconds. Audio is not persisted. The application uses dynamic protected pages and private/no-store responses; do not add shared caching or ISR to user financial routes.

## 10. Security and maintenance

Read `docs/SECURITY.md` before changing SQL or authentication. Keep application dependencies and the lockfile updated together, rerun the suite, and review official API/model lifecycle notices. UI strings are primarily Bengali with the English navigation labels from the references. Layout tokens and responsive rules are centralized in `src/app/globals.css`; small reusable components are under `src/components` and feature components under `src/features`.

Primary documentation: [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Gemini audio](https://ai.google.dev/gemini-api/docs/audio), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [model deprecations](https://ai.google.dev/gemini-api/docs/deprecations), and [Vercel environment variables](https://vercel.com/docs/environment-variables).
