import type { CountryDetail, Opening } from "@/lib/unimondo-data";

export function slugifyCountryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function countrySlug(c: CountryDetail): string {
  return (c.slug?.trim() || slugifyCountryName(c.country)).toLowerCase();
}

export function findCountryBySlug(countries: CountryDetail[], slug: string): CountryDetail | undefined {
  const s = slug.trim().toLowerCase();
  return countries.find((c) => countrySlug(c) === s);
}

/** Parse euro amounts from strings like "EUR 2,500 - 4,200" or "EUR 0 – 3,500". */
export function parseEurValues(text: string): number[] {
  const out: number[] = [];
  const re = /(?:EUR|€)\s*([\d][\d.,]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number.parseFloat(m[1]!.replace(/,/g, ""));
    if (!Number.isNaN(n)) out.push(n);
  }
  const loose = text.match(/\b[\d][\d.,]*\b/g);
  if (out.length === 0 && loose) {
    for (const raw of loose) {
      const n = Number.parseFloat(raw.replace(/,/g, ""));
      if (!Number.isNaN(n) && n > 100) out.push(n);
    }
  }
  return out;
}

export function tuitionMidpointEur(tuitionRange: string): number | null {
  const vals = parseEurValues(tuitionRange);
  if (!vals.length) return null;
  if (vals.length === 1) return vals[0]!;
  return (Math.min(...vals) + Math.max(...vals)) / 2;
}

export function inferStudyLevel(o: Opening): string {
  const fromCms = o.degreeLevel?.trim();
  if (fromCms) return fromCms;
  const p = `${o.programName} ${o.description ?? ""}`.toLowerCase();
  if (/\b(phd|dphil|doctorate)\b/.test(p)) return "Doctorate";
  if (/\b(md|medicine)\b/.test(p)) return "Medicine";
  if (/\b(llm|msc|ma\b|master|mba)\b/.test(p)) return "Master";
  if (/\b(bsc|ba\b|bachelor|undergraduate)\b/.test(p)) return "Bachelor";
  return "Graduate";
}

export function fieldHaystack(o: Opening): string {
  return `${o.programName} ${o.university} ${o.description ?? ""}`.toLowerCase();
}

export function openingsForCountry(openings: Opening[], countryName: string): Opening[] {
  return openings.filter((o) => o.country === countryName);
}

export function uniqueUniversitiesForCountry(openings: Opening[], countryName: string): number {
  return new Set(openingsForCountry(openings, countryName).map((o) => o.university)).size;
}

export function tuitionBandForCountry(openings: Opening[], countryName: string): string | null {
  const scoped = openingsForCountry(openings, countryName);
  const mids = scoped.map((o) => tuitionMidpointEur(o.tuitionRange)).filter((x): x is number => x != null);
  if (!mids.length) return null;
  const low = Math.round(Math.min(...mids));
  const high = Math.round(Math.max(...mids));
  if (low === high) return `≈ EUR ${low.toLocaleString("en-EU")}/yr (listed programs)`;
  return `≈ EUR ${low.toLocaleString("en-EU")} – ${high.toLocaleString("en-EU")}/yr (listed programs)`;
}

export function aggregateTuitionBounds(openings: Opening[]): { min: number; max: number } | null {
  const bounds: number[] = [];
  for (const o of openings) {
    const vals = parseEurValues(o.tuitionRange);
    if (vals.length) {
      bounds.push(Math.min(...vals), Math.max(...vals));
    }
  }
  if (!bounds.length) return null;
  return { min: Math.min(...bounds), max: Math.max(...bounds) };
}

export function suggestsScholarshipOrLowTuition(o: Opening): boolean {
  const t = `${o.tuitionRange} ${o.description ?? ""} ${o.programName}`.toLowerCase();
  if (t.includes("scholarship") || t.includes("stipend")) return true;
  const vals = parseEurValues(o.tuitionRange);
  if (!vals.length) return false;
  return Math.min(...vals) <= 500;
}

export function visaBulletPoints(visaInfo: string): string[] {
  const v = visaInfo.trim();
  if (!v) return [];
  const parts = v.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => (p.endsWith(".") ? p : `${p}.`));
}
