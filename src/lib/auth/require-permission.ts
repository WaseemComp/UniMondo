import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";

/** Server-side guard for Server Actions. */
export async function requirePermission(permissionKey: string): Promise<void> {
  const me = await requireAdminUser();
  const ok = await hasAdminPermission(me, permissionKey);
  if (!ok) throw new Error("Forbidden");
}

