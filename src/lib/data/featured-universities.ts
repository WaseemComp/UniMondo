import {
  FEATURED_UNIVERSITIES_FALLBACK,
  mapFeaturedUniversityRow,
  type FeaturedUniversity,
  type FeaturedUniversityRow,
} from "@/lib/featured-universities";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Published spotlight universities for /current-openings. */
export async function getFeaturedUniversities(): Promise<FeaturedUniversity[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return FEATURED_UNIVERSITIES_FALLBACK;
  }

  const { data, error } = await supabase
    .from("featured_universities")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return FEATURED_UNIVERSITIES_FALLBACK;
    }
    console.error("[getFeaturedUniversities]", error.message);
    return FEATURED_UNIVERSITIES_FALLBACK;
  }

  if (!data?.length) {
    return [];
  }

  return (data as FeaturedUniversityRow[]).map(mapFeaturedUniversityRow);
}
