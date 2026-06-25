# Technical architecture

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Next.js Route Handlers
- Supabase Auth, PostgreSQL and Storage
- OpenAI Responses API with Structured Outputs
- Zod for server-side input and output validation
- Vercel for hosting
- PostHog for product analytics
- Sentry for errors and performance monitoring
- Stripe Billing after company setup is complete

## Generation pipeline

One oversized model response is intentionally avoided.

1. Normalize and validate the company profile.
2. Generate strategy and strategic decisions.
3. Save a versioned strategy.
4. Generate content calendar from the approved strategy.
5. Generate posts, video scripts, emails and landing copy in parallel jobs.
6. Validate every structured result.
7. Run a final consistency and duplication check.
8. Match entitled library videos to calendar items.

The user sees progress per section and can retry only a failed section.

## Security boundaries

- Supabase Row Level Security isolates every customer record.
- Service-role keys are server-only.
- OpenAI keys never reach the browser.
- Download links are short-lived signed URLs.
- Video entitlements are checked on the server before URL creation.
- Plan limits are enforced server-side.
- All AI inputs are validated and length-limited.
- Generation requests are idempotent and rate-limited.
- Admin changes and bulk unlock actions are written to an audit log.

## Time handling

- User stores an IANA timezone such as `Europe/Belgrade`.
- Publishing and release times are stored as UTC timestamps.
- UI converts timestamps to the user's timezone.
- Unlock checks use server time, never device time.

## Deployment phases

1. Local development with mocked generation.
2. Supabase development project and OpenAI test key.
3. Vercel preview deployments.
4. Private beta with manual account approval.
5. Production Supabase project, backups, monitoring and custom domain.
6. Stripe Billing after the LLC and account are available.

