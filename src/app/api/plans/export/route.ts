import { NextResponse } from "next/server";
import { z } from "zod";
import {
  renderMarketingPlanPdf,
  type MarketingPlanPdfCompany,
  type MarketingPlanPdfPlan,
  type MarketingPlanPdfVideoRelease
} from "@/lib/pdf/marketing-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  planId: z.uuid()
});

type VideoReleaseRow = {
  release_at: string;
  publish_at: string;
  platform: string;
  caption: string;
  call_to_action: string;
  status: string;
  video_assets:
    | {
        title: string;
        duration_seconds: number;
      }
    | {
        title: string;
        duration_seconds: number;
      }[]
    | null;
};

function slugFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

function normalizeVideoRelease(
  row: VideoReleaseRow
): MarketingPlanPdfVideoRelease {
  const asset = Array.isArray(row.video_assets)
    ? row.video_assets[0]
    : row.video_assets;

  return {
    title: asset?.title ?? "Ready video",
    durationSeconds: asset?.duration_seconds ?? null,
    platform: row.platform,
    caption: row.caption,
    callToAction: row.call_to_action,
    releaseAt: row.release_at,
    publishAt: row.publish_at,
    status: row.status
  };
}

async function logPdfExport(ownerId: string, companyId: string, planId: string) {
  if (!process.env.SUPABASE_SECRET_KEY) {
    return;
  }

  try {
    const admin = createAdminClient();
    await admin.from("usage_events").insert({
      owner_id: ownerId,
      company_id: companyId,
      event_type: "pdf_exported",
      quantity: 1,
      metadata: {
        plan_id: planId
      }
    });
  } catch {
    // Export must not fail because analytics logging failed.
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedRequest = requestSchema.safeParse({
    planId: url.searchParams.get("planId")
  });

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid PDF export request." },
      { status: 400 }
    );
  }

  const { planId } = parsedRequest.data;
  const { data: plan, error: planError } = await supabase
    .from("marketing_plans")
    .select(
      "id,company_id,owner_id,month,status,strategy,content_calendar,posts,emails,landing_page,sales_pitch,kpis,updated_at"
    )
    .eq("id", planId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "Marketing plan not found." },
      { status: 404 }
    );
  }

  const [{ data: company }, { data: profile }, { data: releases }] =
    await Promise.all([
      supabase
        .from("companies")
        .select(
          "name,industry,offer,price_context,audience,location,language,tone,primary_goal,primary_cta,website_url,competitors,monthly_budget,differentiator,active_channels"
        )
        .eq("id", plan.company_id)
        .eq("owner_id", ownerId)
        .single(),
      supabase
        .from("profiles")
        .select("timezone,subscription_plan")
        .eq("id", ownerId)
        .single(),
      supabase
        .from("video_releases")
        .select(
          "release_at,publish_at,platform,caption,call_to_action,status,video_assets(title,duration_seconds)"
        )
        .eq("marketing_plan_id", plan.id)
        .eq("owner_id", ownerId)
        .order("publish_at", { ascending: true })
    ]);

  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  try {
    const timezone = profile?.timezone || "UTC";
    const pdf = await renderMarketingPlanPdf({
      company: company as MarketingPlanPdfCompany,
      plan: plan as MarketingPlanPdfPlan,
      timezone,
      subscriptionPlan: profile?.subscription_plan ?? "starter",
      videos: ((releases ?? []) as VideoReleaseRow[]).map(
        normalizeVideoRelease
      ),
      generatedAt: new Date().toISOString()
    });

    await logPdfExport(ownerId, plan.company_id, plan.id);

    const month = String(plan.month).slice(0, 7);
    const filename = `campaignova-${slugFilename(company.name) || "plan"}-${month}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF export error";

    return NextResponse.json(
      { error: `PDF export failed: ${message}` },
      { status: 500 }
    );
  }
}

