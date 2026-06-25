# Supabase cloud setup

## Decision

Use a new managed Supabase project for the MVP.

Assumption: the first paying audience is primarily in the United States, so the
recommended database region is **East US (North Virginia)**. If the first beta
customers are primarily European, choose **Central EU (Frankfurt)** instead.

## Create the project

1. Open `https://supabase.com/dashboard/new`.
2. Choose the organization that will own Campaignova.
3. Project name: `Campaignova`.
4. Generate a strong database password and save it in a password manager.
5. Region: `East US (North Virginia)`.
6. Start on the Free plan for private beta.

Never paste the database password, secret key or OpenAI key into chat, Git,
screenshots or documentation.

## Connect the repository

After the project is ready:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push
```

The repository already contains:

- `supabase/config.toml`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/seed.sql`

The migration creates the application tables, RLS policies, grants and private
Storage buckets.

## Configure Next.js

Copy `.env.example` to `.env.local` and fill:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Use the project's **Connect** dialog to copy the URL and publishable key. Create
or copy a secret key only for server-side operations. The secret key bypasses
Row Level Security and must never use the `NEXT_PUBLIC_` prefix.

## Dashboard configuration

In Authentication:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- Email confirmation: enabled
- Minimum password length: 10

Add the production Vercel URL and final domain before public launch.

## Verification

After environment variables and migration are installed:

```powershell
npm.cmd run dev
```

Then verify:

1. Create an account on `/login?mode=signup`.
2. Confirm the email.
3. Complete onboarding.
4. Confirm the `profiles` row was created automatically.
5. Confirm one user cannot read another user's company or plan.
6. Upload a logo only under `brand-assets/<user-id>/...`.

