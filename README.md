# Campaignova

Campaignova is an AI Marketing Director that turns a company profile into a
complete 30-day marketing operating system.

## Current product surfaces

- conversion-focused landing page;
- three-step Business Memory onboarding;
- responsive campaign dashboard;
- pricing and plan limits;
- Smart Release Calendar concept;
- Supabase schema with Row Level Security;
- server-side company validation;
- atomic AI usage limits and hashed-IP rate limiting;
- health-check API.

## Local development

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
```

Before a production deploy:

```powershell
npm.cmd run verify
```

After a live deploy:

```powershell
$env:SMOKE_BASE_URL="https://YOUR_DOMAIN"
npm.cmd run smoke:prod
```

## Environment variables

Supabase and OpenAI values are intentionally empty until the projects and API
keys are created. Stripe will be introduced after the US LLC and Stripe account
are ready.

Set `RATE_LIMIT_SALT` to a long random private value in production. Local
development falls back to the existing server secret.

Set `ADMIN_EMAILS` to a comma-separated server-only allowlist. Matching
accounts are promoted to the database-backed admin role after authentication.

## Product documents

- `docs/MVP_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/BRAND.md`
- `docs/SUPABASE_SETUP.md`
- `docs/AI_PIPELINE.md`
- `docs/ADMIN_MONITORING.md`
- `docs/DEPLOYMENT.md`
- `supabase/migrations/001_initial_schema.sql`
