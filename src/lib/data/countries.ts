import type { CountryDetail, RegionGroup } from "@/lib/unimondo-data";
import { countryDetails as staticCountries } from "@/lib/unimondo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGION_LABELS: RegionGroup[] = [
  "Western Europe",
  "Southern Europe",
  "Northern Europe",
  "Central/Eastern Europe",
];

function isRegionGroup(s: string): s is RegionGroup {
  return (REGION_LABELS as string[]).includes(s);
}

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

    return {
      country: row.name as string,
      regionGroup,
      highlighted: Boolean(row.highlighted),
      whyStudyThere: row.why_study_there as string,
      popularUniversities: (row.popular_universities as string[]) ?? [],
      livingCostApprox: row.living_cost_approx as string,
      visaInfo: row.visa_info as string,
    } satisfies CountryDetail;
  });
}
