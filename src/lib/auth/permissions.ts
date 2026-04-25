import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin";

export type AdminPermissionKey = string;
export type AdminPermissionsV2 = Record<AdminPermissionKey, boolean>;

function candidatesFor(key: string): string[] {
  const parts = key.split(".").filter(Boolean);
  const out: string[] = [];
  // Most specific first
  out.push(parts.join("."));
  for (let i = parts.length - 1; i >= 1; i--) {
    out.push(parts.slice(0, i).join(".") + ".*");
  }
  out.push("*");
  return out;
}

export async function getAdminPermissionsV2(user: { id: string; email?: string | null }): Promise<AdminPermissionsV2> {
  const svc = createSupabaseServiceClient();
  if (!svc) return {};
  const { data } = await svc.from("admin_profiles").select("permissions_v2").eq("user_id", user.id).maybeSingle();
  const row = data as { permissions_v2?: AdminPermissionsV2 | null } | null;
  return (row?.permissions_v2 ?? {}) as AdminPermissionsV2;
}

/**
 * Permission check for server-side enforcement (Server Actions / Route Handlers).
 *
 * Rules:
 * - Super admin: always allowed.
 * - If permissions_v2 is empty: treat as legacy admin => allowed (prevents breaking existing admins).
 * - Otherwise: most-specific matching key wins; missing => deny.
 */
export async function hasAdminPermission(
  user: { id: string; email?: string | null },
  key: AdminPermissionKey,
): Promise<boolean> {
  if (await isSuperAdmin(user)) return true;
  const p = await getAdminPermissionsV2(user);
  const keys = Object.keys(p);
  if (!keys.length) return true;
  for (const k of candidatesFor(key)) {
    if (k in p) return p[k] !== false;
  }
  return false;
}

