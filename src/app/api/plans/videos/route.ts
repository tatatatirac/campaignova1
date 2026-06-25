import { NextResponse } from "next/server";
import { z } from "zod";
import { contentCalendarSchema } from "@/lib/schemas/calendar";
import type { VideoReleaseView } from "@/lib/schemas/videos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/timezone";

const planIdSchema = z.uuid();

const assignRequestSchema = z.object({
  action: z.literal("assign"),
  planId: planIdSchema
});

const updateRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("unlock_all"),
    planId: planIdSchema,
    acknowledged: z.literal(true)
  }),
  z.object({
    action: z.literal("download"),
    planId: planIdSchema,
    releaseId: z.uuid()
  }),
  z.object({
    action: z.literal("mark_published"),
    planId: planIdSchema,
    releaseId: z.uuid()
  })
]);

type SubscriptionPlan = "starter" | "growth" | "director";

type Asset = {
  id: string;
  title: string;
  description: string | null;
  industry_tags: string[];
  platform_tags: string[];
  duration_seconds: number;
  storage_path: string;
  preview_path: string;
  thumbnail_path: string | null;
};

const entitlements: Record<SubscriptionPlan, number> = {
  starter: 1,
  growth: 5,
  director: 30
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function scoreAsset(asset: Asset, industry: string, channels: string[]) {
  const industryValue = normalize(industry);
  const channelValues = channels.map(normalize);
  let score = 0;

  for (const tag of asset.industry_tags) {
    const normalizedTag = normalize(tag);

    if (
      normalizedTag === industryValue ||
      industryValue.includes(normalizedTag) ||
      normalizedTag.includes(industryValue)
    ) {
      score += 20;
    } else if (
      ["services", "service-business", "local-business", "general"].includes(
        normalizedTag
      )
    ) {
      score += 4;
    }
  }

  for (const tag of asset.platform_tags) {
    if (channelValues.includes(normalize(tag))) {
      score += 3;
    }
  }

  return score;
}

async function loadPlan(planId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select("id,company_id,content_calendar,sales_pitch")
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const calendar = contentCalendarSchema.safeParse(plan.content_calendar);

  if (!calendar.success || !plan.sales_pitch) {
    return null;
  }

  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase
      .from("companies")
      .select("industry,active_channels")
      .eq("id", plan.company_id)
      .eq("owner_id", ownerId)
      .single(),
    supabase
      .from("profiles")
      .select("subscription_plan,timezone")
      .eq("id", ownerId)
      .single()
  ]);

  if (!company || !profile) {
    return null;
  }

  return {
    plan,
    calendar: calendar.data,
    company,
    profile: {
      subscription_plan: profile.subscription_plan as SubscriptionPlan,
      timezone: profile.timezone || "UTC"
    }
  };
}

async function signedUrl(
  bucket: "video-previews" | "video-assets",
  path: string | null,
  expiresIn: number
) {
  if (!path) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  return error ? null : data.signedUrl;
}

async function listReleases(
  planId: string,
  ownerId: string,
  subscriptionPlan: SubscriptionPlan,
  timezone: string
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("video_releases")
    .select(
      "id,video_asset_id,release_at,publish_at,platform,caption,call_to_action,status,unlocked_early_at,downloaded_at,published_at,video_assets(title,description,duration_seconds,storage_path,preview_path,thumbnail_path)"
    )
    .eq("marketing_plan_id", planId)
    .eq("owner_id", ownerId)
    .order("publish_at");

  if (error) {
    throw error;
  }

  const now = Date.now();
  const releases = await Promise.all(
    (data ?? []).map(async (release) => {
      const joined = release.video_assets;
      const asset = (Array.isArray(joined) ? joined[0] : joined) as
        | {
            title: string;
            description: string | null;
            duration_seconds: number;
            storage_path: string;
            preview_path: string;
            thumbnail_path: string | null;
          }
        | null;

      if (!asset) {
        throw new Error("Assigned video metadata is missing.");
      }

      const isAvailable =
        Boolean(release.unlocked_early_at) ||
        new Date(release.release_at).getTime() <= now;

      return {
        id: release.id,
        assetId: release.video_asset_id,
        title: asset.title,
        description: asset.description,
        durationSeconds: asset.duration_seconds,
        platform: release.platform,
        caption: release.caption,
        callToAction: release.call_to_action,
        releaseAt: release.release_at,
        publishAt: release.publish_at,
        status: isAvailable
          ? release.status === "scheduled"
            ? "available"
            : release.status
          : "scheduled",
        isAvailable,
        unlockedEarly: Boolean(release.unlocked_early_at),
        previewUrl: await signedUrl(
          "video-previews",
          asset.preview_path,
          60 * 60
        ),
        thumbnailUrl: asset.thumbnail_path
          ? await signedUrl(
              "video-previews",
              asset.thumbnail_path,
              60 * 60
            )
          : null,
        downloadedAt: release.downloaded_at,
        publishedAt: release.published_at
      } satisfies VideoReleaseView;
    })
  );

  return {
    plan: subscriptionPlan,
    entitlement: entitlements[subscriptionPlan],
    timezone,
    assignedCount: releases.length,
    releases
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planId = new URL(request.url).searchParams.get("planId");
  const parsedPlanId = planIdSchema.safeParse(planId);

  if (!parsedPlanId.success) {
    return NextResponse.json(
      { error: "Invalid video library request." },
      { status: 400 }
    );
  }

  const context = await loadPlan(parsedPlanId.data, ownerId);

  if (!context) {
    return NextResponse.json(
      { error: "Complete the sales pitch before assigning ready videos." },
      { status: 409 }
    );
  }

  try {
    return NextResponse.json(
      await listReleases(
        context.plan.id,
        ownerId,
        context.profile.subscription_plan,
        context.profile.timezone
      )
    );
  } catch {
    return NextResponse.json(
      { error: "The video library could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedRequest = assignRequestSchema.safeParse(await request.json());

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid video assignment request." },
      { status: 400 }
    );
  }

  const context = await loadPlan(parsedRequest.data.planId, ownerId);

  if (!context) {
    return NextResponse.json(
      { error: "Complete the sales pitch before assigning ready videos." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server video storage is not configured." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const entitlement = entitlements[context.profile.subscription_plan];
  const { data: existing, error: existingError } = await admin
    .from("video_releases")
    .select("id")
    .eq("marketing_plan_id", context.plan.id)
    .eq("owner_id", ownerId);

  if (existingError) {
    return NextResponse.json(
      { error: "Existing video assignments could not be checked." },
      { status: 500 }
    );
  }

  if ((existing ?? []).length > 0) {
    return NextResponse.json(
      await listReleases(
        context.plan.id,
        ownerId,
        context.profile.subscription_plan,
        context.profile.timezone
      )
    );
  }

  const { data: assets, error: assetsError } = await admin
    .from("video_assets")
    .select(
      "id,title,description,industry_tags,platform_tags,duration_seconds,storage_path,preview_path,thumbnail_path"
    )
    .eq("is_active", true)
    .limit(200);

  if (assetsError) {
    return NextResponse.json(
      { error: "The ready-video library could not be loaded." },
      { status: 500 }
    );
  }

  const rankedAssets = ((assets ?? []) as Asset[])
    .map((asset) => ({
      asset,
      score: scoreAsset(
        asset,
        context.company.industry,
        context.company.active_channels
      )
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.asset.title.localeCompare(second.asset.title)
    )
    .slice(0, entitlement)
    .map(({ asset }) => asset);

  if (rankedAssets.length < entitlement) {
    return NextResponse.json(
      {
        error: `The library currently has ${rankedAssets.length} eligible videos. ${entitlement} are required for this plan.`
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const orderedCalendar = [...context.calendar.items].sort(
    (first, second) => first.dayNumber - second.dayNumber
  );
  const releaseRows = rankedAssets.map((asset, index) => {
    const calendarItem =
      orderedCalendar[index % orderedCalendar.length] ??
      orderedCalendar[0];
    const publishAt = zonedDateTimeToUtc(
      calendarItem.date,
      calendarItem.publishTimeLocal,
      context.profile.timezone
    );
    const recommendedReleaseAt = new Date(
      publishAt.getTime() - 24 * 60 * 60 * 1_000
    );
    const releaseAt =
      index === 0 || recommendedReleaseAt <= now
        ? now
        : recommendedReleaseAt;

    return {
      marketing_plan_id: context.plan.id,
      video_asset_id: asset.id,
      owner_id: ownerId,
      release_at: releaseAt.toISOString(),
      publish_at: publishAt.toISOString(),
      platform: calendarItem.platform,
      caption: calendarItem.hook,
      call_to_action: calendarItem.callToAction,
      status: releaseAt <= now ? "available" : "scheduled"
    };
  });

  const { error: insertError } = await admin
    .from("video_releases")
    .insert(releaseRows);

  if (insertError) {
    return NextResponse.json(
      { error: "Ready videos could not be assigned." },
      { status: 500 }
    );
  }

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type: "ready_videos_assigned",
    quantity: rankedAssets.length,
    metadata: {
      plan_id: context.plan.id,
      subscription_plan: context.profile.subscription_plan,
      entitlement
    }
  });

  return NextResponse.json(
    await listReleases(
      context.plan.id,
      ownerId,
      context.profile.subscription_plan,
      context.profile.timezone
    )
  );
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedRequest = updateRequestSchema.safeParse(await request.json());

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid video update request." },
      { status: 400 }
    );
  }

  const context = await loadPlan(parsedRequest.data.planId, ownerId);

  if (!context) {
    return NextResponse.json(
      { error: "The marketing plan could not be loaded." },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  if (parsedRequest.data.action === "unlock_all") {
    const unlockedAt = new Date().toISOString();
    const { count: scheduledCount, error: countError } = await admin
      .from("video_releases")
      .select("id", { count: "exact", head: true })
      .eq("marketing_plan_id", context.plan.id)
      .eq("owner_id", ownerId)
      .eq("status", "scheduled")
      .gt("release_at", unlockedAt);

    if (countError) {
      return NextResponse.json(
        { error: "Scheduled videos could not be checked." },
        { status: 500 }
      );
    }

    const { error } = await admin
      .from("video_releases")
      .update({
        unlocked_early_at: unlockedAt,
        status: "available"
      })
      .eq("marketing_plan_id", context.plan.id)
      .eq("owner_id", ownerId)
      .eq("status", "scheduled")
      .gt("release_at", unlockedAt);

    if (error) {
      return NextResponse.json(
        { error: "The videos could not be unlocked." },
        { status: 500 }
      );
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: context.plan.company_id,
      event_type: "ready_videos_unlocked_early",
      quantity: scheduledCount ?? 0,
      metadata: {
        plan_id: context.plan.id,
        acknowledged: true
      }
    });

    return NextResponse.json(
      await listReleases(
        context.plan.id,
        ownerId,
        context.profile.subscription_plan,
        context.profile.timezone
      )
    );
  }

  const { data: release, error: releaseError } = await admin
    .from("video_releases")
    .select(
      "id,status,release_at,unlocked_early_at,video_assets(storage_path)"
    )
    .eq("id", parsedRequest.data.releaseId)
    .eq("marketing_plan_id", context.plan.id)
    .eq("owner_id", ownerId)
    .single();

  if (releaseError || !release) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const isAvailable =
    Boolean(release.unlocked_early_at) ||
    new Date(release.release_at).getTime() <= Date.now();

  if (parsedRequest.data.action === "mark_published") {
    if (!isAvailable) {
      return NextResponse.json(
        { error: "This video cannot be published before it is released." },
        { status: 409 }
      );
    }

    const publishedAt = new Date().toISOString();
    const { error } = await admin
      .from("video_releases")
      .update({ status: "published", published_at: publishedAt })
      .eq("id", release.id)
      .eq("owner_id", ownerId);

    if (error) {
      return NextResponse.json(
        { error: "The video could not be marked as published." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      await listReleases(
        context.plan.id,
        ownerId,
        context.profile.subscription_plan,
        context.profile.timezone
      )
    );
  }

  if (!isAvailable) {
    return NextResponse.json(
      { error: "This video is still scheduled. Wait for its release or unlock all videos." },
      { status: 409 }
    );
  }

  const joined = release.video_assets;
  const asset = (Array.isArray(joined) ? joined[0] : joined) as
    | { storage_path: string }
    | null;
  const downloadUrl = asset
    ? await signedUrl("video-assets", asset.storage_path, 10 * 60)
    : null;

  if (!downloadUrl) {
    return NextResponse.json(
      { error: "The download file is not available." },
      { status: 404 }
    );
  }

  const downloadedAt = new Date().toISOString();
  await admin
    .from("video_releases")
    .update({
      ...(release.status === "published" ? {} : { status: "downloaded" }),
      downloaded_at: downloadedAt
    })
    .eq("id", release.id)
    .eq("owner_id", ownerId);

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type: "ready_video_downloaded",
    quantity: 1,
    metadata: {
      plan_id: context.plan.id,
      release_id: release.id
    }
  });

  return NextResponse.json({ downloadUrl });
}
