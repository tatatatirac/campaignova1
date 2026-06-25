const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseConfig() {
  return Boolean(publicSupabaseUrl && publicSupabaseKey);
}

export function getSupabasePublicConfig() {
  if (!publicSupabaseUrl || !publicSupabaseKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return {
    url: publicSupabaseUrl,
    publishableKey: publicSupabaseKey
  };
}

export function getSupabaseSecretKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for server-only administrative operations."
    );
  }

  return secretKey;
}

