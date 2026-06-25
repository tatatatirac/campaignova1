import { NextResponse } from "next/server";
import { z } from "zod";
import { generateLandingPage } from "@/lib/ai/landing-page";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage
} from "@/lib/ai-usage";
import { generatedEmailCampaignSchema } from "@/lib/schemas/emails";
import { landingPageSchema } from "@/lib/schemas/landing-page";
import { marketingStrategySchema } from "@/lib/schemas/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const generateRequestSchema = z.object({
  planId: z.uuid()
});

const editRequestSchema = z.object({
  action: z.literal("edit"),
  planId: z.uuid(),
  page: landingPageSchema
});

async function loadGenerationContext(planId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select(
      "id,company_id,strategy,emails,landing_page,landing_page_version,landing_page_model"
    )
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const strategy = marketingStrategySchema.safeParse(plan.strategy);
  const emails = generatedEmailCampaignSchema.safeParse(plan.emails);

  if (!strategy.success || !emails.success) {
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
    emails: emails.data
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
      { error: "Invalid landing page request." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );

  if (!context) {
    return NextResponse.json(
      { error: "Generate the email campaign before producing landing copy." },
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
    operation: landingPageSchema.safeParse(context.plan.landing_page).success
      ? "landing_page_regeneration"
      : "landing_page",
    isRegeneration: landingPageSchema.safeParse(context.plan.landing_page)
      .success
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const version = context.plan.landing_page_version + 1;
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      landing_page_status: "generating",
      landing_page_generation_started_at: new Date().toISOString(),
      landing_page_generation_completed_at: null,
      landing_page_generation_error: null
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "Landing page production could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateLandingPage({
      company: context.company,
      strategy: context.strategy,
      emails: context.emails,
      version
    });
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        landing_page: result.page,
        landing_page_status: "ready",
        landing_page_model: result.model,
        landing_page_version: version,
        landing_page_generation_completed_at: new Date().toISOString(),
        landing_page_generation_error: null
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: context.plan.company_id,
      event_type: "landing_page_generated",
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
        page: result.page,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown landing page generation error";

    await admin
      .from("marketing_plans")
      .update({
        landing_page_status: "failed",
        landing_page_generation_error: message.slice(0, 1_000),
        landing_page_generation_completed_at: new Date().toISOString()
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Landing page generation failed. Please try again." },
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
      { error: "Invalid landing page update." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );
  const existingPage = landingPageSchema.safeParse(
    context?.plan.landing_page
  );

  if (!context || !existingPage.success) {
    return NextResponse.json(
      { error: "Generate the landing page before editing it." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server landing page storage is not configured." },
      { status: 503 }
    );
  }

  const updatedPage = landingPageSchema.parse({
    ...parsedRequest.data.page,
    version: existingPage.data.version
  });
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("marketing_plans")
    .update({
      landing_page: updatedPage,
      landing_page_model: "manual-edit"
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (updateError) {
    return NextResponse.json(
      { error: "The landing page could not be saved." },
      { status: 500 }
    );
  }

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type: "landing_page_edited",
    quantity: 1,
    metadata: {
      plan_id: context.plan.id,
      model: "manual-edit"
    }
  });

  return NextResponse.json({ page: updatedPage });
}
