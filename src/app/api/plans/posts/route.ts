import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePosts, regeneratePost } from "@/lib/ai/posts";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage,
  type AiUsageReservation
} from "@/lib/ai-usage";
import { contentCalendarSchema } from "@/lib/schemas/calendar";
import {
  generatedPostSchema,
  generatedPostsSchema
} from "@/lib/schemas/posts";
import { marketingStrategySchema } from "@/lib/schemas/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const generateRequestSchema = z.object({
  planId: z.uuid()
});

const updateRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    planId: z.uuid(),
    dayNumber: z.number().int().min(1).max(30),
    post: generatedPostSchema
  }),
  z.object({
    action: z.literal("regenerate"),
    planId: z.uuid(),
    dayNumber: z.number().int().min(1).max(30)
  })
]);

async function loadGenerationContext(planId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select(
      "id,company_id,strategy,content_calendar,posts,posts_version,posts_model"
    )
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const strategy = marketingStrategySchema.safeParse(plan.strategy);
  const calendar = contentCalendarSchema.safeParse(plan.content_calendar);

  if (!strategy.success || !calendar.success) {
    return null;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "name,industry,offer,price_context,audience,location,language,tone,primary_goal,primary_cta,website_url,competitors,differentiator,active_channels"
    )
    .eq("id", plan.company_id)
    .eq("owner_id", ownerId)
    .single();

  if (companyError || !company) {
    return null;
  }

  return {
    plan,
    company,
    strategy: strategy.data,
    calendar: calendar.data
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedRequest = generateRequestSchema.safeParse(await request.json());

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid posts request." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );

  if (!context) {
    return NextResponse.json(
      { error: "Generate and approve the calendar before producing posts." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server generation storage is not configured." },
      { status: 503 }
    );
  }

  const usage = await reserveAiUsage({
    request,
    ownerId,
    operation: generatedPostsSchema.safeParse(context.plan.posts).success
      ? "posts_regeneration"
      : "posts",
    isRegeneration: generatedPostsSchema.safeParse(context.plan.posts).success
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const version = context.plan.posts_version + 1;
  const startedAt = new Date().toISOString();
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      posts_status: "generating",
      posts_generation_started_at: startedAt,
      posts_generation_completed_at: null,
      posts_generation_error: null
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "Post production could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generatePosts({
      company: context.company,
      strategy: context.strategy,
      calendar: context.calendar,
      version
    });
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        posts: result.result,
        posts_status: "ready",
        posts_model: result.model,
        posts_version: version,
        posts_generation_completed_at: new Date().toISOString(),
        posts_generation_error: null
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: context.plan.company_id,
      event_type: "posts_generated",
      quantity: 30,
      metadata: {
        plan_id: context.plan.id,
        model: result.model,
        mocked: result.mocked,
        version
      }
    });
    await completeAiUsage(usage.reservation.id, true);

    return NextResponse.json(
      {
        posts: result.result,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown post generation error";

    await admin
      .from("marketing_plans")
      .update({
        posts_status: "failed",
        posts_generation_error: message.slice(0, 1_000),
        posts_generation_completed_at: new Date().toISOString()
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Post generation failed. Please try again." },
      { status: 500 }
    );
  }
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
      { error: "Invalid post update." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );
  const existingPosts = generatedPostsSchema.safeParse(context?.plan.posts);

  if (!context || !existingPosts.success) {
    return NextResponse.json(
      { error: "Generate the 30 posts before editing them." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server post storage is not configured." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const posts = [...existingPosts.data.posts];
  const postIndex = posts.findIndex(
    (post) => post.dayNumber === parsedRequest.data.dayNumber
  );

  if (postIndex < 0) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  let model = context.plan.posts_model || "manual-edit";
  let mocked = false;
  let usageReservation: AiUsageReservation | null = null;

  if (parsedRequest.data.action === "edit") {
    const calendarItem = context.calendar.items.find(
      (item) => item.dayNumber === parsedRequest.data.dayNumber
    );

    if (
      !calendarItem ||
      parsedRequest.data.post.date !== calendarItem.date ||
      parsedRequest.data.post.platform !== calendarItem.platform ||
      parsedRequest.data.post.format !== calendarItem.format ||
      parsedRequest.data.post.contentPillar !== calendarItem.contentPillar
    ) {
      return NextResponse.json(
        { error: "Approved calendar fields cannot be edited here." },
        { status: 400 }
      );
    }

    posts[postIndex] = parsedRequest.data.post;
    model = "manual-edit";
  } else {
    const usage = await reserveAiUsage({
      request,
      ownerId,
      operation: "post_regeneration",
      isRegeneration: true
    });

    if (!usage.ok) {
      return usage.response;
    }

    usageReservation = usage.reservation;

    try {
      const result = await regeneratePost(
        {
          company: context.company,
          strategy: context.strategy,
          calendar: context.calendar
        },
        parsedRequest.data.dayNumber
      );
      posts[postIndex] = result.post;
      model = result.model;
      mocked = result.mocked;
    } catch {
      await completeAiUsage(usageReservation.id, false);

      return NextResponse.json(
        { error: "Post regeneration failed. Please try again." },
        { status: 500 }
      );
    }
  }

  const updatedPayload = generatedPostsSchema.parse({
    version: existingPosts.data.version,
    posts
  });
  const { error: updateError } = await admin
    .from("marketing_plans")
    .update({ posts: updatedPayload, posts_model: model })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (updateError) {
    if (usageReservation) {
      await completeAiUsage(usageReservation.id, true);
    }

    return NextResponse.json(
      { error: "The post could not be saved." },
      { status: 500 }
    );
  }

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type:
      parsedRequest.data.action === "edit"
        ? "post_edited"
        : "post_regenerated",
    quantity: 1,
    metadata: {
      plan_id: context.plan.id,
      day_number: parsedRequest.data.dayNumber,
      model,
      mocked
    }
  });
  if (usageReservation) {
    await completeAiUsage(usageReservation.id, true);
  }

  return NextResponse.json(
    {
      post: posts[postIndex],
      posts: updatedPayload
    },
    usageReservation
      ? { headers: aiUsageResponseHeaders(usageReservation) }
      : undefined
  );
}
