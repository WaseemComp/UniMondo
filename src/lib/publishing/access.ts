import { requireAdminUser } from "@/app/admin/require-admin";
import { getAdminAccess } from "@/lib/auth/admin";
import {
  getAdminPermissionsV2,
  hasAdminPermission,
} from "@/lib/auth/permissions";
import { staffIdentity } from "@/lib/auth/staff-identity";
import type { Resource, WorkflowGrants } from "./model";
import { rowsFor, TABLE_FOR, type Payload } from "./model";
import { isDeepStrictEqual } from "node:util";

/** History restoration must retain the original create/edit/archive boundaries. */
export async function requireRestorationAccess(
  resource: Resource,
  before: Payload,
  after: Payload,
  user: { id: string; email?: string | null },
) {
  const scope = resource.type === "home"
    ? resource.key === "hero_slides" ? "home.hero_slider"
      : resource.key === "testimonials" ? "blog" : null
    : resource.type === "countries" ? "countries" : "universities";
  if (!scope) return; // Other homepage sections have only their existing edit key.
  const table = resource.type === "home"
    ? resource.key === "hero_slides" ? "cms_content_blocks" : "success_stories"
    : TABLE_FOR[resource.type];
  for (const row of rowsFor(after, table)) {
    const old = rowsFor(before, table).find((item) => item.id === row.id);
    if (isDeepStrictEqual(old, row)) continue;
    if (!(await hasAdminPermission(user, `${scope}.${old ? "edit" : "create"}`)))
      throw new Error("Restoring this version requires the original content create or edit permission.");
    if ((row.archived_at && !old?.archived_at) ||
      (scope === "blog" && old?.is_published && !row.is_published)) {
      if (!(await hasAdminPermission(user, `${scope}.delete`)))
        throw new Error("Restoring this version would archive content and requires archiving permission.");
    }
  }
}
export async function workflowIdentity() {
  const user = await requireAdminUser();
  const [context, fine] = await Promise.all([
    getAdminAccess(user),
    getAdminPermissionsV2(user),
  ]);
  return {
    user,
    context,
    superuser: context.isSuper,
    fine,
    decisions: new Map<string, Promise<boolean>>(),
  };
}
export async function workflowAccess(
  resource: Resource,
  identity?: Awaited<ReturnType<typeof workflowIdentity>>,
) {
  const auth = identity ?? (await workflowIdentity()),
    { user, context, superuser, fine } = auth;
  const can = (key: string) => {
      if (!auth.decisions.has(key))
        auth.decisions.set(key, hasAdminPermission(user, key));
      return auth.decisions.get(key)!;
    },
    home = resource.type === "home",
    area = home ? "content" : "academic";
  let view = context.isSuper || context.permissions[area] !== false;
  view =
    view &&
    (await can(
      home
        ? resource.key === "testimonials"
          ? "blog.view"
          : "home.view"
        : resource.type === "countries"
          ? "countries.view"
          : "universities.view",
    ));
  if (home && resource.key === "hero_slides")
    view = view && (await can("home.hero_slider.view"));
  if (home && resource.key === "why_stats")
    view = view && (await can("home.stats.view"));
  if (home && resource.key === "journey_cta")
    view = view && (await can("home.cta.view"));
  if (home && resource.key === "testimonials")
    view = view && (await can("blog.view"));
  const editKey = home
    ? resource.key === "hero_slides"
      ? "home.hero_slider.edit"
      : resource.key === "why_stats"
        ? "home.stats.edit"
        : resource.key === "journey_cta"
          ? "home.cta.edit"
          : resource.key === "testimonials"
            ? "blog.edit"
            : "home.edit"
    : resource.type === "countries"
      ? "countries.edit"
      : "universities.edit";
  const createKey = home
    ? resource.key === "hero_slides"
      ? "home.hero_slider.create"
      : resource.key === "testimonials"
        ? "blog.create"
        : editKey
    : resource.type === "countries"
      ? "countries.create"
      : "universities.create";
  // The two new privileges are explicit opt-ins. Existing legacy-empty maps/wildcards
  // do not silently acquire approval/publication rights; Superadmin retains control.
  const review = view && (superuser || fine["publishing.review"] === true);
  let publish = view && (superuser || fine["publishing.publish"] === true);
  if (!home)
    publish =
      publish &&
      (await can(
        resource.type === "countries"
          ? "countries.publish"
          : "universities.publish",
      ));
  if (home && resource.key === "testimonials")
    publish = publish && (await can("blog.publish"));
  const permissions: WorkflowGrants = {
    view,
    edit: view && ((await can(editKey)) || (await can(createKey))),
    review,
    publish,
    isSuper: superuser,
  };
  return {
    user,
    label: staffIdentity(user).fullName || user.email || "UniMondo staff",
    permissions,
  };
}
