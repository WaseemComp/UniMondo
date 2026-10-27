import type { AdminAccessContext } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { CMS_NAVIGATION, type CmsNavItem } from "./navigation";

export async function getCmsNavigation(user: { id: string; email?: string | null }, access: AdminAccessContext): Promise<CmsNavItem[]> {
  const candidates = CMS_NAVIGATION.filter(item => (!item.superOnly || access.isSuper) &&
    (!item.scope || access.isSuper || access.permissions[item.scope] !== false));
  const visible = await Promise.all(candidates.map(async item =>
    access.isSuper || !item.permission || await hasAdminPermission(user, item.permission)));
  return candidates.filter((_, index) => visible[index]);
}
