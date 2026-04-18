"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { AboutSectionKey } from "@/lib/data/about-page";

const keys: z.ZodType<AboutSectionKey> = z.enum([
  "about_us",
  "mission",
  "vision",
  "objective",
  "policy",
  "values",
]);

const sectionSchema = z.object({
  section_key: keys,
  title: z.string().min(1, "Title is required"),
  body: z.string(),
});

const bundleSchema = z.array(sectionSchema).min(1);

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveAboutSections(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = bundleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const rows = parsed.data.map((s) => ({
      section_key: s.section_key,
      title: s.title.trim(),
      body: s.body,
    }));

    for (const row of rows) {
      const { error } = await svc.from("about_sections").upsert(row, { onConflict: "section_key" });
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/about");
    revalidatePath("/admin/content/about");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}
