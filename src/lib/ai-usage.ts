import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS, type PlanName } from "@/lib/plans";

type ReservationResult = {
  allowed: boolean;
  reason: string;
  reservation_id?: string;
  requests_used?: number;
  request_limit?: number;
  regenerations_used?: number;
  regeneration_limit?: number;
  retry_after_seconds?: number;
};

export type AiUsageReservation = {
  id: string;
  requestsUsed: number;
  requestLimit: number;
  regenerationsUsed: number;
  regenerationLimit: number;
};

export type AiUsageSummary = {
  requestsUsed: number;
  requestLimit: number;
  requestsRemaining: number;
  regenerationsUsed: number;
  regenerationLimit: number;
  regenerationsRemaining: number;
};

type ReserveOptions = {
  request: Request;
  ownerId: string;
  operation: string;
  isRegeneration?: boolean;
};

function getClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  return (
    request.headers.get("cf-connecting-ip") ||
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hashClientAddress(request: Request) {
  const salt =
    process.env.RATE_LIMIT_SALT ||
    process.env.SUPABASE_SECRET_KEY ||
    "campaignova-local-rate-limit";

  return createHmac("sha256", salt)
    .update(getClientAddress(request))
    .digest("hex");
}

function usageHeaders(result: ReservationResult) {
  const requestLimit = result.request_limit ?? 0;
  const requestsUsed = result.requests_used ?? 0;

  return {
    "X-AI-Limit": String(requestLimit),
    "X-AI-Remaining": String(Math.max(0, requestLimit - requestsUsed)),
    "X-AI-Regeneration-Limit": String(result.regeneration_limit ?? 0),
    "X-AI-Regeneration-Remaining": String(
      Math.max(
        0,
        (result.regeneration_limit ?? 0) -
          (result.regenerations_used ?? 0)
      )
    )
  };
}

export async function reserveAiUsage({
  request,
  ownerId,
  operation,
  isRegeneration = false
}: ReserveOptions): Promise<
  | { ok: true; reservation: AiUsageReservation }
  | { ok: false; response: NextResponse }
> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_ai_request", {
    p_owner_id: ownerId,
    p_operation: operation,
    p_is_regeneration: isRegeneration,
    p_ip_hash: hashClientAddress(request)
  });

  if (error || !data) {
    console.error("AI usage reservation failed", error);

    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "AI generation is temporarily unavailable. Please try again shortly.",
          code: "USAGE_GUARD_UNAVAILABLE"
        },
        { status: 503 }
      )
    };
  }

  const result = data as ReservationResult;

  if (!result.allowed || !result.reservation_id) {
    const isRateLimit = result.reason === "rate_limit";
    const isRegenerationLimit = result.reason === "regeneration_limit";
    const retryAfter = result.retry_after_seconds ?? 60;
    const message = isRateLimit
      ? `Too many generation requests. Try again in ${Math.max(
          1,
          Math.ceil(retryAfter / 60)
        )} minute(s).`
      : isRegenerationLimit
        ? `The monthly regeneration limit of ${
            result.regeneration_limit ?? 0
          } has been reached.`
        : `The monthly AI action limit of ${
            result.request_limit ?? 0
          } has been reached.`;
    const headers: Record<string, string> = usageHeaders(result);

    if (isRateLimit) {
      headers["Retry-After"] = String(retryAfter);
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: message,
          code: isRateLimit
            ? "RATE_LIMITED"
            : isRegenerationLimit
              ? "REGENERATION_LIMIT_REACHED"
              : "MONTHLY_AI_LIMIT_REACHED",
          usage: {
            requestsUsed: result.requests_used ?? 0,
            requestLimit: result.request_limit ?? 0,
            regenerationsUsed: result.regenerations_used ?? 0,
            regenerationLimit: result.regeneration_limit ?? 0
          }
        },
        { status: 429, headers }
      )
    };
  }

  return {
    ok: true,
    reservation: {
      id: result.reservation_id,
      requestsUsed: result.requests_used ?? 0,
      requestLimit: result.request_limit ?? 0,
      regenerationsUsed: result.regenerations_used ?? 0,
      regenerationLimit: result.regeneration_limit ?? 0
    }
  };
}

export async function completeAiUsage(
  reservationId: string,
  succeeded: boolean
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("complete_ai_request", {
    p_reservation_id: reservationId,
    p_succeeded: succeeded
  });

  if (error) {
    console.error("AI usage completion failed", error);
  }
}

export function aiUsageResponseHeaders(reservation: AiUsageReservation) {
  return {
    "X-AI-Limit": String(reservation.requestLimit),
    "X-AI-Remaining": String(
      Math.max(0, reservation.requestLimit - reservation.requestsUsed)
    ),
    "X-AI-Regeneration-Limit": String(reservation.regenerationLimit),
    "X-AI-Regeneration-Remaining": String(
      Math.max(
        0,
        reservation.regenerationLimit - reservation.regenerationsUsed
      )
    )
  };
}

export async function getAiUsageSummary(
  ownerId: string,
  plan: PlanName
): Promise<AiUsageSummary> {
  const limits = PLAN_LIMITS[plan];
  const periodStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_usage_monthly")
    .select("requests_used,regenerations_used")
    .eq("owner_id", ownerId)
    .eq("period_start", periodStart)
    .maybeSingle();
  const requestsUsed = data?.requests_used ?? 0;
  const regenerationsUsed = data?.regenerations_used ?? 0;

  return {
    requestsUsed,
    requestLimit: limits.aiRequests,
    requestsRemaining: Math.max(0, limits.aiRequests - requestsUsed),
    regenerationsUsed,
    regenerationLimit: limits.regenerations,
    regenerationsRemaining: Math.max(
      0,
      limits.regenerations - regenerationsUsed
    )
  };
}

