"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { AdminAreaPermission } from "@/lib/auth/admin";
import { areasForDetailedPermissions, completePermissionSelection, deniedDetailedPermissions, supportedPermissionSelection } from "@/lib/auth/permission-selection";
import { staffIdentity } from "@/lib/auth/staff-identity";

const permsSchema = z.object({
  academic: z.boolean().optional(),
  content: z.boolean().optional(),
  applications: z.boolean().optional(),
  submissions: z.boolean().optional(),
});

const createSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160, "Full name is too long"),
  designation: z.string().trim().min(1, "Designation is required").max(160, "Designation is too long"),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
  permissionsV2: z.record(z.string(), z.boolean()).default({})
    .refine(supportedPermissionSelection, "Select only supported detailed permissions"),
}).strict();

export type AdminProfileRow = {
  user_id: string;
  email: string;
  is_super_admin: boolean;
  permissions: Record<string, boolean>;
  permissions_v2?: Record<string, boolean>;
  full_name?: string;
  designation?: string;
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
    const rows = await Promise.all(((data ?? []) as AdminProfileRow[]).map(async row => {
      const { data: auth } = await svc.auth.admin.getUserById(row.user_id);
      if (!auth.user) return row;
      const identity = staffIdentity(auth.user);
      return { ...row, full_name: identity.fullName, designation: identity.designation };
    }));
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createAdminUser(input: unknown): Promise<{ ok: true; row: AdminProfileRow } | { ok: false; error: string }> {
  let createdId: string | undefined;
  let service: ReturnType<typeof createSupabaseServiceClient> = null;
  // Supabase Auth and profile storage do not share a transaction. Provision disabled,
  // verify everything, then activate; cleanup touches only the newly created ID.
  const disabledDuration = "876000h";
  try {
    await requireSuperAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }
    const { email, password, fullName, designation, permissionsV2: selected } = parsed.data;
    if (email === process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()) {
      return { ok: false, error: "The Superadmin email cannot be used for a new staff account." };
    }
    const permissionsV2 = completePermissionSelection(selected);
    const permissions = areasForDetailedPermissions(permissionsV2);
    const svc = service = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: created, error: cErr } = await svc.auth.admin.createUser({
      email, password, email_confirm: true, ban_duration: disabledDuration,
      app_metadata: { staff_identity: { full_name: fullName, designation } },
    });
    if (cErr || !created.user) {
      return { ok: false, error: "Could not create the staff login. Check the email and password requirements and try again." };
    }
    createdId = created.user.id;
    if (!(created.user.banned_until && Date.parse(created.user.banned_until) > Date.now())) throw new Error("Disabled login was not confirmed");
    const { error: pErr } = await svc.from("admin_profiles").insert({
      user_id: createdId,
      email,
      is_super_admin: false,
      permissions,
      permissions_v2: permissionsV2,
    });
    if (pErr) throw new Error("Profile could not be saved");
    const [{ data: profile, error: readError }, { data: auth, error: authError }] = await Promise.all([
      svc.from("admin_profiles").select("user_id,email,is_super_admin,permissions,permissions_v2").eq("user_id", createdId).single(),
      svc.auth.admin.getUserById(createdId),
    ]);
    const equalPermissions = (actual: Record<string, boolean> | null, expected: Record<string, boolean>) =>
      actual && Object.keys(actual).length === Object.keys(expected).length && Object.keys(expected).every(key => actual[key] === expected[key]);
    if (readError || authError || !profile || !auth.user || auth.user.id !== createdId || auth.user.email?.toLowerCase() !== email || profile.user_id !== createdId || profile.email !== email ||
      profile.is_super_admin !== false || !equalPermissions(profile.permissions, permissions) || !equalPermissions(profile.permissions_v2, permissionsV2) ||
      staffIdentity(auth.user).fullName !== fullName || staffIdentity(auth.user).designation !== designation ||
      !(auth.user.banned_until && Date.parse(auth.user.banned_until) > Date.now())) {
      throw new Error("Staff setup could not be verified");
    }
    const { data: activated, error: activationError } = await svc.auth.admin.updateUserById(createdId, { ban_duration: "none" });
    if (activationError || !activated.user || activated.user.id !== createdId ||
      (activated.user.banned_until && !(Date.parse(activated.user.banned_until) <= Date.now()))) throw new Error("Staff login could not be activated");
    // A cache refresh failure must not undo an otherwise completed account.
    try { revalidatePath("/admin/settings"); } catch { /* The verified row is returned for immediate display. */ }
    return { ok: true, row: { ...profile, full_name: fullName, designation } };
  } catch {
    if (createdId && service) {
      // Re-disable first: activation may have succeeded even if its response was lost.
      // Never remove the profile alone, which would trigger legacy permission fallbacks.
      let disabled = false;
      try {
        const { data, error } = await service.auth.admin.updateUserById(createdId, { ban_duration: disabledDuration });
        disabled = !error && Boolean(data.user?.banned_until && Date.parse(data.user.banned_until) > Date.now());
      } catch { /* Deletion below is a second independent cleanup attempt. */ }
      try {
        const { error } = await service.auth.admin.deleteUser(createdId);
        if (!error) return { ok: false, error: "Staff setup failed. The new login was removed; no new account remains." };
      } catch { /* Report disabled/uncertain state without exposing credentials or backend payloads. */ }
      return { ok: false, error: disabled
        ? `Staff setup failed. The new login remains disabled (account ${createdId}); a Superadmin must remove it before retrying.`
        : `Staff setup failed and cleanup could not be verified (account ${createdId}). A Superadmin must inspect this account before retrying.` };
    }
    return { ok: false, error: "Staff account was not created. Check your Superadmin access and try again." };
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
    const { data: auth, error: authError } = await svc.auth.admin.getUserById(userId);
    if (authError || !auth.user) return { ok: false, error: "Could not verify the staff account. Permissions were not changed." };
    // Newly provisioned staff use Detailed as their complete access editor. Keep the
    // existing area gates in sync; legacy users retain their separate area assignments.
    const strictPermissions = Object.keys(permissionsV2).length ? permissionsV2 : deniedDetailedPermissions();
    const updates = auth.user.app_metadata?.staff_identity
      ? { permissions_v2: strictPermissions, permissions: areasForDetailedPermissions(strictPermissions) }
      : { permissions_v2: permissionsV2 };
    const { error } = await svc.from("admin_profiles").update(updates).eq("user_id", userId);
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
