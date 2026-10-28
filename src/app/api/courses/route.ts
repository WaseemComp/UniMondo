import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ courses: [] });
  }

  const { data, error } = await supabase
    .from("language_courses")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({
    courses: (data ?? []).filter((row) => !row.archived_at),
  });
}
