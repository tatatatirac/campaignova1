import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMarketingStrategy } from "@/lib/ai/strategy";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage
} from "@/lib/ai-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  companyId: z.uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-01$/)
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
      { error: "Invalid generation request." },
      { status: 400 }
    );
  }

  const { companyId, month } = parsedRequest.data;
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "name,industry,offer,price_context,audience,location,language,tone,primary_goal,primary_cta,website_url,competitors,differentiator,active_channels"
    )
    .eq("id", companyId)
    .eq("owner_id", ownerId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server generation storage is not configured." },
      { status: 503 }
    );
  }

  const { data: existingPlan } = await supabase
    .from("marketing_plans")
    .select("strategy")
    .eq("company_id", companyId)
    .eq("owner_id", ownerId)
    .eq("month", month)
    .maybeSingle();
  const isRegeneration = Boolean(existingPlan?.strategy);
  const usage = await reserveAiUsage({
    request,
    ownerId,
    operation: isRegeneration ? "strategy_regeneration" : "strategy",
    isRegeneration
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const { data: plan, error: planError } = await admin
    .from("marketing_plans")
    .upsert(
      {
        company_id: companyId,
        owner_id: ownerId,
        month,
        status: "generating",
        generation_started_at: startedAt,
        generation_completed_at: null,
        generation_error: null
      },
      { onConflict: "company_id,month" }
    )
    .select("id")
    .single();

  if (planError || !plan) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "The marketing plan could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateMarketingStrategy(company);
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        status: "ready",
        strategy: result.strategy,
        strategy_model: result.model,
        generation_completed_at: new Date().toISOString(),
        generation_error: null
      })
      .eq("id", plan.id);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: companyId,
      event_type: "strategy_generated",
      quantity: 1,
      metadata: {
        plan_id: plan.id,
        model: result.model,
        mocked: result.mocked
      }
    });
    await completeAiUsage(usage.reservation.id, true);

    return NextResponse.json(
      {
        strategy: result.strategy,
        planId: plan.id,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown generation error";

    await admin
      .from("marketing_plans")
      .update({
        status: "failed",
        generation_error: message.slice(0, 1_000),
        generation_completed_at: new Date().toISOString()
      })
      .eq("id", plan.id);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Strategy generation failed. Please try again." },
      { status: 500 }
    );
  }
}
