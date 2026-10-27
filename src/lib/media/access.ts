import { getAdminAccess, type AdminAccessContext } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/app/admin/require-admin";
import { MEDIA_CATEGORIES, type MediaGrants } from "./types";

export async function getMediaAccess(user: { id: string; email?: string | null }, context?: AdminAccessContext, viewOnly = false): Promise<MediaGrants> {
  const access = context ?? await getAdminAccess(user);
  const keys = [...new Set(MEDIA_CATEGORIES.filter(category => access.isSuper || access.permissions[category.area] !== false).flatMap(category => viewOnly ? [...category.view] : [...category.view, ...category.upload, ...category.edit, ...category.archive]))];
  const results = await Promise.all(keys.map(async key => [key, access.isSuper || await hasAdminPermission(user, key)] as const));
  const grants = new Map(results);
  return Object.fromEntries(MEDIA_CATEGORIES.map(category => {
    const area = access.isSuper || access.permissions[category.area] !== false;
    const view = area && category.view.some(key => grants.get(key));
    return [category.id, { view, upload: view && category.upload.some(key => grants.get(key)), edit: view && category.edit.some(key => grants.get(key)), archive: view && (access.isSuper || category.archive.some(key => grants.get(key))) }];
  })) as MediaGrants;
}
export async function requireMediaAccess() {
  const user = await requireAdminUser();
  const permissions = await getMediaAccess(user);
  if (!Object.values(permissions).some(grant => grant.view)) throw new Error("MEDIA_FORBIDDEN");
  return { user, permissions };
}
