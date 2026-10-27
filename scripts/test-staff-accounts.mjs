import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAdminUser, listAdminUsers, updateAdminPermissions, updateAdminPermissionsV2, removeAdminAccess } from "../src/app/admin/cms/admin-users-actions.ts";
import { hasAdminPermission } from "../src/lib/auth/permissions.ts";
import { getAdminAccess, isSuperAdmin } from "../src/lib/auth/admin.ts";
import { staffIdentity } from "../src/lib/auth/staff-identity.ts";
import { DETAILED_PERMISSION_KEYS, deniedDetailedPermissions, completePermissionSelection, areasForDetailedPermissions } from "../src/lib/auth/permission-selection.ts";
import { PERMISSION_TREE } from "../src/lib/auth/permission-definitions.ts";
import { AdminUsersManager } from "../src/components/admin/admin-users-manager.tsx";
import { AdminSettingsContent } from "../src/components/admin/admin-settings-content.tsx";
import { PermissionMatrix } from "../src/components/admin/permission-matrix.tsx";

// Actual Supabase SDK + server actions/guards/checkers. Only session and HTTP transport are isolated.
// No production service, real account, real password, or database connection is used.
const users = new Map(), profiles = new Map(), events = [];
let faults = {};
const syntheticSecret = crypto.randomBytes(24).toString("base64url");
const superUser = { id: crypto.randomUUID(), email: "super@example.invalid", app_metadata: {}, user_metadata: {} };
const legacyUser = { id: crypto.randomUUID(), email: "legacy@example.invalid", app_metadata: {}, user_metadata: { full_name: "Existing Staff", designation: "Existing Role" } };
process.env.ADMIN_EMAILS = ""; process.env.SUPER_ADMIN_EMAIL = superUser.email;
users.set(superUser.id, structuredClone(superUser)); users.set(legacyUser.id, structuredClone(legacyUser));
profiles.set(superUser.id, { user_id: superUser.id, email: superUser.email, is_super_admin: true, permissions: {}, permissions_v2: {} });
profiles.set(legacyUser.id, { user_id: legacyUser.id, email: legacyUser.email, is_super_admin: false, permissions: {}, permissions_v2: {} });
const legacyBefore = structuredClone({ auth: users.get(legacyUser.id), profile: profiles.get(legacyUser.id) });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const error = (status = 500) => reply({ code: "test_failure", message: "Synthetic service failure" }, status);
const clone = value => structuredClone(value);
const future = () => new Date(Date.now() + 86400000).toISOString();
const client = createClient("https://staff-tests.invalid", "isolated-test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: {
  fetch: async (input, options = {}) => {
    const url = new URL(input); const method = options.method || "GET";
    if (url.pathname.startsWith("/auth/v1/admin/users")) {
      const id = url.pathname.split("/")[5];
      if (method === "POST") {
        events.push("auth:create-disabled");
        const body = JSON.parse(options.body);
        assert.equal(body.password, syntheticSecret, "Tests use only an ephemeral synthetic secret");
        assert.equal(body.email_confirm, true);
        assert.equal(body.ban_duration, "876000h");
        assert(!body.user_metadata && !body.role, "Assigned identity must be server managed; role is never input");
        if (faults.create || [...users.values()].some(user => user.email === body.email)) return error(422);
        const user = { id: crypto.randomUUID(), email: body.email, app_metadata: body.app_metadata, user_metadata: {}, role: "authenticated", aud: "authenticated", created_at: new Date().toISOString(), banned_until: future() };
        if (faults.noInitialBan) delete user.banned_until;
        users.set(user.id, user); return reply(clone(user));
      }
      if (method === "GET") {
        events.push("auth:verify");
        if (faults.authRead && id !== superUser.id && id !== legacyUser.id) return error();
        const user = clone(users.get(id));
        if (!user) return error(404);
        if (faults.identityRead && id !== superUser.id && id !== legacyUser.id) user.app_metadata = {};
        return reply(user);
      }
      if (method === "PUT") {
        const body = JSON.parse(options.body); const user = users.get(id);
        if (!user) return error(404);
        if (body.ban_duration === "none") {
          events.push("auth:activate");
          const profile = profiles.get(id);
          assert(profile && Object.keys(profile.permissions_v2).length, "No activation before complete permissions exist");
          if (faults.activation) return error();
          user.banned_until = null;
          if (faults.lostActivation) return error();
        } else {
          events.push("auth:disable-cleanup");
          if (faults.cleanupBan) return error();
          user.banned_until = future();
        }
        return reply(clone(user));
      }
      if (method === "DELETE") {
        events.push("auth:delete-cleanup");
        if (faults.cleanupDelete) return error();
        const old = users.get(id); users.delete(id); profiles.delete(id); return reply({ user: clone(old) });
      }
    }
    assert.equal(url.pathname, "/rest/v1/admin_profiles");
    if (method === "POST") {
      events.push("profile:save");
      if (faults.profileInsert) return error();
      const row = JSON.parse(options.body);
      assert.equal(row.is_super_admin, false);
      assert(Object.values(row.permissions_v2).every(v => typeof v === "boolean"));
      assert(!JSON.stringify(row).includes(syntheticSecret), "No plaintext password in profile storage");
      assert(Date.parse(users.get(row.user_id).banned_until) > Date.now(), "Login remains disabled while profile is saved");
      profiles.set(row.user_id, row); return reply(null, 201);
    }
    const id = url.searchParams.get("user_id")?.replace(/^eq\./, "");
    if (method === "PATCH") {
      events.push("profile:update"); Object.assign(profiles.get(id), JSON.parse(options.body)); return reply(null, 200);
    }
    assert.equal(method, "GET"); events.push("profile:verify");
    if (faults.profileRead && id !== superUser.id && id !== legacyUser.id) return error();
    let rows = id ? (profiles.has(id) ? [clone(profiles.get(id))] : []) : [...profiles.values()].map(clone);
    if (faults.permissionRead && id !== superUser.id && id !== legacyUser.id && rows[0]) rows[0].permissions_v2["countries.delete"] = true;
    if (faults.areaRead && id !== superUser.id && id !== legacyUser.id && rows[0]) rows[0].permissions.content = true;
    const accept = new Headers(options.headers).get("accept") || "";
    return reply(accept.includes("application/vnd.pgrst.object+json") ? rows[0] ?? null : rows);
  },
} });
globalThis.__staffTest = { client, session: superUser, revalidated: [] };
const input = (extra = {}) => ({ fullName: "  Example Staff  ", designation: "  Admissions Adviser  ", email: `staff-${crypto.randomUUID()}@example.invalid`, password: syntheticSecret,
  permissionsV2: { "countries.view": true, "countries.edit": true, "users.create": true }, ...extra });
const fresh = () => { faults = {}; events.length = 0; globalThis.__staffTest.session = superUser; };
const protectedBefore = () => clone({ auth: users.get(legacyUser.id), profile: profiles.get(legacyUser.id) });
for (const extra of [{ fullName: " " }, { designation: "" }, { email: "invalid" }, { password: "short" },
  { permissionsV2: { "*": true } }, { permissionsV2: { "users.*": true } }, { permissionsV2: { "countries.view": "true" } },
  { permissionsV2: { "invented.permission": true } }, { is_super_admin: true }, { role: "service_role" }, { email: superUser.email }]) {
  fresh(); const result = await createAdminUser(input(extra)); assert.equal(result.ok, false); assert(!events.includes("auth:create-disabled"));
  assert(!JSON.stringify(result).includes(syntheticSecret));
}
console.log("PASS: identity, credentials and exact permission validation; reserved role/wildcard injection rejected");
fresh(); const request = input(); const result = await createAdminUser(request); assert.equal(result.ok, true);
const newId = result.row.user_id; const newUser = users.get(newId);
assert.equal(result.row.full_name, "Example Staff"); assert.equal(result.row.designation, "Admissions Adviser");
assert.deepEqual(profiles.get(newId).permissions_v2, completePermissionSelection(request.permissionsV2));
assert.deepEqual(profiles.get(newId).permissions, { academic: true, content: false, applications: false, submissions: false });
assert.equal(newUser.banned_until, null);
assert(events.indexOf("profile:save") < events.indexOf("auth:activate"));
assert(events.indexOf("auth:verify") < events.indexOf("auth:activate"));
assert.equal(await hasAdminPermission(newUser, "countries.view"), true);
for (const key of ["countries.create", "countries.delete", "countries.publish", "home.edit", "agreements.discount", "users.delete"]) assert.equal(await hasAdminPermission(newUser, key), false);
assert.equal(await isSuperAdmin(newUser), false);
assert.equal((await getAdminAccess(newUser)).permissions.content, false);
newUser.user_metadata = { full_name: "Changed by staff", designation: "Superadmin", is_super_admin: true, permissions_v2: { "*": true } };
assert.deepEqual(staffIdentity(newUser), { fullName: "Example Staff", designation: "Admissions Adviser" });
assert.equal(await isSuperAdmin(newUser), false);
console.log("PASS: disabled provisioning, read-back verification, exact grants and server-managed identity");
for (const session of [null, legacyUser, newUser]) {
  globalThis.__staffTest.session = session; events.length = 0;
  assert.equal((await createAdminUser(input())).ok, false);
  assert.equal((await listAdminUsers()).ok, false);
  assert.equal((await updateAdminPermissionsV2({ userId: legacyUser.id, permissionsV2: { "*": true } })).ok, false);
  assert.equal((await updateAdminPermissions({ userId: legacyUser.id, permissions: { academic: true } })).ok, false);
  assert.equal((await removeAdminAccess(legacyUser.id)).ok, false);
  assert(!events.some(e => e.startsWith("auth:create") || e.startsWith("auth:delete") || e === "profile:update"));
}
fresh();
for (const userId of [superUser.id]) {
  assert.equal((await updateAdminPermissionsV2({ userId, permissionsV2: { "*": false } })).ok, false);
  assert.equal((await removeAdminAccess(userId)).ok, false);
}
assert.equal(await hasAdminPermission(legacyUser, "countries.delete"), true, "Existing empty-map legacy behavior remains intact");
assert.deepEqual(protectedBefore(), legacyBefore);
assert.deepEqual(staffIdentity(legacyUser), { fullName: "Existing Staff", designation: "Existing Role" });
console.log("PASS: non-superadmins cannot manage staff even with users.create checked; existing legacy access and accounts unchanged");
fresh(); const denied = await createAdminUser(input({ permissionsV2: {} })); assert.equal(denied.ok, true);
assert.deepEqual(profiles.get(denied.row.user_id).permissions_v2, deniedDetailedPermissions());
assert(Object.values(profiles.get(denied.row.user_id).permissions).every(allowed => allowed === false));
assert.equal(await hasAdminPermission(users.get(denied.row.user_id), "countries.view"), false);
assert.equal(areasForDetailedPermissions({ "blog.view": true }).academic, true);
const beforeChange = clone(users.get(newId));
const edited = { ...profiles.get(newId).permissions_v2, "countries.publish": true, "countries.edit": false };
assert.equal((await updateAdminPermissionsV2({ userId: newId, permissionsV2: edited })).ok, true);
assert.deepEqual(profiles.get(newId).permissions_v2, edited);
assert.deepEqual(users.get(newId), beforeChange);
assert.equal(await hasAdminPermission(newUser, "countries.publish"), true);
const moved = completePermissionSelection({ "home.view": true });
assert.equal((await updateAdminPermissionsV2({ userId: newId, permissionsV2: moved })).ok, true);
assert.deepEqual(profiles.get(newId).permissions, { academic: false, content: true, applications: false, submissions: false });
assert.equal(await hasAdminPermission(newUser, "countries.view"), false);
assert.equal(await hasAdminPermission(newUser, "home.view"), true);
assert.equal((await updateAdminPermissionsV2({ userId: newId, permissionsV2: {} })).ok, true);
assert.deepEqual(profiles.get(newId).permissions_v2, deniedDetailedPermissions(), "Clearing a new staff member's detailed permissions must never enable legacy full access");
assert.equal(await hasAdminPermission(newUser, "home.view"), false);
const listed = await listAdminUsers(); assert.equal(listed.ok, true);
assert.equal(listed.rows.find(row => row.user_id === newId).designation, "Admissions Adviser");
console.log("PASS: all-denied account remains strict; existing Detailed permission updates and identity listing work");
for (const failure of ["profileInsert", "profileRead", "authRead", "identityRead", "permissionRead", "areaRead", "activation", "lostActivation", "noInitialBan"]) {
  fresh(); faults[failure] = true; const idsBefore = [...users.keys()];
  const failed = await createAdminUser(input()); assert.equal(failed.ok, false);
  assert(!JSON.stringify(failed).includes(syntheticSecret));
  assert.deepEqual([...users.keys()], idsBefore, `Failed ${failure} must remove only its new account`);
  assert(events.includes("auth:disable-cleanup") && events.includes("auth:delete-cleanup"));
  if (!["activation", "lostActivation"].includes(failure)) assert(!events.includes("auth:activate"));
}
fresh(); faults = { profileInsert: true, cleanupDelete: true };
const failedCleanup = await createAdminUser(input()); assert.equal(failedCleanup.ok, false); assert(failedCleanup.error.includes("remains disabled"));
for (const user of users.values()) if (!profiles.has(user.id)) assert(Date.parse(user.banned_until) > Date.now());
fresh(); faults.create = true; const beforeCreateFailure = clone([...users.entries()]);
assert.equal((await createAdminUser(input())).ok, false); assert.deepEqual([...users.entries()], beforeCreateFailure); assert(!events.includes("auth:delete-cleanup"));
fresh(); assert.deepEqual(protectedBefore(), legacyBefore);
console.log("PASS: save/read-back/activation failures roll back new accounts; cleanup failure retains a disabled login; existing accounts untouched");
fresh();
const otherSuper = { id: crypto.randomUUID(), email: "other-super@example.invalid", app_metadata: {}, user_metadata: {} };
users.set(otherSuper.id, otherSuper);
profiles.set(otherSuper.id, { user_id: otherSuper.id, email: otherSuper.email, is_super_admin: true, permissions: {}, permissions_v2: {} });
for (const userId of [otherSuper.id]) {
  assert.equal((await updateAdminPermissionsV2({ userId, permissionsV2: { "users.edit": true } })).ok, false);
  assert.equal((await updateAdminPermissions({ userId, permissions: { academic: false } })).ok, false);
  assert.equal((await removeAdminAccess(userId)).ok, false);
}
const oldIdentity = { id: crypto.randomUUID(), email: "legacy-editor@example.invalid", app_metadata: {}, user_metadata: {} };
users.set(oldIdentity.id, oldIdentity);
const oldAreas = { academic: false, content: true, applications: false, submissions: false };
profiles.set(oldIdentity.id, { user_id: oldIdentity.id, email: oldIdentity.email, is_super_admin: false, permissions: clone(oldAreas), permissions_v2: { "home.view": true } });
assert.equal((await updateAdminPermissionsV2({ userId: oldIdentity.id, permissionsV2: { "home.edit": true } })).ok, true);
assert.deepEqual(profiles.get(oldIdentity.id).permissions, oldAreas, "Legacy area assignments are not normalized or reset");
assert.deepEqual(users.get(oldIdentity.id), oldIdentity);
assert.deepEqual(protectedBefore(), legacyBefore);
console.log("PASS: other Superadmin accounts are protected and legacy Detailed edits preserve separate area gates");
const html = renderToStaticMarkup(createElement(AdminUsersManager, { initialRows: listed.rows, currentUserId: superUser.id }));
const positions = ["Staff Information", "nu-name", "nu-designation", "Detailed Access Permissions", "Account Credentials", "nu-email", "nu-pw", "Create Staff Account"].map(text => html.indexOf(text));
assert(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])));
const creation = html.slice(0, html.indexOf("</form>"));
assert(!creation.includes('checked=""')); assert(creation.includes("<details") && creation.includes("overflow-y-auto"));
for (const key of DETAILED_PERMISSION_KEYS.filter(key => !["home.hero_slider", "home.stats", "home.cta"].includes(key))) assert(creation.includes(`data-permission-key="${key}"`));
assert(html.includes(">Detailed</button>"));
const staffHtml = renderToStaticMarkup(createElement(AdminSettingsContent, { access: await getAdminAccess(newUser), currentUserId: newId, adminRows: [] }));
assert(staffHtml.includes("Change your password") && !staffHtml.includes("Create Staff Account") && !staffHtml.includes("nu-designation"));
assert(staffHtml.includes('type="password"') && !staffHtml.includes(syntheticSecret));
const matrix = renderToStaticMarkup(createElement(PermissionMatrix, { value: deniedDetailedPermissions(), onChange() {}, idPrefix: "test" }));
assert.equal((matrix.match(/Enable all/g) || []).length, PERMISSION_TREE.length + 3);
console.log("PASS: creation form order/default-deny controls, shared collapsible matrix, existing Detailed button and staff-only password screen");
console.log("All staff account checks passed. Tests used ephemeral synthetic credentials and isolated HTTP storage only.");
