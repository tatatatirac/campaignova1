import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateEmailCampaign,
  regenerateEmail
} from "@/lib/ai/emails";
import {
  aiUsageResponseHeaders,
  completeAiUsage,
  reserveAiUsage,
  type AiUsageReservation
} from "@/lib/ai-usage";
import { contentCalendarSchema } from "@/lib/schemas/calendar";
import {
  generatedEmailCampaignSchema,
  generatedEmailSchema
} from "@/lib/schemas/emails";
import { generatedPostsSchema } from "@/lib/schemas/posts";
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
    sequenceNumber: z.number().int().min(1).max(5),
    email: generatedEmailSchema
  }),
  z.object({
    action: z.literal("regenerate"),
    planId: z.uuid(),
    sequenceNumber: z.number().int().min(1).max(5)
  })
]);

async function loadGenerationContext(planId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select(
      "id,company_id,strategy,content_calendar,posts,emails,emails_version,emails_model"
    )
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const strategy = marketingStrategySchema.safeParse(plan.strategy);
  const calendar = contentCalendarSchema.safeParse(plan.content_calendar);
  const posts = generatedPostsSchema.safeParse(plan.posts);

  if (!strategy.success || !calendar.success || !posts.success) {
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
    calendar: calendar.data,
    posts: posts.data
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
      { error: "Invalid email campaign request." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );

  if (!context) {
    return NextResponse.json(
      { error: "Generate the 30 posts before producing the email campaign." },
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
    operation: generatedEmailCampaignSchema.safeParse(context.plan.emails)
      .success
      ? "email_campaign_regeneration"
      : "email_campaign",
    isRegeneration: generatedEmailCampaignSchema.safeParse(
      context.plan.emails
    ).success
  });

  if (!usage.ok) {
    return usage.response;
  }

  const admin = createAdminClient();
  const version = context.plan.emails_version + 1;
  const { error: startError } = await admin
    .from("marketing_plans")
    .update({
      emails_status: "generating",
      emails_generation_started_at: new Date().toISOString(),
      emails_generation_completed_at: null,
      emails_generation_error: null
    })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (startError) {
    await completeAiUsage(usage.reservation.id, false);

    return NextResponse.json(
      { error: "Email campaign production could not be started." },
      { status: 500 }
    );
  }

  let aiCallCompleted = false;

  try {
    const result = await generateEmailCampaign({
      company: context.company,
      strategy: context.strategy,
      calendar: context.calendar,
      posts: context.posts,
      version
    });
    aiCallCompleted = true;
    const { error: updateError } = await admin
      .from("marketing_plans")
      .update({
        emails: result.campaign,
        emails_status: "ready",
        emails_model: result.model,
        emails_version: version,
        emails_generation_completed_at: new Date().toISOString(),
        emails_generation_error: null
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);

    if (updateError) {
      throw updateError;
    }

    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: context.plan.company_id,
      event_type: "email_campaign_generated",
      quantity: 5,
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
        campaign: result.campaign,
        mocked: result.mocked
      },
      { headers: aiUsageResponseHeaders(usage.reservation) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email generation error";

    await admin
      .from("marketing_plans")
      .update({
        emails_status: "failed",
        emails_generation_error: message.slice(0, 1_000),
        emails_generation_completed_at: new Date().toISOString()
      })
      .eq("id", context.plan.id)
      .eq("owner_id", ownerId);
    await completeAiUsage(usage.reservation.id, aiCallCompleted);

    return NextResponse.json(
      { error: "Email campaign generation failed. Please try again." },
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
      { error: "Invalid email update." },
      { status: 400 }
    );
  }

  const context = await loadGenerationContext(
    parsedRequest.data.planId,
    ownerId
  );
  const existingCampaign = generatedEmailCampaignSchema.safeParse(
    context?.plan.emails
  );

  if (!context || !existingCampaign.success) {
    return NextResponse.json(
      { error: "Generate the email campaign before editing it." },
      { status: 409 }
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server email storage is not configured." },
      { status: 503 }
    );
  }

  const emails = [...existingCampaign.data.emails];
  const emailIndex = emails.findIndex(
    (email) =>
      email.sequenceNumber === parsedRequest.data.sequenceNumber
  );

  if (emailIndex < 0) {
    return NextResponse.json({ error: "Email not found." }, { status: 404 });
  }

  let model = context.plan.emails_model || "manual-edit";
  let mocked = false;
  let usageReservation: AiUsageReservation | null = null;

  if (parsedRequest.data.action === "edit") {
    const currentEmail = emails[emailIndex];
    emails[emailIndex] = generatedEmailSchema.parse({
      ...parsedRequest.data.email,
      sequenceNumber: currentEmail.sequenceNumber,
      sendDay: currentEmail.sendDay,
      role: currentEmail.role
    });
    model = "manual-edit";
  } else {
    const usage = await reserveAiUsage({
      request,
      ownerId,
      operation: "email_regeneration",
      isRegeneration: true
    });

    if (!usage.ok) {
      return usage.response;
    }

    usageReservation = usage.reservation;

    try {
      const result = await regenerateEmail(
        {
          company: context.company,
          strategy: context.strategy,
          calendar: context.calendar,
          posts: context.posts
        },
        emails[emailIndex]
      );
      emails[emailIndex] = result.email;
      model = result.model;
      mocked = result.mocked;
    } catch {
      await completeAiUsage(usageReservation.id, false);

      return NextResponse.json(
        { error: "Email regeneration failed. Please try again." },
        { status: 500 }
      );
    }
  }

  const updatedCampaign = generatedEmailCampaignSchema.parse({
    ...existingCampaign.data,
    emails
  });
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("marketing_plans")
    .update({ emails: updatedCampaign, emails_model: model })
    .eq("id", context.plan.id)
    .eq("owner_id", ownerId);

  if (updateError) {
    if (usageReservation) {
      await completeAiUsage(usageReservation.id, true);
    }

    return NextResponse.json(
      { error: "The email could not be saved." },
      { status: 500 }
    );
  }

  await admin.from("usage_events").insert({
    owner_id: ownerId,
    company_id: context.plan.company_id,
    event_type:
      parsedRequest.data.action === "edit"
        ? "email_edited"
        : "email_regenerated",
    quantity: 1,
    metadata: {
      plan_id: context.plan.id,
      sequence_number: parsedRequest.data.sequenceNumber,
      model,
      mocked
    }
  });
  if (usageReservation) {
    await completeAiUsage(usageReservation.id, true);
  }

  return NextResponse.json(
    {
      email: emails[emailIndex],
      campaign: updatedCampaign
    },
    usageReservation
      ? { headers: aiUsageResponseHeaders(usageReservation) }
      : undefined
  );
}
