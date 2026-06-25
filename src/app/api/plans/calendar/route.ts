import { NextResponse } from "next/server";
import { z } from "zod";
import { generateContentCalendar } from "@/lib/ai/calendar";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage
} from "@/lib/ai-usage";
import { marketingStrategySchema } from "@/lib/schemas/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  planId: z.uuid()
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedRequest = requestSchema.safeParse(await request.json());

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid calendar request." },
      { status: 400 }
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select("id,company_id,month,strategy,content_calendar")
    .eq("id", parsedRequest.data.planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Marketing plan not found." }, { status: 404 });
  }

  const parsedStrategy = marketingStrategySchema.safeParse(plan.strategy);

  if (!parsedStrategy.success) {
    return NextResponse.json(
      { error: "Generate a valid strategy before building the calendar." },
      { status: 409 }
    );
  }

  const [{ data: company, error: companyError }, { data: profile }] =
    await Promise.all([
      supabase
        .from("companies")
        .select(
          "name,industry,offer,price_context,audience,location,language,tone,primary_goal,primary_cta,website_url,competitors,differentiator,active_channels"
        )
        .eq("id", plan.company_id)
        .eq("owner_id", ownerId)
        .single(),
      supabase
        .from("profiles")
        .select("timezone")
        .eq("id", ownerId)
        .single()
    ]);

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
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
    operation: plan.content_calendar
      ? "calendar_regeneration"
      : "calendar",
    isRegeneration: Boolean(plan.content_calendar)
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      strategy_approved_at: startedAt,
      calendar_status: "generating",
      calendar_generation_started_at: startedAt,
      calendar_generation_completed_at: null,
      calendar_generation_error: null
    })
    .eq("id", plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "The calendar could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateContentCalendar({
      company,
      strategy: parsedStrategy.data,
      timezone: profile?.timezone || "UTC",
      month: plan.month
    });
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        content_calendar: result.calendar,
        calendar_status: "ready",
        calendar_model: result.model,
        calendar_generation_completed_at: new Date().toISOString(),
        calendar_generation_error: null
      })
      .eq("id", plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: plan.company_id,
      event_type: "calendar_generated",
      quantity: 1,
      metadata: {
        plan_id: plan.id,
        model: result.model,
        mocked: result.mocked,
        item_count: result.calendar.items.length
      }
    });
    await completeAiUsage(usage.reservation.id, true);

    return NextResponse.json(
      {
        calendar: result.calendar,
        planId: plan.id,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown calendar error";

    await admin
      .from("marketing_plans")
      .update({
        calendar_status: "failed",
        calendar_generation_error: message.slice(0, 1_000),
        calendar_generation_completed_at: new Date().toISOString()
      })
      .eq("id", plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Calendar generation failed. Please try again." },
      { status: 500 }
    );
  }
}
