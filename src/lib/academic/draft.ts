import { slugifyCountryName } from "@/lib/destinations-utils";
import { object, text, type AcademicKind, type AcademicRow } from "./model";
import { destinationGuideForForm } from "@/lib/destination-guide";
export function academicDraft(
  kind: AcademicKind,
  row?: AcademicRow,
): Record<string, unknown> {
  const r: Record<string, unknown> = row ?? {},
    common = {
      is_published: row ? r.is_published !== false : false,
      sort_order: Number(r.sort_order ?? 0),
    };
  if (kind === "countries")
    return {
      ...common,
      name: text(r.name),
      slug: text(r.slug) || slugifyCountryName(text(r.name)),
      flag_emoji: text(r.flag_emoji),
      description: text(r.description),
      why_study: text(r.why_study).trim() || text(r.why_study_there),
      living_cost: text(r.living_cost).trim() || text(r.living_cost_approx),
      visa_info: text(r.visa_info),
      popular_unis:
        Array.isArray(r.popular_unis) && r.popular_unis.length
          ? r.popular_unis
          : (r.popular_universities ?? []),
      region_group_id: Number(r.region_group_id ?? 0),
      highlighted: Boolean(r.highlighted),
      destination_guide: destinationGuideForForm(r.destination_guide),
      catalogue: object(r.catalogue),
    };
  if (kind === "universities")
    return {
      ...common,
      name: text(r.name),
      country_id: r.country_id ?? null,
      country: text(r.country),
      flag_emoji: text(r.flag_emoji),
      prestige_line: text(r.prestige_line),
      qs_label: text(r.qs_label),
      hero_image_url: text(r.hero_image_url),
      hero_image_alt: text(r.hero_image_alt),
      logo_url: text(r.logo_url),
      logo_initials: text(r.logo_initials),
      programs: Array.isArray(r.programs) ? r.programs : [],
      apply_program_summary: text(r.apply_program_summary),
      profile: object(r.profile),
    };
  return {
    ...common,
    title: text(r.title),
    university_id: r.university_id ?? null,
    university: text(r.university),
    country: text(r.country),
    degree: text(r.degree) || "master",
    intake: text(r.intake),
    deadline: text(r.deadline).slice(0, 10),
    tuition_range: text(r.tuition_range),
    description: text(r.description),
    logo_url: text(r.logo_url),
    logo_text: text(r.logo_text),
    continent: text(r.continent),
    region: text(r.region),
    details: row
      ? object(r.details)
      : {
          teaching_language: "",
          verification: "incomplete",
          admission_status: "unknown",
        },
  };
}
export function atPath(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => object(node)[key], value);
}
export function setPath(
  value: Record<string, unknown>,
  path: string,
  next: unknown,
): Record<string, unknown> {
  const [key, ...rest] = path.split(".");
  return {
    ...value,
    [key]: rest.length
      ? setPath(object(value[key]), rest.join("."), next)
      : next,
  };
}
