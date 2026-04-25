import type { ApplicationType } from "@/types/application";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseRequest(path: string, init: RequestInit): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });
}

export async function getApplicationTypeByTrackingId(trackingId: string): Promise<ApplicationType | null> {
  const qs = new URLSearchParams({
    select: "application_type",
    tracking_id: `eq.${trackingId}`,
    limit: "1",
  });
  const res = await supabaseRequest(`/rest/v1/applications?${qs.toString()}`, { method: "GET" });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ application_type: ApplicationType | null }>;
  return rows[0]?.application_type ?? "university";
}

