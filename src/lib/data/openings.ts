import type { Opening } from "@/lib/unimondo-data";
import { openings as staticOpenings } from "@/lib/unimondo-data";
import { programRowToOpening, type ProgramRow } from "@/lib/cms/maps";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LegacyOpeningRow = {
  id: string;
  continent: string;
  country: string;
  region: string;
  intake: string;
  university: string;
  logo_text: string;
  program_name: string;
  deadline: string;
  tuition_range: string;
  is_published: boolean | null;
};

function mapLegacyRow(row: LegacyOpeningRow): Opening {
  const deadline =
    typeof row.deadline === "string"
      ? row.deadline.slice(0, 10)
      : new Date(row.deadline).toISOString().slice(0, 10);
  return {
    id: row.id,
    continent: row.continent,
    country: row.country,
    region: row.region,
    intake: row.intake,
    university: row.university,
    logoText: row.logo_text,
    programName: row.program_name,
    deadline,
    tuitionRange: row.tuition_range,
  };
}

async function loadFromPrograms(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>): Promise<Opening[] | null> {
  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, title, university, country, degree, intake, deadline, tuition_range, description, logo_url, logo_text, continent, region, is_published, sort_order",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return null;
    }
    console.error("[getOpenings] programs", error.message);
    return null;
  }
  if (!data?.length) return null;
  return (data as ProgramRow[]).map(programRowToOpening);
}

async function loadFromLegacy(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>): Promise<Opening[] | null> {
  const { data, error } = await supabase
    .from("program_openings")
    .select(
      "id, continent, country, region, intake, university, logo_text, program_name, deadline, tuition_range, is_published",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getOpenings] program_openings", error.message);
    return null;
  }
  if (!data?.length) return null;
  return (data as LegacyOpeningRow[]).map(mapLegacyRow);
}

/** Loads program openings from Supabase when configured; otherwise static seed data. */
export async function getOpenings(): Promise<Opening[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return staticOpenings;
  }

  const fromPrograms = await loadFromPrograms(supabase);
  if (fromPrograms?.length) {
    return fromPrograms;
  }

  const legacy = await loadFromLegacy(supabase);
  if (legacy?.length) {
    return legacy;
  }

  return staticOpenings;
}
