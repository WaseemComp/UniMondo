import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the server secret key, supporting modern `SUPABASE_SECRET_KEY`
 * with backward fallback to legacy `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function getSupabaseServerSecretKey(): string | null {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/**
 * Server-only client that bypasses RLS. Never import in client components.
 * Supports both modern secret keys (sb_secret_...) and legacy service_role keys.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = getSupabaseServerSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Determines compliant HTTP headers for direct Supabase REST or Storage fetch calls.
 * Per official Supabase migration docs:
 * - Modern secret keys (sb_secret_...) MUST be passed on the `apikey` header ONLY.
 *   Passing non-JWT secret keys in `Authorization: Bearer` causes Supabase to reject the request with `401 Invalid JWT`.
 * - Legacy JWT keys (role: service_role) send both `apikey` and `Authorization: Bearer <key>` for backward compatibility.
 */
export function getSupabaseServerHeaders(
  secretKey?: string | null,
  customHeaders: Record<string, string> = {}
): Record<string, string> {
  const key = secretKey ?? getSupabaseServerSecretKey();
  if (!key) {
    return { ...customHeaders };
  }

  const isJwt = key.startsWith("eyJ") || key.split(".").length === 3;
  const headers: Record<string, string> = {
    apikey: key,
    ...customHeaders,
  };

  if (isJwt) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}
