import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { CMS_NAVIGATION, activeCmsItem } from "../src/lib/admin/navigation.ts";
import { getCmsNavigation } from "../src/lib/admin/navigation-access.ts";
import { getCmsOverview } from "../src/lib/admin/overview.ts";
import { buildAdminBreadcrumbs } from "../src/lib/admin/breadcrumbs.ts";
import {
  requireAdminUser,
  requireSuperAdmin,
} from "../src/app/admin/require-admin.ts";

// The real permission checker and Supabase SDK run against a read-only synthetic transport.
// No credentials, real session, database or storage connection is used.
const requests = [];
let fine = {},
  failure = false,
  thrown = false;
const user = { id: "cms-test", email: "cms@example.invalid" };
const areas = {
  academic: true,
  content: true,
  applications: true,
  submissions: true,
};
process.env.SUPER_ADMIN_EMAIL = "";
const response = (data, status = 200, headers = {}) =>
  new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const client = createClient("https://cms-tests.invalid", "isolated-test-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: async (input, options = {}) => {
      const url = new URL(input);
      const method = options.method || "GET";
      assert(
        ["GET", "HEAD"].includes(method),
        "CMS foundation must not write data",
      );
      requests.push({
        table: url.pathname.split("/").at(-1),
        query: url.searchParams,
        method,
      });
      const table = requests.at(-1).table;
      if (table === "admin_profiles")
        return response([
          { user_id: user.id, is_super_admin: false, permissions_v2: fine },
        ]);
      if (thrown && table === "programs")
        throw new Error("Synthetic network outage");
      if (failure && table === "programs")
        return response(
          { message: "Synthetic unavailable table", code: "42P01" },
          404,
        );
      if (method === "HEAD")
        return response(null, 200, { "content-range": "0-6/7" });
      if (table === "programs")
        return response([
          {
            id: "p",
            title: "Sample program",
            updated_at: "2026-10-25T10:00:00Z",
            is_published: true,
          },
        ]);
      if (table === "blogs")
        return response([
          {
            id: "b",
            title: "Sample draft",
            updated_at: "2026-10-26T10:00:00Z",
            published: false,
          },
        ]);
      if (table === "site_content")
        return response([
          {
            key: "home.hero.title",
            page: "home",
            label: "Homepage title",
            updated_at: "2026-10-27T10:00:00Z",
          },
        ]);
      throw new Error(`Unexpected table: ${table}`);
    },
  },
});
globalThis.__cmsTest = { client };
globalThis.__cmsTest.session = user;
assert.deepEqual(
  await requireAdminUser(),
  user,
  "Existing staff sessions still pass the existing authentication guard",
);
await assert.rejects(requireSuperAdmin(), /super admin only/);
process.env.SUPER_ADMIN_EMAIL = user.email;
assert.deepEqual(
  await requireSuperAdmin(),
  user,
  "Existing Superadmin sessions still pass",
);
process.env.SUPER_ADMIN_EMAIL = "";
globalThis.__cmsTest.session = null;
await assert.rejects(requireAdminUser(), /Unauthorized/);
globalThis.__cmsTest.session = user;
requests.length = 0;
console.log(
  "PASS: unchanged authentication guard accepts existing staff/Superadmin sessions and rejects missing sessions",
);
const ids = (items) => items.map((item) => item.id);
let items = await getCmsNavigation(user, { isSuper: true, permissions: areas });
assert.deepEqual(ids(items), ids(CMS_NAVIGATION));
assert.equal(
  requests.length,
  0,
  "Superadmin navigation needs no extra fine-permission queries",
);
fine = {
  "home.view": true,
  "applications.view": true,
  "countries.view": true,
  "users.create": true,
};
items = await getCmsNavigation(user, {
  isSuper: false,
  permissions: { ...areas, academic: false },
});
assert.deepEqual(ids(items), [
  "overview",
  "publishing",
  "home",
  "footer",
  "media",
  "applications",
  "agreements",
  "settings",
]);
assert(
  !ids(items).includes("team"),
  "Manipulated users.create must never expose Superadmin team management",
);
items = await getCmsNavigation(user, {
  isSuper: false,
  permissions: { ...areas, applications: false, content: false },
});
assert(
  !ids(items).includes("home") && !ids(items).includes("agreements"),
  "Existing area gates stay in force",
);
fine = { "*": true, "home.view": false, "universities.view": false };
items = await getCmsNavigation(user, { isSuper: false, permissions: areas });
assert(!ids(items).includes("home") && !ids(items).includes("universities"));
assert(ids(items).includes("settings") && !ids(items).includes("team"));
fine = {};
items = await getCmsNavigation(user, { isSuper: false, permissions: areas });
assert.equal(
  items.length,
  CMS_NAVIGATION.length - 1,
  "Existing legacy permission behavior is preserved",
);
console.log(
  "PASS: navigation uses existing fine/area permission rules, legacy access, and Superadmin-only team visibility",
);

const restricted = CMS_NAVIGATION.filter((item) =>
  ["overview", "home", "applications", "settings"].includes(item.id),
);
requests.length = 0;
let overview = await getCmsOverview(restricted);
assert.deepEqual(
  overview.stats.map((stat) => [stat.id, stat.count]),
  [["applications", 7]],
);
assert.equal(overview.queue[0].count, 7);
assert(
  requests.every((request) =>
    ["applications", "site_content"].includes(request.table),
  ),
  "No queries for unauthorized modules",
);
assert(
  requests
    .filter((request) => request.table === "applications")
    .every(
      (request) =>
        request.query.get("application_type") ===
        "in.(university,language_course)",
    ),
);
const content = requests.find((request) => request.table === "site_content");
assert.equal(content.query.get("select"), "key,label,page,updated_at");
assert.equal(content.query.get("key"), "not.like.agreement:%");
assert.equal(overview.recent[0].status, "saved");
requests.length = 0;
overview = await getCmsOverview(CMS_NAVIGATION);
assert.equal(overview.unavailable, false);
assert(overview.stats.every((stat) => stat.count === 7));
assert.deepEqual(
  overview.recent.map((item) => item.status),
  ["saved", "draft", "published"],
);
assert(
  requests
    .filter((request) => request.table === "agreement_state")
    .every(
      (request) =>
        request.query.get("deleted_at") === "is.null" &&
        request.query.get("select") === "agreement_id",
    ),
);
assert(
  requests.every(
    (request) =>
      !/snapshot|draft,|source_snapshot|password/.test(
        request.query.get("select") || "",
      ),
  ),
);
failure = true;
overview = await getCmsOverview(CMS_NAVIGATION);
assert(overview.unavailable);
assert.equal(
  overview.stats.find((stat) => stat.id === "universities").count,
  null,
  "Unavailable counts must never display fake zeros",
);
failure = false;
thrown = true;
overview = await getCmsOverview(CMS_NAVIGATION);
assert(overview.unavailable);
globalThis.__cmsTest.client = null;
overview = await getCmsOverview(restricted);
assert(overview.unavailable && overview.stats[0].count === null);
console.log(
  "PASS: authorized read-only overview, real counts/statuses, metadata-only recent content, unavailable service/table/network handling",
);

assert.equal(
  activeCmsItem(CMS_NAVIGATION, "/admin/agreements/example/revisions"),
  "agreements",
);
assert.equal(
  activeCmsItem(CMS_NAVIGATION, "/admin/destinations/countries"),
  "destinations",
);
assert.equal(activeCmsItem(CMS_NAVIGATION, "/admin/settings", "#team"), "settings");
assert.equal(activeCmsItem(restricted, "/admin/settings", "#team"), "settings");
assert.equal(
  activeCmsItem(CMS_NAVIGATION, "/admin/content/success-stories"),
  "stories",
);
assert.equal(activeCmsItem(CMS_NAVIGATION,"/admin/team"),"team");
assert.equal(activeCmsItem(CMS_NAVIGATION,"/admin/users"),"team");
const detail = buildAdminBreadcrumbs(
  "/admin/applications/example",
  "status=Pending&type=university",
);
assert.equal(
  detail[1].href,
  "/admin/applications?status=Pending&type=university",
);
assert.equal(
  buildAdminBreadcrumbs("/admin/agreements/example/revisions").at(-1).label,
  "Revision history",
);
assert(
  !buildAdminBreadcrumbs("/admin/agreements/example").some(
    (crumb) => crumb.label === "Example",
  ),
);
console.log(
  "PASS: compatible active routes, account anchors, readable agreement breadcrumbs and preserved application filters",
);
