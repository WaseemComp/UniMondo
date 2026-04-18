import {
  mapAddOnRow,
  mapPackageRow,
  type AddOnRowDb,
  type PackageRowDb,
  type StudyAddOnPublic,
  type StudyPackagePublic,
} from "@/lib/cms/pricing-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getPublishedPackages(): Promise<StudyPackagePublic[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") return [];
    console.error("[getPublishedPackages]", error.message);
    return [];
  }

  return ((data ?? []) as PackageRowDb[]).map(mapPackageRow);
}

export async function getPublishedAddOns(): Promise<StudyAddOnPublic[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") return [];
    console.error("[getPublishedAddOns]", error.message);
    return [];
  }

  return ((data ?? []) as AddOnRowDb[]).map(mapAddOnRow);
}
