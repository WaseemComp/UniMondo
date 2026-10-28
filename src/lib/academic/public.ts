/** Pure visibility resolution also protects server-rendered data when a staff session can read drafts. */
import { object, text } from "./model";
export function publicRecord(row: Record<string, unknown>) {
  return row.is_published !== false && !row.archived_at;
}
export function publicUniversity(
  row: Record<string, unknown>,
  countries: Record<string, unknown>[],
) {
  const parent = countries.find((country) =>
    row.country_id
      ? country.id === row.country_id
      : country.name === row.country,
  );
  return publicRecord(row) && (!parent || publicRecord(parent));
}
export function publicProgramme(
  row: Record<string, unknown>,
  countries: Record<string, unknown>[],
  universities: Record<string, unknown>[],
) {
  const country = countries.find((country) => country.name === row.country),
    parent = universities.find((university) =>
      row.university_id
        ? university.id === row.university_id
        : university.name === row.university &&
          university.country === row.country,
    );
  return (
    publicRecord(row) &&
    (!country || publicRecord(country)) &&
    (!parent || publicUniversity(parent, countries))
  );
}
export function programmeFacts(details: unknown, deadline: string) {
  const d = object(details);
  return [
    ["Discipline", d.discipline],
    ["Duration", d.duration],
    ["ECTS credits", d.ects],
    ["Admissions", d.admission_status !== "unknown" ? d.admission_status : ""],
    ["Applications open", d.opens_on],
    ["Eligibility", d.eligibility],
    ["Academic requirements", d.academic_requirements],
    ["Language requirements", d.language_requirements],
    ["Entrance tests", d.entrance_tests],
    ["Scholarships", d.scholarships],
    ["Non-EU applicants", d.non_eu_guidance],
    ["Information status", d.verification],
    ["Last checked", d.verified_on],
    ["Closing date", deadline],
  ].filter(([, value]) => text(value));
}
