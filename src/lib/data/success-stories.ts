import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SuccessStoryRow = {
  id: string;
  profile_image_url: string;
  full_name: string;
  testimonial: string;
  country: string | null;
  program: string | null;
  university: string | null;
  sort_order: number;
  is_published?: boolean;
};

export async function getPublishedSuccessStories(limit = 6): Promise<SuccessStoryRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("success_stories")
    .select("id, profile_image_url, full_name, testimonial, country, program, university, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];
  return data as SuccessStoryRow[];
}
