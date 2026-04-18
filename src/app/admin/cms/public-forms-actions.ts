"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WORK_WITH_US_COLLAB_OPTIONS } from "@/lib/contact-form-options";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const workWithUsSchema = z
  .object({
    entity_type: z.enum(["individual", "organization"]),
    organization_name: z.string().optional().default(""),
    contact_person_name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(5, "Phone is required"),
    collaboration_nature: z.enum(WORK_WITH_US_COLLAB_OPTIONS),
    collaboration_other: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.entity_type === "organization" && !data.organization_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required",
        path: ["organization_name"],
      });
    }
    if (data.collaboration_nature === "Other" && !data.collaboration_other?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please describe the collaboration",
        path: ["collaboration_other"],
      });
    }
  });

const joinUsSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(5, "Phone is required"),
  position_applying_for: z.string().min(1, "Position is required"),
  preferred_location: z.string().min(1, "Preferred location is required"),
  current_location: z.string().optional().default(""),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function submitWorkWithUsForm(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "Server configuration error." };

    const parsed = workWithUsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const w = parsed.data;
    const { error } = await svc.from("work_with_us_submissions").insert({
      entity_type: w.entity_type,
      organization_name: w.organization_name?.trim() || null,
      contact_person_name: w.contact_person_name.trim(),
      email: w.email.trim().toLowerCase(),
      phone: w.phone.trim(),
      collaboration_nature: w.collaboration_nature,
      collaboration_other: w.collaboration_nature === "Other" ? w.collaboration_other.trim() : null,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/submissions/work-with-us");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return { ok: false, error: msg };
  }
}

export async function submitJoinUsForm(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "Server configuration error." };

    const parsed = joinUsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const j = parsed.data;
    const { error } = await svc.from("join_us_submissions").insert({
      full_name: j.full_name.trim(),
      email: j.email.trim().toLowerCase(),
      phone: j.phone.trim(),
      position_applying_for: j.position_applying_for.trim(),
      preferred_location: j.preferred_location.trim(),
      current_location: j.current_location?.trim() || null,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/submissions/join-us");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return { ok: false, error: msg };
  }
}
