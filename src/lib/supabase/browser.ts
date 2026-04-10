import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let client: SupabaseClient | null = null;

/** Browser singleton for future client-side queries / auth. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const env = getSupabasePublicEnv();
  if (!env) return null;
  if (!client) {
    client = createClient(env.url, env.anonKey);
  }
  return client;
}
