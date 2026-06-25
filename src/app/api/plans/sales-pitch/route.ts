import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSalesPitch } from "@/lib/ai/sales-pitch";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage
} from "@/lib/ai-usage";
import { landingPageSchema } from "@/lib/schemas/landing-page";
import { salesPitchSchema } from "@/lib/schemas/sales-pitch";
import { marketingStrategySchema } from "@/lib/schemas/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const generateRequestSchema = z.object({
  planId: z.uuid()
});

const editRequestSchema = z.object({
  action: z.literal("edit"),
  planId: z.uuid(),
  pitch: salesPitchSchema
});

async function loadGenerationContext(planId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select(
      "id,company_id,strategy,landing_page,sales_pitch,sales_pitch_version,sales_pitch_model"
    )
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const strategy = marketingStrategySchema.safeParse(plan.strategy);
  const landingPage = landingPageSchema.safeParse(plan.landing_page);

  if (!strategy.success || !landingPage.success) {
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
    company: { ...company, language: "English" },
    strategy: strategy.data,
    landingPage: landingPage.data
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
      { error: "Invalid sales pitch request." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );

  if (!context) {
    return NextResponse.json(
      { error: "Generate the landing page before producing the sales pitch." },
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
    operation: salesPitchSchema.safeParse(context.plan.sales_pitch).success
      ? "sales_pitch_regeneration"
      : "sales_pitch",
    isRegeneration: salesPitchSchema.safeParse(context.plan.sales_pitch)
      .success
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const version = context.plan.sales_pitch_version + 1;
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      sales_pitch_status: "generating",
      sales_pitch_generation_started_at: new Date().toISOString(),
      sales_pitch_generation_completed_at: null,
      sales_pitch_generation_error: null
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "Sales pitch production could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateSalesPitch({
      company: context.company,
      strategy: context.strategy,
      landingPage: context.landingPage,
      version
    });
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        sales_pitch: result.pitch,
        sales_pitch_status: "ready",
        sales_pitch_model: result.model,
        sales_pitch_version: version,
        sales_pitch_generation_completed_at: new Date().toISOString(),
        sales_pitch_generation_error: null
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: context.plan.company_id,
      event_type: "sales_pitch_generated",
      quantity: 1,
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
        pitch: result.pitch,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sales pitch error";

    await admin
      .from("marketing_plans")
      .update({
        sales_pitch_status: "failed",
        sales_pitch_generation_error: message.slice(0, 1_000),
        sales_pitch_generation_completed_at: new Date().toISOString()
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Sales pitch generation failed. Please try again." },
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

  const parsedRequest = editRequestSchema.safeParse(await request.json());

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid sales pitch update." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );
  const existingPitch = salesPitchSchema.safeParse(context?.plan.sales_pitch);

  if (!context || !existingPitch.success) {
    return NextResponse.json(
      { error: "Generate the sales pitch before editing it." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server sales pitch storage is not configured." },
      { status: 503 }
    );
  }

  const updatedPitch = salesPitchSchema.parse({
    ...parsedRequest.data.pitch,
    version: existingPitch.data.version
  });
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("marketing_plans")
    .update({
      sales_pitch: updatedPitch,
      sales_pitch_model: "manual-edit"
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (updateError) {
    return NextResponse.json(
      { error: "The sales pitch could not be saved." },
      { status: 500 }
    );
  }

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type: "sales_pitch_edited",
    quantity: 1,
    metadata: {
      plan_id: context.plan.id,
      model: "manual-edit"
    }
  });

  return NextResponse.json({ pitch: updatedPitch });
}
