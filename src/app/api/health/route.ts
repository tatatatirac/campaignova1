import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const startedAt = performance.now();
  let database = "ok";

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      database = "degraded";
    }
  } catch {
    database = "degraded";
  }

  const status = database === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      service: "campaignova",
      checks: { database },
      responseMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString()
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
