import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Build your marketing plan"
};

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({
  searchParams
}: OnboardingPageProps) {
  const params = await searchParams;

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims?.sub) {
      redirect("/login?mode=signup");
    }
  }

  return <OnboardingForm error={params.error} />;
}
