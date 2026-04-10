import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

/**
 * Browser Supabase client with cookie-based session (matches @supabase/ssr middleware + server).
 * Do not use the plain @supabase/supabase-js createClient here — it defaults to localStorage,
 * so middleware never sees the session and /admin routes redirect back to login.
 */
export function getSupabaseBrowserClient(): BrowserClient | null {
  if (typeof window === "undefined") return null;
  const env = getSupabasePublicEnv();
  if (!env) return null;
  if (!client) {
    client = createBrowserClient(env.url, env.anonKey);
  }
  return client;
}
