import type { CountryDetail, Opening } from "@/lib/unimondo-data";

/** Use the region label stored in CMS; never remap unknown labels onto Western Europe. */
export function normalizeDestinationRegion(raw: string | null | undefined): string {
  if (raw == null) return "";
  const t = raw.trim();
  if (!t) return "";
  const base = t.includes(" — ") ? t.split(" — ")[0]!.trim() : t;
  return base || "";
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
  const rawDegree = row.degree?.trim();
  const degreeLabel =
    rawDegree?.toLowerCase() === "bachelor"
      ? "Bachelor"
      : rawDegree?.toLowerCase() === "master"
        ? "Master"
        : rawDegree || undefined;
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
    degreeLevel: degreeLabel,
    languageOfInstruction: "English",
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
  const rawLabel = row.region_groups?.label;
  const regionGroup = normalizeDestinationRegion(rawLabel) || "Other regions";
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
