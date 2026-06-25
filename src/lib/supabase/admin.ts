import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseSecretKey
} from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabasePublicConfig();

  return createSupabaseClient(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

