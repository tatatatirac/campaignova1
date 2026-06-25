import { createAdminClient } from "@/lib/supabase/admin";

function allowedAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function syncAdminRole(
  ownerId: string,
  email: string | null | undefined
) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !allowedAdminEmails().has(normalizedEmail)) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ app_role: "admin" })
    .eq("id", ownerId)
    .neq("app_role", "admin");

  if (error) {
    console.error("Admin role synchronization failed", error);
  }
}

