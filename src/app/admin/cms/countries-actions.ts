"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { compactDestinationGuide, type DestinationGuide } from "@/lib/destination-guide";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const optionalText = z.string().optional().default("");

const destinationGuideSchema = z.object({
  overview: z
    .object({
      educationSystem: optionalText,
      popularCitiesLifestyle: optionalText,
      scholarships: optionalText,
    })
    .optional(),
  costs: z
    .object({
      tuitionBandNote: optionalText,
      accommodation: optionalText,
      foodTransport: optionalText,
      proofOfFunds: optionalText,
    })
    .optional(),
  visa: z
    .object({
      studentVisaType: optionalText,
      mainRequirements: optionalText,
      proofOfAdmission: optionalText,
      proofOfFunds: optionalText,
      insurance: optionalText,
      accommodation: optionalText,
      embassyNote: optionalText,
    })
    .optional(),
});

const countrySchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Name is required"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens"),
    flag_emoji: z.string().optional().default(""),
    description: z.string().optional().default(""),
    why_study: z.string().min(1, "Why study is required"),
    living_cost: z.string().min(1, "Living cost is required"),
    visa_info: z.string().optional().default(""),
    popular_unis: z.array(z.string()).min(1, "Add at least one university"),
    region_group_id: z.number().int().positive(),
    highlighted: z.boolean(),
    sort_order: z.number().int(),
    destination_guide: destinationGuideSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const structured = structuredVisaFieldsPresent(data.destination_guide);
    const legacy = data.visa_info.trim().length > 0;
    if (structured && legacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Use either structured visa fields (section C) or visa fallback prose — clear one side. Empty “Visa notes (fallback prose)” when structured visa is filled, or clear structured visa fields to use fallback bullets.",
        path: ["visa_info"],
      });
    }
    if (!structured && !legacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter structured visa fields (section C) or fill “Visa notes (fallback prose)” when structured fields are empty.",
        path: ["visa_info"],
      });
    }
  });

function structuredVisaFieldsPresent(guide: z.infer<typeof destinationGuideSchema> | undefined): boolean {
  const v = guide?.visa;
  if (!v) return false;
  return [
    v.studentVisaType,
    v.mainRequirements,
    v.proofOfAdmission,
    v.proofOfFunds,
    v.insurance,
    v.accommodation,
    v.embassyNote,
  ].some((s) => typeof s === "string" && s.trim().length > 0);
}

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveCountry(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("countries.edit");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = countrySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const c = parsed.data;
    const compactGuide = c.destination_guide
      ? compactDestinationGuide(c.destination_guide as unknown as DestinationGuide)
      : undefined;
    const payload = {
      name: c.name,
      slug: c.slug,
      flag_emoji: c.flag_emoji || null,
      description: c.description || null,
      why_study: c.why_study,
      why_study_there: c.why_study,
      living_cost: c.living_cost,
      living_cost_approx: c.living_cost,
      visa_info: c.visa_info,
      popular_unis: c.popular_unis,
      popular_universities: c.popular_unis,
      region_group_id: c.region_group_id,
      highlighted: c.highlighted,
      sort_order: c.sort_order,
      destination_guide: compactGuide ?? {},
    };

    if (c.id) {
      const { error } = await svc.from("countries").update(payload).eq("id", c.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("countries").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/destinations");
    revalidatePath("/admin/destinations/countries");
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteCountry(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("countries.delete");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("countries").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/destinations");
    revalidatePath("/admin/destinations/countries");
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
