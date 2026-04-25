"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { AdminAreaPermission } from "@/lib/auth/admin";

const permsSchema = z.object({
  academic: z.boolean().optional(),
  content: z.boolean().optional(),
  applications: z.boolean().optional(),
  submissions: z.boolean().optional(),
});

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters"),
  permissions: permsSchema,
});

export type AdminProfileRow = {
  user_id: string;
  email: string;
  is_super_admin: boolean;
  permissions: Record<string, boolean>;
  permissions_v2?: Record<string, boolean>;
};

function defaultPerms(): Record<AdminAreaPermission, boolean> {
  return { academic: true, content: true, applications: true, submissions: true };
}

function normalizePerms(p: z.infer<typeof permsSchema>): Record<AdminAreaPermission, boolean> {
  const d = defaultPerms();
  (Object.keys(d) as AdminAreaPermission[]).forEach((k) => {
    if (p[k] === false) d[k] = false;
  });
  return d;
}

export async function listAdminUsers(): Promise<{ ok: true; rows: AdminProfileRow[] } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data, error } = await svc
      .from("admin_profiles")
      .select("user_id, email, is_super_admin, permissions, permissions_v2")
      .order("email");
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (data ?? []) as AdminProfileRow[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createAdminUser(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }
    const { email, password, permissions: raw } = parsed.data;
    const permissions = normalizePerms(raw);
    if (Object.values(permissions).every((v) => v === false)) {
      return { ok: false, error: "At least one area must be allowed." };
    }
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: created, error: cErr } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
    if (cErr || !created.user) {
      return { ok: false, error: cErr?.message ?? "Could not create user" };
    }
    const { error: pErr } = await svc.from("admin_profiles").insert({
      user_id: created.user.id,
      email: email.trim().toLowerCase(),
      is_super_admin: false,
      permissions: permissions as unknown as Record<string, boolean>,
      permissions_v2: {},
    });
    if (pErr) {
      await svc.auth.admin.deleteUser(created.user.id);
      return { ok: false, error: pErr.message };
    }
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

const updatePermsSchema = z.object({
  userId: z.string().uuid(),
  permissions: permsSchema,
});

export async function updateAdminPermissions(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireSuperAdmin();
    const parsed = updatePermsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid data" };
    const { userId, permissions: raw } = parsed.data;
    if (userId === me.id) {
      return { ok: false, error: "You cannot change your own permissions here." };
    }
    const permissions = normalizePerms(raw);
    if (Object.values(permissions).every((v) => v === false)) {
      return { ok: false, error: "At least one area must be allowed." };
    }
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: target } = await svc.from("admin_profiles").select("is_super_admin").eq("user_id", userId).maybeSingle();
    if ((target as { is_super_admin?: boolean } | null)?.is_super_admin) {
      return { ok: false, error: "Use the database to adjust another super admin; app UI protects super accounts." };
    }
    const { error } = await svc.from("admin_profiles").update({ permissions }).eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

const updatePermsV2Schema = z.object({
  userId: z.string().uuid(),
  permissionsV2: z.record(z.string(), z.boolean()),
});

export async function updateAdminPermissionsV2(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireSuperAdmin();
    const parsed = updatePermsV2Schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid data" };
    const { userId, permissionsV2 } = parsed.data;
    if (userId === me.id) return { ok: false, error: "You cannot change your own permissions here." };
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: target } = await svc.from("admin_profiles").select("is_super_admin").eq("user_id", userId).maybeSingle();
    if ((target as { is_super_admin?: boolean } | null)?.is_super_admin) {
      return { ok: false, error: "Use the database to adjust another super admin; app UI protects super accounts." };
    }
    const { error } = await svc.from("admin_profiles").update({ permissions_v2: permissionsV2 }).eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/users");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function removeAdminAccess(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireSuperAdmin();
    if (userId === me.id) {
      return { ok: false, error: "You cannot remove your own access." };
    }
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: target } = await svc.from("admin_profiles").select("is_super_admin").eq("user_id", userId).maybeSingle();
    if ((target as { is_super_admin?: boolean } | null)?.is_super_admin) {
      return { ok: false, error: "Cannot remove a super admin from here." };
    }
    const { error } = await svc.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
