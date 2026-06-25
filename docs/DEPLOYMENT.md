# Campaignova deployment checklist

This is the production path for the first live version on Vercel with Supabase.

## 1. Preflight

Run locally before every deploy:

```powershell
npm.cmd install
npm.cmd run verify
npm.cmd run check:env
```

The build must pass with:

- TypeScript clean
- Next.js build clean
- zero production dependency vulnerabilities
- production environment variables complete

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same core
checks on push and pull request.

## 2. Required production environment variables

Add these in Vercel Project Settings -> Environment Variables.

```text
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=sk-proj-...
OPENAI_STRATEGY_MODEL=gpt-5.5
OPENAI_CONTENT_MODEL=gpt-5.4-mini
OPENAI_MOCK=false
RATE_LIMIT_SALT=long-random-private-value
ADMIN_EMAILS=your-admin@email.com
```

Production rules:

- `OPENAI_MOCK` must be `false`.
- `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `RATE_LIMIT_SALT`, and `ADMIN_EMAILS`
  must never use `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL` must match the final deployed URL exactly.
- Generate a strong `RATE_LIMIT_SALT` and keep it private.

PowerShell salt generator:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Production env check:

```powershell
npm.cmd run check:env
```

By default, this reads `.env.production.local` if it exists, otherwise
`.env.local`. It prints key names only, never secret values.

## 3. Supabase production settings

In Supabase Dashboard -> Authentication -> URL Configuration:

```text
Site URL:
https://YOUR_DOMAIN

Redirect URLs:
https://YOUR_DOMAIN/auth/callback
http://localhost:3000/auth/callback
```

Keep localhost only for development.

Check storage buckets exist:

- `brand-assets`
- `video-previews`
- `video-assets`

Check database migrations:

```powershell
npx.cmd supabase migration list
```

The remote project should show migrations `001` through the latest local
migration.

## 4. Vercel deploy

Recommended path:

1. Push the repository to GitHub.
2. Import the repo in Vercel.
3. Select framework: Next.js.
4. Add production environment variables.
5. Add the same environment variables as GitHub repository secrets if CI should
   build against production-like values.
6. Deploy.
7. Add custom domain when ready.
8. Configure `hello@campaignova.com` or update footer, privacy and terms
   contact links before public launch.

Local CLI path if Vercel CLI is installed and authenticated:

```powershell
npx.cmd vercel
npx.cmd vercel --prod
```

Do not run production deploy before the environment variables are complete.

## 5. Smoke test after deploy

Run this after Vercel gives the production URL:

```powershell
$env:SMOKE_BASE_URL="https://YOUR_DOMAIN"
npm.cmd run smoke:prod
```

Expected result:

- landing page returns 200;
- login page returns 200;
- anonymous `/app` redirects to login;
- `/api/health` returns status `ok`;
- database check returns `ok`.

## 6. Manual live checklist

After smoke test passes:

- create a real admin account with the email from `ADMIN_EMAILS`;
- confirm `/admin` is visible for that account;
- run onboarding with a test business;
- generate strategy;
- generate calendar, posts, emails, landing page, sales pitch;
- assign ready videos;
- download PDF;
- download PPTX;
- confirm sign out works;
- confirm mobile dashboard opens cleanly.

## 7. Go-live blockers

Do not send paid users until these are true:

- production health is `ok`;
- OpenAI generation works with `OPENAI_MOCK=false`;
- Supabase Auth redirect URLs are correct;
- PDF and PPTX exports work in production;
- video storage has real assets for every paid package;
- admin account can access `/admin`;
- at least one full end-to-end campaign was tested on the production domain.
