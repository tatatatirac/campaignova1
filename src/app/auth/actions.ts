"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { syncAdminRole } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(10).max(128)
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).max(80)
});

function redirectWithMessage(
  mode: "login" | "signup",
  type: "error" | "message",
  message: string
): never {
  redirect(
    `/login?mode=${mode}&${type}=${encodeURIComponent(message)}`
  );
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirectWithMessage(
      "login",
      "error",
      "Enter a valid email and a password with at least 10 characters."
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirectWithMessage("login", "error", error.message);
  }

  if (data.user) {
    await syncAdminRole(data.user.id, data.user.email);
  }

  redirect("/app");
}

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone")
  });

  if (!parsed.success) {
    redirectWithMessage(
      "signup",
      "error",
      "Complete every field and use a password with at least 10 characters."
    );
  }

  const supabase = await createClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
      data: {
        full_name: parsed.data.fullName,
        timezone: parsed.data.timezone
      }
    }
  });

  if (error) {
    redirectWithMessage("signup", "error", error.message);
  }

  if (data.user) {
    await syncAdminRole(data.user.id, data.user.email);
  }

  redirectWithMessage(
    "login",
    "message",
    "Check your email to confirm the account, then sign in."
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
