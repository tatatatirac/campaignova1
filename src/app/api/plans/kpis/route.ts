import { NextResponse } from "next/server";
import { z } from "zod";
import { generateExecutionReview } from "@/lib/ai/execution-review";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage
} from "@/lib/ai-usage";
import { calculateExecutionScore, calculateKpis } from "@/lib/kpis";
import {
  kpiExecutionReviewSchema,
  kpiInputSchema,
  kpiTargetsSchema,
  type ExecutionReview
} from "@/lib/schemas/kpis";
import { marketingStrategySchema } from "@/lib/schemas/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  planId: z.uuid(),
  inputs: kpiInputSchema,
  targets: kpiTargetsSchema
});

type SubscriptionPlan = "starter" | "growth" | "director";

const entitlements: Record<SubscriptionPlan, number> = {
  starter: 1,
  growth: 5,
  director: 30
};

function executionStatus(
  score: number,
  completeness: number | null
): ExecutionReview["status"] {
  if ((completeness ?? 0) < 20) {
    return "Insufficient data";
  }

  if (score < 45) {
    return "Needs attention";
  }

  if (score < 75) {
    return "On track";
  }

  return "Strong performance";
}

function validateFunnel(inputs: z.infer<typeof kpiInputSchema>) {
  if (inputs.qualifiedLeads > inputs.leads) {
    return "Qualified leads cannot exceed total leads.";
  }

  if (inputs.bookedCalls > inputs.qualifiedLeads) {
    return "Booked calls cannot exceed qualified leads.";
  }

  if (inputs.sales > inputs.bookedCalls) {
    return "Sales cannot exceed booked calls.";
  }

  if (inputs.periodStart > inputs.periodEnd) {
    return "The review start date must be before the end date.";
  }

  return null;
}

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
      { error: "Invalid KPI review request." },
      { status: 400 }
    );
  }

  const funnelError = validateFunnel(parsedRequest.data.inputs);

  if (funnelError) {
    return NextResponse.json({ error: funnelError }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select("id,company_id,strategy,kpis_version")
    .eq("id", parsedRequest.data.planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "Marketing plan not found." },
      { status: 404 }
    );
  }

  const strategy = marketingStrategySchema.safeParse(plan.strategy);

  if (!strategy.success) {
    return NextResponse.json(
      { error: "Generate the approved strategy before reviewing performance." },
      { status: 409 }
    );
  }

  const [{ data: company }, { data: profile }] = await Promise.all([
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
      .select("subscription_plan")
      .eq("id", ownerId)
      .single()
  ]);

  if (!company || !profile) {
    return NextResponse.json(
      { error: "Business context could not be loaded." },
      { status: 409 }
    );
  }

  const subscriptionPlan = profile.subscription_plan as SubscriptionPlan;
  const videoEntitlement = entitlements[subscriptionPlan];
  const { count: assignedVideos, error: videoError } = await supabase
    .from("video_releases")
    .select("id", { count: "exact", head: true })
    .eq("marketing_plan_id", plan.id)
    .eq("owner_id", ownerId);

  if (videoError || (assignedVideos ?? 0) < videoEntitlement) {
    return NextResponse.json(
      { error: "Assign all entitled ready videos before the execution review." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server review storage is not configured." },
      { status: 503 }
    );
  }

  const usage = await reserveAiUsage({
    request,
    ownerId,
    operation:
      plan.kpis_version > 0
        ? "execution_review_regeneration"
        : "execution_review",
    isRegeneration: plan.kpis_version > 0
  });

  if (!usage.ok) {
    return usage.response;
  }

  const computed = calculateKpis(
    parsedRequest.data.inputs,
    parsedRequest.data.targets,
    videoEntitlement
  );
  const score = calculateExecutionScore(computed);
  const status = executionStatus(score, computed.dataCompletenessRate);
  const version = plan.kpis_version + 1;
  const admin = createAdminClient();
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      kpis_status: "generating",
      kpis_generation_started_at: new Date().toISOString(),
      kpis_generation_completed_at: null,
      kpis_generation_error: null
    })
    .eq("id", plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "Execution review could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateExecutionReview({
      company: { ...company, language: "English" },
      strategy: strategy.data,
      inputs: parsedRequest.data.inputs,
      targets: parsedRequest.data.targets,
      computed,
      status,
      score,
      videoEntitlement
    });
    aiCallCompleted = true;
    const review = kpiExecutionReviewSchema.parse({
      version,
      updatedAt: new Date().toISOString(),
      inputs: parsedRequest.data.inputs,
      targets: parsedRequest.data.targets,
      computed,
      review: result.review
    });
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        kpis: review,
        kpis_status: "ready",
        kpis_model: result.model,
        kpis_version: version,
        kpis_generation_completed_at: new Date().toISOString(),
        kpis_generation_error: null
      })
      .eq("id", plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: plan.company_id,
      event_type: "execution_review_generated",
      quantity: 1,
      metadata: {
        plan_id: plan.id,
        model: result.model,
        mocked: result.mocked,
        version,
        score,
        status
      }
    });
    await completeAiUsage(usage.reservation.id, true);

    return NextResponse.json(
      { review, mocked: result.mocked },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execution review error";

    await admin
      .from("marketing_plans")
      .update({
        kpis_status: "failed",
        kpis_generation_error: message.slice(0, 1_000),
        kpis_generation_completed_at: new Date().toISOString()
      })
      .eq("id", plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Execution review failed. Please try again." },
      { status: 500 }
    );
  }
}
