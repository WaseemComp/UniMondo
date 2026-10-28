import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { ContentRow } from "@/lib/publishing/model";
/** Server-only read: inactive rows contribute only a hidden-source key, never private content. */
export async function publicCourseCatalogue() {
  const svc = createSupabaseServiceClient();
  if (!svc)
    return { courses: [] as ContentRow[], hiddenSources: [] as string[] };
  const { data, error } = await svc
    .from("language_courses")
    .select("*")
    .order("sort_order");
  if (error)
    return { courses: [] as ContentRow[], hiddenSources: [] as string[] };
  return {
    courses: (data ?? []).filter((r) => r.is_active && !r.archived_at),
    hiddenSources: (data ?? [])
      .filter((r) => (!r.is_active || r.archived_at) && r.source_key)
      .map((r) => String(r.source_key)),
  };
}
