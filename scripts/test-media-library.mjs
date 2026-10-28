import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { mediaFixture } from "./fixtures/media-fixture.mjs";
import { prepareMediaImage } from "../src/lib/media/image.ts";
import { getMediaAccess, requireMediaAccess } from "../src/lib/media/access.ts";
import {
  uploadMedia,
  changeMedia,
  validateManagedMediaSelection,
} from "../src/lib/media/operations.ts";
import { loadMediaCatalogue } from "../src/lib/media/catalogue.ts";
import { GET, POST } from "../src/app/api/admin/media/route.ts";
import {
  PATCH,
  GET as assetGET,
} from "../src/app/api/admin/media/[id]/route.ts";
import { saveHomepageEditor } from "../src/app/admin/cms/homepage-editor-actions.ts";
import { DEFAULT_HERO_SLIDES } from "../src/lib/homepage/content.ts";
import { boundedMediaForm } from "../src/lib/media/http.ts";
const { state, user } = mediaFixture();
const image = sharp({
  create: { width: 120, height: 80, channels: 4, background: "#3978a0" },
});
const png = await image.clone().png().toBuffer();
for (const [format, mime] of [
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["avif", "image/avif"],
]) {
  const data = await image.clone()[format]().toBuffer();
  const output = await prepareMediaImage(
    new File([data], `sample.${format}`, { type: mime }),
  );
  assert.equal(output.mime, "image/webp");
  assert.equal(output.width, 120);
  assert.equal(output.height, 80);
  assert(!("exif" in (await sharp(output.data).metadata())));
}
await assert.rejects(
  prepareMediaImage(new File([png], "spoof.jpg", { type: "image/jpeg" })),
  /content/,
);
await assert.rejects(
  prepareMediaImage(new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" })),
  /content/,
);
await assert.rejects(
  prepareMediaImage(
    new File([Buffer.alloc(4 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  ),
  /4 MB/,
);
const tiny = await sharp({
  create: { width: 1, height: 1, channels: 3, background: "white" },
})
  .png()
  .toBuffer();
await assert.rejects(
  prepareMediaImage(new File([tiny], "tiny.png", { type: "image/png" })),
  /16/,
);
const large = await sharp({
  create: { width: 12001, height: 16, channels: 3, background: "white" },
})
  .png()
  .toBuffer();
await assert.rejects(
  prepareMediaImage(new File([large], "wide.png", { type: "image/png" })),
  /12,000/,
);
console.log(
  "PASS: actual JPG/PNG/WebP/AVIF decoding, optimized dimensions/metadata, spoof/SVG/oversize/tiny/extreme dimensions rejected",
);
let grants = await getMediaAccess(user);
assert(grants.hero.upload && grants.destinations.archive);
assert(!grants.general.archive);
state.fine = { "home.view": true };
grants = await getMediaAccess(user);
assert(grants.general.view && !grants.hero.view && !grants.general.upload);
state.fine = { "home.hero_slider.view": true, "home.hero_slider.create": true };
state.areas.content = false;
assert(!(await getMediaAccess(user)).hero.view);
state.areas.content = true;
grants = await getMediaAccess(user);
assert(grants.hero.upload && !grants.hero.edit && !grants.universities.view);
state.session = null;
await assert.rejects(requireMediaAccess(), /Unauthorized/);
state.session = user;
state.profile = false;
await assert.rejects(requireMediaAccess(), /Unauthorized/);
state.profile = true;
state.fine = { "applications.view": true };
await assert.rejects(requireMediaAccess(), /MEDIA_FORBIDDEN/);
state.fine = { "*": true };
grants = await getMediaAccess(user);
const form = (category = "hero", buffer = png) => {
  const data = new FormData();
  data.append("category", category);
  data.append("alt", "Isolated test banner");
  data.append(
    "file",
    new File([buffer], "../../sample.png", { type: "image/png" }),
  );
  return data;
};
const writes = () =>
  state.requests.filter(
    (r) => r.pathname.startsWith("/rest/") && r.method !== "GET",
  ).length;
let before = writes();
await assert.rejects(
  uploadMedia(form("nonsense"), user.id, grants),
  /permission/,
);
assert.equal(writes(), before);
const original = await uploadMedia(form(), user.id, grants);
assert.equal(original.name, "sample.png");
assert.equal(state.objects.size, 1);
assert(original.url.endsWith(".webp"));
const path = state.tables.cms_media_assets[0].object_path;
assert(path.startsWith("cms-library/"));
assert.equal(state.tables.cms_media_assets[0].status, "ready");
await validateManagedMediaSelection(original.url, grants);
const replacement = await uploadMedia(form(), user.id, grants);
assert.notEqual(replacement.url, original.url);
assert(state.objects.has(path));
let catalogue = await loadMediaCatalogue(grants);
assert(
  catalogue.metadataReady && catalogue.storageReady && catalogue.usageVerified,
);
assert(catalogue.assets.some((a) => a.source === "repository"));
assert(catalogue.assets.some((a) => a.url === DEFAULT_HERO_SLIDES[0].src));
await changeMedia(
  replacement.id,
  { operation: "details", category: "universities", alt: "Reusable image" },
  user.id,
  grants,
);
assert.equal(
  state.tables.cms_media_assets.find((r) => r.id === replacement.id).url,
  replacement.url,
);
assert.equal(state.objects.size, 2);
const limited = structuredClone(grants);
limited.universities.edit = false;
await assert.rejects(
  changeMedia(
    original.id,
    { operation: "details", category: "universities", alt: "No escalation" },
    user.id,
    limited,
  ),
  /permission/,
);
await assert.rejects(
  changeMedia(
    "../../other",
    { operation: "archive", confirm: true },
    user.id,
    grants,
  ),
  /library image/,
);
await assert.rejects(
  changeMedia(original.id, { operation: "archive" }, user.id, grants),
  /details/,
);
state.inventoryError = true;
await assert.rejects(
  changeMedia(
    original.id,
    { operation: "archive", confirm: true },
    user.id,
    grants,
  ),
  /usage/,
);
state.inventoryError = false;
state.fine = { "home.*": true };
const blocked = await saveHomepageEditor({
  kind: "builtin",
  index: 0,
  patch: { imageUrl: original.url, imageAlt: "Library test image" },
  inherit: [],
  visible: true,
});
assert(
  !blocked.ok,
  "Missing workflow setup must never fall back to a live write",
);
// Isolated fixture for an existing published image reference (not an application save).
state.tables.cms_content_blocks.push({
  id: randomUUID(),
  page_slug: "home",
  section_key: "hero_slider",
  block_key: "slide",
  block_type: "hero_slide",
  sort_order: 0,
  is_active: true,
  content: {},
  media: { imageUrl: original.url, imageAlt: "Existing published image" },
});
await assert.rejects(
  changeMedia(
    original.id,
    { operation: "archive", confirm: true },
    user.id,
    grants,
  ),
  /in use/,
);
state.tables.cms_content_blocks[0].media.imageUrl = "/brand/favicon.png";
await changeMedia(
  original.id,
  { operation: "archive", confirm: true },
  user.id,
  grants,
);
assert(state.tables.cms_media_assets[0].archived_at);
assert(state.objects.has(path));
await assert.rejects(
  validateManagedMediaSelection(original.url, grants),
  /archived/,
);
await assert.rejects(
  validateManagedMediaSelection(
    original.url.replace("/cms-library/", "/%63ms-library/"),
    grants,
  ),
  /archived/,
);
await changeMedia(original.id, { operation: "restore" }, user.id, grants);
assert.equal(state.tables.cms_media_assets[0].archived_at, null);
state.fine = { "*": true };
const legacy = (await loadMediaCatalogue(grants)).assets.find(
  (a) => a.source === "legacy" && a.category === "hero",
);
await assert.rejects(
  changeMedia(
    legacy.id,
    { operation: "archive", confirm: true },
    user.id,
    grants,
  ),
  /in use/,
);
await changeMedia(
  legacy.id,
  {
    operation: "details",
    category: "hero",
    alt: "Existing banner description",
  },
  user.id,
  grants,
);
assert(
  state.tables.cms_media_assets.some(
    (a) => a.url === legacy.url && a.object_path === null,
  ),
);
console.log(
  "PASS: existing fine/area/auth rules, immutable UUID storage paths, source+destination permission checks, safe catalogue/category updates, live reference protection, archive/restore, legacy compatibility, published-reference protection and fail-closed draft setup",
);
state.missing = true;
catalogue = await loadMediaCatalogue(grants);
assert(!catalogue.metadataReady && catalogue.assets.length);
before = state.objects.size;
await assert.rejects(uploadMedia(form(), user.id, grants), /migration/);
assert.equal(state.objects.size, before);
await validateManagedMediaSelection(DEFAULT_HERO_SLIDES[0].src, grants);
await assert.rejects(
  validateManagedMediaSelection(original.url, grants),
  /catalogue/,
);
state.missing = false;
state.uploadError = true;
await assert.rejects(uploadMedia(form(), user.id, grants), /did not finish/);
assert.equal(state.objects.size, before);
assert.equal(state.tables.cms_media_assets.at(-1).status, "failed");
state.uploadError = false;
state.activationError = true;
await assert.rejects(
  uploadMedia(form(), user.id, grants),
  /confirmation is pending/,
);
assert.equal(state.objects.size, before + 1);
const pending = state.tables.cms_media_assets.at(-1);
assert.equal(pending.status, "uploading");
assert(
  !(await loadMediaCatalogue(grants)).assets.some((a) => a.url === pending.url),
);
state.activationError = false;
const request = (body) =>
  new Request("http://localhost/api/admin/media", {
    method: "POST",
    body,
    headers: { origin: "http://localhost" },
  });
let response = await POST(request(form()));
assert.equal(response.status, 201);
const routeAsset = (await response.json()).asset;
response = await POST(request(form("hero", Buffer.from("not an image"))));
assert.equal(response.status, 400);
response = await POST(
  new Request("http://localhost/api/admin/media", {
    method: "POST",
    headers: { origin: "https://elsewhere.invalid" },
    body: form(),
  }),
);
assert.equal(response.status, 403);
state.session = null;
response = await GET(new Request("http://localhost/api/admin/media"));
assert.equal(response.status, 401);
state.session = user;
state.fine = { "applications.view": true };
response = await GET(new Request("http://localhost/api/admin/media"));
assert.equal(response.status, 403);
state.fine = { "home.hero_slider.view": true };
response = await POST(request(form()));
assert.equal(response.status, 403);
state.fine = { "*": true };
response = await GET(
  new Request("http://localhost/api/admin/media?q=sample&category=hero"),
);
assert.equal(response.status, 200);
const found = await response.json();
assert(found.assets.length);
assert(found.assets.every((a) => a.category === "hero" && !a.archived));
assert(response.headers.get("cache-control").includes("no-store"));
response = await assetGET(new Request("http://localhost"), {
  params: Promise.resolve({ id: routeAsset.id }),
});
assert.equal(response.status, 200);
response = await PATCH(
  new Request("http://localhost/api/admin/media/" + routeAsset.id, {
    method: "PATCH",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      operation: "details",
      category: "hero",
      alt: "Route update",
    }),
  }),
  { params: Promise.resolve({ id: routeAsset.id }) },
);
assert.equal(response.status, 200);
await assert.rejects(
  boundedMediaForm(
    new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-length": String(5 * 1024 * 1024),
        "content-type": "multipart/form-data; boundary=test",
      },
      body: "x",
    }),
  ),
  /4 MB/,
);
await assert.rejects(
  boundedMediaForm(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body: Buffer.alloc(5 * 1024 * 1024),
    }),
  ),
  /4 MB/,
);
const sql = readFileSync(
  new URL(
    "../supabase/migrations/20261028090000_cms_media_catalogue.sql",
    import.meta.url,
  ),
  "utf8",
);
assert(sql.includes("enable row level security"));
assert(sql.includes("grant select, insert, update"));
assert(
  !/\b(drop|truncate|delete from|storage\.buckets|storage\.objects|admin_profiles|auth\.users)\b/i.test(
    sql,
  ),
);
console.log(
  "PASS: pending migration read-only compatibility, partial upload compensation/new path only, uncertain acknowledgement retains files, real route handlers validation/auth/CSRF/search/metadata/size bounds, additive SQL safeguards; no production connection",
);
