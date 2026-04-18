import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AboutSectionKey =
  | "about_us"
  | "mission"
  | "vision"
  | "objective"
  | "policy"
  | "values";

export type AboutSectionRow = {
  section_key: AboutSectionKey;
  title: string;
  body: string;
};

export const ABOUT_SECTION_ORDER: AboutSectionKey[] = [
  "about_us",
  "mission",
  "vision",
  "objective",
  "policy",
  "values",
];

export async function getAboutSections(): Promise<AboutSectionRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("about_sections").select("section_key, title, body");

  if (error || !data?.length) return [];

  const map = new Map((data as AboutSectionRow[]).map((r) => [r.section_key, r]));
  return ABOUT_SECTION_ORDER.map((k) => map.get(k)).filter(Boolean) as AboutSectionRow[];
}

export type TeamMemberRow = {
  id: string;
  image_url: string | null;
  name: string;
  qualification: string;
  bio: string;
  sort_order: number;
};

export async function getTeamMembers(): Promise<TeamMemberRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("id, image_url, name, qualification, bio, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return data as TeamMemberRow[];
}
