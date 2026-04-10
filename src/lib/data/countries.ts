import type { CountryDetail, RegionGroup } from "@/lib/unimondo-data";
import { countryDetails as staticCountries } from "@/lib/unimondo-data";
import { isRegionGroup, parsePopularUnis } from "@/lib/cms/maps";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Loads countries from Supabase when configured; otherwise static seed data. */
export async function getCountryDetails(): Promise<CountryDetail[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return staticCountries;
  }

  const [{ data: rgRows, error: rgError }, { data: rows, error: cError }] = await Promise.all([
    supabase.from("region_groups").select("id, label").order("sort_order", { ascending: true }),
    supabase.from("countries").select("*").order("sort_order", { ascending: true }),
  ]);

  if (rgError || cError || !rows?.length) {
    if (rgError) console.error("[getCountryDetails] region_groups", rgError.message);
    if (cError) console.error("[getCountryDetails] countries", cError.message);
    return staticCountries;
  }

  const regionLabelById = new Map<number, string>(
    (rgRows ?? []).map((r: { id: number; label: string }) => [r.id, r.label]),
  );

  return rows.map((row: Record<string, unknown>) => {
    const rid = row.region_group_id as number;
    const raw = regionLabelById.get(rid) ?? "Western Europe";
    const regionGroup: RegionGroup = isRegionGroup(raw) ? raw : "Western Europe";
    const popular = parsePopularUnis(row.popular_unis, (row.popular_universities as string[] | null) ?? null);
    const fallbackUnis = (row.popular_universities as string[]) ?? [];
    const why = ((row.why_study as string | null) ?? "").trim() || (row.why_study_there as string) || "";
    const living = ((row.living_cost as string | null) ?? "").trim() || (row.living_cost_approx as string) || "";
    const slug = ((row.slug as string | null) ?? "").trim();
    const flag = ((row.flag_emoji as string | null) ?? "").trim();
    const desc = ((row.description as string | null) ?? "").trim();

    return {
      country: row.name as string,
      regionGroup,
      highlighted: Boolean(row.highlighted),
      whyStudyThere: why,
      popularUniversities: popular.length ? popular : fallbackUnis,
      livingCostApprox: living,
      visaInfo: (row.visa_info as string) ?? "",
      slug: slug || undefined,
      flagEmoji: flag || undefined,
      description: desc || undefined,
    } satisfies CountryDetail;
  });
}
