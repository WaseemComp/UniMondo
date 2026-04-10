import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/** Server-side anon client (RLS applies). Use in Server Components, Route Handlers, server actions. */
export function createSupabaseServerClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
