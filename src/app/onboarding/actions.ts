"use server";

import { redirect } from "next/navigation";
import { companySchema } from "@/lib/schemas/company";
import { createClient } from "@/lib/supabase/server";

function optionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveCompany(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    redirect("/login?mode=signup");
  }

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    offer: formData.get("offer"),
    priceContext: optionalString(formData.get("priceContext")),
    audience: formData.get("audience"),
    location: formData.get("location"),
    language: "English",
    tone: formData.get("tone"),
    primaryGoal: formData.get("primaryGoal"),
    primaryCta: formData.get("primaryCta"),
    timezone: formData.get("timezone"),
    websiteUrl: optionalString(formData.get("websiteUrl")),
    competitors: splitList(formData.get("competitors")),
    differentiator: optionalString(formData.get("differentiator")),
    activeChannels: []
  });

  if (!parsed.success) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        "Complete every required field with specific business information."
      )}`
    );
  }

  const company = parsed.data;
  const { error } = await supabase.from("companies").insert({
    owner_id: ownerId,
    name: company.name,
    industry: company.industry,
    offer: company.offer,
    price_context: company.priceContext ?? null,
    audience: company.audience,
    location: company.location,
    language: company.language,
    tone: company.tone,
    primary_goal: company.primaryGoal,
    primary_cta: company.primaryCta,
    website_url: company.websiteUrl ?? null,
    competitors: company.competitors,
    differentiator: company.differentiator ?? null,
    active_channels: company.activeChannels
  });

  if (error) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        "Business Memory could not be saved. Please try again."
      )}`
    );
  }

  await supabase
    .from("profiles")
    .update({ timezone: company.timezone })
    .eq("id", ownerId);

  redirect("/app");
}
