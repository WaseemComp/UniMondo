import { requireAdminUser } from "@/app/admin/require-admin";
import { getAdminAccess } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import {
  TABLES,
  type AcademicKind,
  type AcademicRow,
  type CatalogueData,
  type CataloguePermissions,
} from "./model";
export async function academicAccess() {
  const user = await requireAdminUser(),
    access = await getAdminAccess(user);
  const permissions = {} as CataloguePermissions;
  await Promise.all(
    (Object.keys(TABLES) as AcademicKind[]).map(async (kind) => {
      const group = kind === "countries" ? "countries" : "universities",
        grants = {} as CataloguePermissions[AcademicKind];
      await Promise.all(
        (["view", "create", "edit", "publish", "delete"] as const).map(
          async (action) => {
            grants[action] =
              (access.isSuper || access.permissions.academic !== false) &&
              (await hasAdminPermission(user, `${group}.${action}`));
          },
        ),
      );
      permissions[kind] = grants;
    }),
  );
  return { user, permissions };
}
export async function readAcademicCatalogue(): Promise<CatalogueData> {
  const { permissions } = await academicAccess();
  const empty = {
    countries: [],
    universities: [],
    programmes: [],
    regions: [],
    permissions,
    ready: false,
  };
  const svc = createSupabaseServiceClient();
  if (!svc)
    return {
      ...empty,
      error: "The academic catalogue is temporarily unavailable.",
    };
  const result = { ...empty } as CatalogueData;
  // Explicit setup probes: fail closed rather than offering unsafe legacy saves before migration.
  for (const kind of Object.keys(TABLES) as AcademicKind[]) {
    if (!permissions[kind].view) continue;
    const probe = await svc
      .from(TABLES[kind])
      .select(
        kind === "countries"
          ? "catalogue,is_published,archived_at"
          : kind === "universities"
            ? "country_id,profile,archived_at"
            : "university_id,details,archived_at",
      )
      .limit(0);
    if (probe.error)
      return {
        ...empty,
        error:
          "The academic catalogue needs setup or is temporarily unavailable. Contact the site owner. No existing content has changed.",
      };
    const rows: AcademicRow[] = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
      const { data, error } = await svc
        .from(TABLES[kind])
        .select("*")
        .order("sort_order")
        .order("id")
        .range(offset, offset + 999);
      if (error)
        return {
          ...empty,
          error:
            "Existing catalogue records could not be loaded. Saving is disabled.",
        };
      rows.push(...((data ?? []) as AcademicRow[]));
      if ((data?.length ?? 0) < 1000) break;
      if (offset === 19000)
        return {
          ...empty,
          error:
            "The catalogue exceeds the safe editor limit. Narrow server-side paging is required before editing.",
        };
    }
    result[kind] = rows;
  }
  if (permissions.countries.view) {
    const { data, error } = await svc
      .from("region_groups")
      .select("id,label")
      .order("sort_order");
    if (error)
      return { ...empty, error: "Destination regions could not be loaded." };
    result.regions = data ?? [];
  }
  return { ...result, ready: true };
}
