import { redirect } from "next/navigation";
import { requireAdminUser } from "@/app/admin/require-admin";
import { getAdminAccess, type AdminAreaPermission } from "@/lib/auth/admin";

/** Enforce that the current user may access a section; super always passes. */
export async function assertAdminScope(scope: AdminAreaPermission) {
  const user = await requireAdminUser();
  const access = await getAdminAccess(user);
  if (access.isSuper) return;
  if (access.permissions[scope] === false) {
    redirect("/admin/dashboard");
  }
}
