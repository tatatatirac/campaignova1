# Campaignova admin and monitoring

## Access control

- `/admin` requires an authenticated profile with `app_role = admin`.
- Non-admin users are redirected to `/app`.
- `ADMIN_EMAILS` is a server-only bootstrap allowlist. A matching authenticated
  account is promoted once; authorization after that is based on the database
  role.
- The Supabase secret key remains server-only.

## Admin control room

The dashboard shows:

- registered users, subscription plans and database roles;
- companies and current monthly AI usage;
- seven-day AI reservation success and release rates;
- failed campaign stages;
- database latency and OpenAI configuration status;
- the latest security and operational audit events.

## Automatic audit events

Supabase triggers record:

- user creation;
- company creation, update and deletion;
- admin role changes;
- completed or released AI reservations;
- failed strategy, calendar, posts, email, landing page, sales pitch and
  execution-review stages.

Company deletion keeps the previous owner identifier in metadata while leaving
`actor_id` empty, so deleting an account cannot be blocked by an audit foreign
key.

## Health endpoint

`GET /api/health` performs a live database check and returns `200` when healthy
or `503` when degraded. Responses are never cached.
