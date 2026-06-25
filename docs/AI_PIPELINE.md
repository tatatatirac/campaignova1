# Campaignova AI pipeline

## Model split

- Strategy and consequential marketing decisions: `gpt-5.5`
- High-volume content production: `gpt-5.4-mini`
- Local development and deterministic E2E tests: `campaignova-mock-v1`

## API design

Campaignova uses the OpenAI Responses API and Structured Outputs:

- `responses.parse`
- Zod schemas through `zodTextFormat`
- `store: false`
- stable instructions first and company-specific JSON last
- `prompt_cache_key` for repeated strategy traffic
- `reasoning.effort: medium` for the strategy pass
- `text.verbosity: low` because the structure already defines the required depth

## Cost and abuse protection

Every paid AI request reserves quota atomically in Supabase before OpenAI is
called. Failed generations release the reservation; successful generations
consume it.

- Starter: 12 AI actions and 5 regenerations per month
- Growth: 34 AI actions and 20 regenerations per month
- Director: 95 AI actions and 60 regenerations per month
- Authenticated user rate limit: 12 AI actions per 10 minutes
- Hashed IP rate limit: 30 AI actions per 10 minutes

Client IP addresses are never stored in plain text. API responses expose the
remaining quota through `X-AI-*` headers and return structured `429` errors when
a monthly or short-window limit is reached.

## MVP language policy

- The interface is English-only.
- Business Memory stores `English` as the content language.
- Strategy, calendar, posts and regenerated content are always produced in
  English.
- Additional languages will be introduced after the MVP as an explicit product
  feature, not inferred from user input.

The JSON structure is enforced by
`src/lib/schemas/strategy.ts`; it is not described manually inside the prompt.

## Strategy-first workflow

1. Authenticate the user.
2. Load the company only when it belongs to that user.
3. Create or update the monthly plan as `generating`.
4. Generate and validate the strategic decisions.
5. Store the strategy and model metadata.
6. Mark the plan `ready`.
7. Record a usage event.
8. Generate calendar and content only from an approved strategy.

All AI endpoints use the central guard in `src/lib/ai-usage.ts`. Manual edits
do not consume AI quota.

Direct browser writes to `marketing_plans` remain blocked. The API route performs
plan writes with the server-only Supabase key.

## Required private environment variables

```dotenv
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
OPENAI_STRATEGY_MODEL=gpt-5.5
OPENAI_CONTENT_MODEL=gpt-5.4-mini
OPENAI_MOCK=false
RATE_LIMIT_SALT=
```

Never expose the first two variables through `NEXT_PUBLIC_`, Git, screenshots,
support messages or browser code.

## Current endpoints

`POST /api/plans/strategy`

Body:

```json
{
  "companyId": "uuid",
  "month": "2026-07-01"
}
```

The endpoint authenticates ownership, generates the structured strategy, saves
it to `marketing_plans.strategy` and records `strategy_generated`.

`POST /api/plans/calendar`

The endpoint requires an existing valid strategy, records strategy approval,
generates exactly 30 ordered local-time content moves with `gpt-5.4-mini`,
saves them to `marketing_plans.content_calendar` and records
`calendar_generated`.

`POST /api/plans/posts`

The endpoint requires a valid approved calendar and creates exactly 30
publishable posts with `gpt-5.4-mini` in three isolated batches of ten. It
stores the validated result in `marketing_plans.posts` and records
`posts_generated`.

`PATCH /api/plans/posts`

The endpoint saves user edits or regenerates one selected day while preserving
the approved date, platform, format and content pillar. It records
`post_edited` or `post_regenerated`.

`POST /api/plans/emails`

The endpoint requires the approved strategy, calendar and 30 validated posts.
It creates a five-email English conversion sequence with subject lines, preview
text, complete body copy, calls to action and increasing send days. It records
`email_campaign_generated`.

`PATCH /api/plans/emails`

The endpoint saves a manual edit or regenerates one selected email without
rebuilding the other four. It records `email_edited` or `email_regenerated`.

`POST /api/plans/landing-page`

The endpoint requires the approved strategy and five-email campaign. It creates
complete English conversion copy for the hero, problem, solution, benefits,
process, offer, trust, FAQ, final call to action and SEO fields. It records
`landing_page_generated`.

`PATCH /api/plans/landing-page`

The endpoint validates and saves user edits while preserving the system-managed
landing-page version. It records `landing_page_edited`.

`POST /api/plans/sales-pitch`

The endpoint requires the approved strategy and landing page. It creates an
English sales conversation toolkit with an elevator pitch, discovery questions,
offer presentation, five objection responses, closing scripts and follow-up
messages. It records `sales_pitch_generated`.

`PATCH /api/plans/sales-pitch`

The endpoint validates and saves user edits while preserving the system-managed
sales-pitch version. It records `sales_pitch_edited`.

`POST /api/plans/videos`

The endpoint assigns the package entitlement from the active ready-video
library: Starter 1, Growth 5 and Director 30. The first video is available
immediately. Remaining releases unlock 24 hours before their recommended local
publishing time. It records `ready_videos_assigned`.

`GET /api/plans/videos`

The endpoint returns owned release metadata with short-lived clean preview
links, release timers, recommended publishing times and current availability.
Private MP4 files are never exposed through public storage URLs.

`PATCH /api/plans/videos`

The endpoint creates short-lived entitled download links, records downloads,
marks a video as published or unlocks all scheduled videos after explicit user
acknowledgment. It records `ready_video_downloaded` or
`ready_videos_unlocked_early`.

`POST /api/plans/kpis`

The endpoint accepts verified campaign results and commercial targets after the
full ready-video entitlement is assigned. Campaignova calculates execution,
funnel conversion, CPL, CAC, ROAS, target attainment and data completeness
before sending the fixed numbers to the AI Marketing Director for a structured
stop/start/continue review. It records `execution_review_generated`.

## Next pipeline stages

The core MVP generation and execution-review pipeline is complete.

Each stage will have its own schema, retry boundary and usage event instead of
one oversized response.
