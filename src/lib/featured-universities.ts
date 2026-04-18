/** Curated spotlight universities for /current-openings — CMS-backed with static fallback. */

export type FeaturedProgramLine = {
  name: string;
  tuitionRange: string;
};

export type FeaturedUniversity = {
  id: string;
  name: string;
  country: string;
  flagEmoji: string;
  prestigeLine: string;
  qsLabel: string | null;
  imageSrc: string;
  imageAlt: string;
  logoInitials: string;
  /** Optional uploaded or external logo; when set, shown instead of initials. */
  logoUrl: string | null;
  programs: FeaturedProgramLine[];
  /** Optional text for the Apply form `program` query param. */
  applyProgramSummary: string | null;
};

/** Raw row from `featured_universities` (Supabase). */
export type FeaturedUniversityRow = {
  id: string;
  name: string;
  country: string;
  flag_emoji: string;
  prestige_line: string;
  qs_label: string | null;
  hero_image_url: string;
  hero_image_alt: string;
  logo_url: string | null;
  logo_initials: string;
  programs: unknown;
  apply_program_summary: string | null;
  is_published: boolean;
  sort_order: number;
};

/** Stable Unsplash asset (avoids removed photo IDs that return 404 from the image optimizer). */
const PLACEHOLDER_HERO =
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80";

function normalizePrograms(raw: unknown): FeaturedProgramLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const o = p as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const tuitionRange =
        typeof o.tuition_range === "string" ? o.tuition_range.trim() : "";
      if (!name || !tuitionRange) return null;
      return { name, tuitionRange };
    })
    .filter((x): x is FeaturedProgramLine => x !== null);
}

export function mapFeaturedUniversityRow(row: FeaturedUniversityRow): FeaturedUniversity {
  const hero = row.hero_image_url?.trim();
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    flagEmoji: row.flag_emoji ?? "",
    prestigeLine: row.prestige_line ?? "",
    qsLabel: row.qs_label,
    imageSrc: hero || PLACEHOLDER_HERO,
    imageAlt: row.hero_image_alt?.trim() || `${row.name} campus`,
    logoInitials: (row.logo_initials ?? "UNI").slice(0, 8),
    logoUrl: row.logo_url?.trim() || null,
    programs: normalizePrograms(row.programs),
    applyProgramSummary: row.apply_program_summary?.trim() || null,
  };
}

export const FEATURED_UNIVERSITIES_FALLBACK: FeaturedUniversity[] = [
  {
    id: "fallback-bologna",
    name: "University of Bologna",
    country: "Italy",
    flagEmoji: "🇮🇹",
    prestigeLine: "Founded in 1088 — the oldest university in the Western world",
    qsLabel: "QS World #138",
    imageSrc:
      "https://images.unsplash.com/photo-1529154036614-a60975f5c760?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Historic Italian university architecture and colonnades",
    logoInitials: "Unibo",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "MSc Data Science", tuitionRange: "EUR 2,500 – 4,200 / yr" },
      { name: "MSc International Relations", tuitionRange: "EUR 2,200 – 3,800 / yr" },
      { name: "Bachelor Economics", tuitionRange: "EUR 2,000 – 3,500 / yr" },
    ],
  },
  {
    id: "fallback-polimi",
    name: "Politecnico di Milano",
    country: "Italy",
    flagEmoji: "🇮🇹",
    prestigeLine: "Italy’s leading technical university — design, engineering & architecture",
    qsLabel: "QS World #98",
    imageSrc:
      "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Modern architecture and European city study environment",
    logoInitials: "PoliMi",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "MSc Design for Digital Futures", tuitionRange: "EUR 3,900 – 6,200 / yr" },
      { name: "MSc Mechanical Engineering", tuitionRange: "EUR 3,500 – 5,800 / yr" },
      { name: "MSc Architecture", tuitionRange: "EUR 3,800 – 6,000 / yr" },
    ],
  },
  {
    id: "fallback-sapienza",
    name: "Sapienza University of Rome",
    country: "Italy",
    flagEmoji: "🇮🇹",
    prestigeLine: "Founded in 1303 — Europe’s largest classical university",
    qsLabel: "QS World #128",
    imageSrc:
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Italian coastline and study-abroad atmosphere",
    logoInitials: "SAP",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "MSc Artificial Intelligence", tuitionRange: "EUR 2,800 – 4,500 / yr" },
      { name: "MSc Civil Engineering", tuitionRange: "EUR 2,500 – 4,000 / yr" },
      { name: "Bachelor Political Science", tuitionRange: "EUR 2,000 – 3,200 / yr" },
    ],
  },
  {
    id: "fallback-tum",
    name: "TU Munich",
    country: "Germany",
    flagEmoji: "🇩🇪",
    prestigeLine: "Germany’s top-ranked technical university — research & industry links",
    qsLabel: "QS World #22",
    imageSrc:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Graduates celebrating academic achievement",
    logoInitials: "TUM",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "MSc Artificial Intelligence", tuitionRange: "EUR 0 – 3,500 / yr" },
      { name: "MSc Informatics", tuitionRange: "EUR 0 – 3,200 / yr" },
      { name: "MSc Management & Technology", tuitionRange: "EUR 0 – 4,000 / yr" },
    ],
  },
  {
    id: "fallback-szeged",
    name: "University of Szeged",
    country: "Hungary",
    flagEmoji: "🇭🇺",
    prestigeLine: "Hungary’s flagship research university — medicine, sciences & humanities",
    qsLabel: "QS World #500–600 band",
    imageSrc:
      "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "European university campus and autumn trees",
    logoInitials: "SZTE",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "MSc Computer Science", tuitionRange: "EUR 2,500 – 4,500 / yr" },
      { name: "General Medicine (MD)", tuitionRange: "EUR 12,000 – 15,000 / yr" },
      { name: "BSc Business Administration", tuitionRange: "EUR 2,000 – 3,500 / yr" },
    ],
  },
  {
    id: "fallback-sorbonne",
    name: "Sorbonne University",
    country: "France",
    flagEmoji: "🇫🇷",
    prestigeLine: "Historic Parisian excellence — arts, science & medicine on one campus",
    qsLabel: "QS World #63",
    imageSrc:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Paris skyline and academic heritage",
    logoInitials: "SU",
    logoUrl: null,
    applyProgramSummary: null,
    programs: [
      { name: "LLM International Business Law", tuitionRange: "EUR 4,000 – 7,800 / yr" },
      { name: "MSc Physics", tuitionRange: "EUR 3,500 – 6,000 / yr" },
      { name: "Bachelor Liberal Arts", tuitionRange: "EUR 2,800 – 4,200 / yr" },
    ],
  },
];
