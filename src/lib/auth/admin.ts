import { createSupabaseServiceClient } from "@/lib/supabase/admin";

/**
 * Who may access /admin: comma-separated emails in ADMIN_EMAILS,
 * plus optional rows in public.admin_profiles (checked server-side).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const list = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list?.length && list.includes(normalized)) return true;
  return false;
}

export type AdminAreaPermission = "academic" | "content" | "applications" | "submissions";

export type AdminAccessContext = {
  isSuper: boolean;
  /** false for an area = hide section in nav and block routes (if enforced). Omitted in DB = allowed. */
  permissions: Record<AdminAreaPermission, boolean>;
};

function fullPermissionsTrue(): AdminAccessContext["permissions"] {
  return { academic: true, content: true, applications: true, submissions: true };
}

/** Super admin: env SUPER_ADMIN_EMAIL, or is_super_admin in admin_profiles. Full access + can manage other admins. */
export async function isSuperAdmin(user: { id: string; email?: string | null }): Promise<boolean> {
  const fromEnv = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (fromEnv && user.email?.trim().toLowerCase() === fromEnv) return true;
  const svc = createSupabaseServiceClient();
  if (!svc) return false;
  const { data } = await svc.from("admin_profiles").select("is_super_admin").eq("user_id", user.id).maybeSingle();
  return Boolean((data as { is_super_admin?: boolean } | null)?.is_super_admin);
}

/** For sidebar + route checks. Missing profile (env-only admin) => full area access, not super. */
export async function getAdminAccess(user: { id: string; email?: string | null }): Promise<AdminAccessContext> {
  if (await isSuperAdmin(user)) {
    return { isSuper: true, permissions: fullPermissionsTrue() };
  }
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return { isSuper: false, permissions: fullPermissionsTrue() };
  }
  const { data, error } = await svc
    .from("admin_profiles")
    .select("is_super_admin, permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) {
    return { isSuper: false, permissions: fullPermissionsTrue() };
  }
  const row = data as { is_super_admin?: boolean; permissions?: Record<string, boolean> | null };
  if (row.is_super_admin) {
    return { isSuper: true, permissions: fullPermissionsTrue() };
  }
  const p = row.permissions ?? {};
  const on = (k: AdminAreaPermission) => p[k] !== false;
  return {
    isSuper: false,
    permissions: {
      academic: on("academic"),
      content: on("content"),
      applications: on("applications"),
      submissions: on("submissions"),
    },
  };
}

/** Use in Server Actions after getUser(): env allowlist OR admin_profiles row. */
export async function isAdminUser(user: { id: string; email?: string | null }): Promise<boolean> {
  if (isAdminEmail(user.email)) return true;
  const svc = createSupabaseServiceClient();
  if (!svc) return false;
  const { data } = await svc.from("admin_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  return data != null;
}
