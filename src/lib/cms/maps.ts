import type { CountryDetail, Opening, RegionGroup } from "@/lib/unimondo-data";

const REGION_LABELS: RegionGroup[] = [
  "Western Europe",
  "Southern Europe",
  "Northern Europe",
  "Central/Eastern Europe",
];

export function isRegionGroup(s: string): s is RegionGroup {
  return (REGION_LABELS as string[]).includes(s);
}

export type ProgramRow = {
  id: string;
  title: string;
  university: string;
  country: string;
  degree: string;
  intake: string;
  deadline: string;
  tuition_range: string;
  description: string | null;
  logo_url: string | null;
  logo_text: string | null;
  continent: string | null;
  region: string | null;
  is_published: boolean | null;
  sort_order: number | null;
};

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function programRowToOpening(row: ProgramRow): Opening {
  const deadline =
    typeof row.deadline === "string"
      ? row.deadline.slice(0, 10)
      : new Date(row.deadline).toISOString().slice(0, 10);
  return {
    id: row.id,
    continent: row.continent ?? "Europe",
    country: row.country,
    region: row.region ?? "",
    intake: row.intake,
    university: row.university,
    logoText: row.logo_text?.trim() || initialsFromName(row.university),
    programName: row.title,
    deadline,
    tuitionRange: row.tuition_range,
    logoUrl: row.logo_url,
    description: row.description ?? "",
  };
}

export type CountryRow = {
  name: string;
  slug: string | null;
  flag_emoji: string | null;
  description: string | null;
  why_study: string | null;
  why_study_there: string | null;
  living_cost: string | null;
  living_cost_approx: string | null;
  visa_info: string | null;
  popular_unis: unknown;
  popular_universities: string[] | null;
  highlighted: boolean | null;
  region_groups: { label: string } | null;
};

export function parsePopularUnis(raw: unknown, fallback: string[] | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map((u) => String(u));
  }
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map((u) => String(u));
    } catch {
      /* ignore */
    }
  }
  return fallback ?? [];
}

export function countryRowToDetail(row: CountryRow): CountryDetail {
  const rawLabel = row.region_groups?.label ?? "Western Europe";
  const regionGroup: RegionGroup = isRegionGroup(rawLabel) ? rawLabel : "Western Europe";
  const unis = parsePopularUnis(row.popular_unis, row.popular_universities);
  const why = row.why_study?.trim() || row.why_study_there || "";
  const living = row.living_cost?.trim() || row.living_cost_approx || "";

  return {
    country: row.name,
    regionGroup,
    highlighted: Boolean(row.highlighted),
    whyStudyThere: why,
    popularUniversities: unis.length ? unis : row.popular_universities ?? [],
    livingCostApprox: living,
    visaInfo: row.visa_info ?? "",
    slug: row.slug ?? undefined,
    flagEmoji: row.flag_emoji ?? undefined,
    description: row.description?.trim() || undefined,
  };
}
