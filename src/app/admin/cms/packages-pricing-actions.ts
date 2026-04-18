"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

function revalidatePricing() {
  revalidatePath("/packages");
  revalidatePath("/apply");
  revalidatePath("/");
  revalidatePath("/admin/packages");
}

const packageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1, "Slug required")
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  name: z.string().min(1),
  teaser: z.string().optional().default(""),
  description: z.string().optional().default(""),
  best_for: z.string().optional().default(""),
  featuresText: z.string().optional().default(""),
  price_full: z.coerce.number().min(0),
  price_installment: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === "" || v == null) return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    }),
  sort_order: z.coerce.number().int(),
  is_published: z.boolean(),
});

const addOnSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  best_for: z.string().optional().default(""),
  price_full: z.coerce.number().min(0),
  price_installment: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === "" || v == null) return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    }),
  sort_order: z.coerce.number().int(),
  is_published: z.boolean(),
});

function parseFeatures(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveStudyPackage(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = packageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const id = p.id ?? randomUUID();
    const row = {
      id,
      slug: p.slug.trim(),
      name: p.name.trim(),
      teaser: p.teaser?.trim() ?? "",
      description: p.description?.trim() ?? "",
      best_for: p.best_for?.trim() || null,
      features: parseFeatures(p.featuresText ?? ""),
      price_full: p.price_full,
      price_installment: p.price_installment,
      sort_order: p.sort_order,
      is_published: p.is_published,
    };

    const { error } = await svc.from("packages").upsert(row, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };

    revalidatePricing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function deleteStudyPackage(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("packages").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePricing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function saveStudyAddOn(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = addOnSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const id = p.id ?? randomUUID();
    const row = {
      id,
      slug: p.slug.trim(),
      name: p.name.trim(),
      description: p.description?.trim() ?? "",
      best_for: p.best_for?.trim() || null,
      price_full: p.price_full,
      price_installment: p.price_installment,
      sort_order: p.sort_order,
      is_published: p.is_published,
    };

    const { error } = await svc.from("add_ons").upsert(row, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };

    revalidatePricing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function deleteStudyAddOn(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("add_ons").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePricing();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
