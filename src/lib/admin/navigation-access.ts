import type { AdminAccessContext } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getMediaAccess } from "@/lib/media/access";
import { CMS_NAVIGATION, type CmsNavItem } from "./navigation";

export async function getCmsNavigation(
  user: { id: string; email?: string | null },
  access: AdminAccessContext,
): Promise<CmsNavItem[]> {
  const candidates = CMS_NAVIGATION.filter(
    (item) =>
      (!item.superOnly || access.isSuper) &&
      (!item.scope ||
        access.isSuper ||
        access.permissions[item.scope] !== false),
  );
  const media = await getMediaAccess(user, access, true);
  const visible = await Promise.all(
    candidates.map(async (item) =>
      item.id === "publishing"
        ? access.isSuper ||
          (access.permissions.content !== false &&
            ((await hasAdminPermission(user, "home.view")) ||
              (await hasAdminPermission(user, "blog.view")))) ||
          (access.permissions.academic !== false &&
            ((await hasAdminPermission(user, "countries.view")) ||
              (await hasAdminPermission(user, "universities.view")) ||
              (await hasAdminPermission(user, "courses.view")) ||
              (await hasAdminPermission(user, "packages.view"))))
        : item.id === "media"
          ? Object.values(media).some((grant) => grant.view)
          : access.isSuper ||
            !item.permission ||
            (await hasAdminPermission(user, item.permission)),
    ),
  );
  return candidates.filter((_, index) => visible[index]);
}
