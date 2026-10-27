import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { DEFAULT_HERO_SLIDES, HERO_DEFAULTS, SECTION_DEFAULTS, EUROPE_PARTIAL_DEFAULTS, contentLabel, firstHeroEditorTarget, resolveGlobalHero, resolveSection, resolveSlideCopy, publicHeroSlides, valuesOf } from "../src/lib/homepage/content.ts";
import { safeDestination, safeImage } from "../src/lib/homepage/validation.ts";
import { saveHomepageEditor } from "../src/app/admin/cms/homepage-editor-actions.ts";
import { saveSiteContent } from "../src/app/admin/actions.ts";
import { upsertCmsBlock } from "../src/app/admin/cms/cms-block-actions.ts";
import { saveHomeHeroSlide } from "../src/app/admin/cms/home-page-blocks-actions.ts";
import { getSiteContent, siteContentToHeroCopy } from "../src/lib/data/site-content.ts";

const state = { site_content: [], cms_content_blocks: [] };
const session = { id: randomUUID(), email: "homepage-editor@example.invalid" };
let fine = { "home.*": true }, unavailable = false, writes = 0, clock = 0;
process.env.ADMIN_EMAILS = ""; process.env.SUPER_ADMIN_EMAIL = "";
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
function matches(row, params) {
  return [...params].filter(([key]) => !["select", "order", "limit", "on_conflict"].includes(key)).every(([key, filter]) => {
    if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
    if (filter.startsWith("like.")) return String(row[key]).startsWith(filter.slice(5).replace(/%$/, ""));
    return true;
  });
}
const client = createClient("https://homepage-tests.invalid", "isolated-test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, options = {}) => {
  const url = new URL(input), method = options.method || "GET", table = url.pathname.split("/").at(-1);
  if (table === "admin_profiles") { assert.equal(method, "GET"); return response([{ user_id: session.id, is_super_admin: false, permissions: { content: true }, permissions_v2: fine }]); }
  assert(["site_content", "cms_content_blocks"].includes(table), "Homepage persistence must not touch other tables");
  if (unavailable) return response({ message: "Synthetic unavailability" }, 503);
  if (method === "GET") return response(structuredClone(state[table].filter(row => matches(row, url.searchParams))));
  assert(["POST", "PATCH"].includes(method), "No deletes, auth changes, storage writes or migrations");
  let data;
  if (method === "POST") {
    const body = JSON.parse(options.body), rows = Array.isArray(body) ? body : [body];
    for (const row of rows) {
      if (table === "site_content") assert(row.key.startsWith("home."));
      else {
        assert.equal(row.page_slug, "home");
        if (state[table].some(existing => existing.page_slug === row.page_slug && existing.section_key === row.section_key && existing.block_key === row.block_key && existing.sort_order === row.sort_order)) return response({ message: "Synthetic unique constraint", code: "23505" }, 409);
      }
    }
    data = rows.map(row => {
      if (table === "site_content") { const existing = state[table].find(old => old.key === row.key); if (existing) { Object.assign(existing, row); return existing; } }
      const next = { id: randomUUID(), ...row, updated_at: `2026-10-27T10:00:${String(clock++).padStart(2, "0")}Z` }; state[table].push(next); return next;
    });
  } else {
    const body = JSON.parse(options.body); data = state[table].filter(row => matches(row, url.searchParams));
    for (const row of data) { assert.equal(row.page_slug, "home"); Object.assign(row, body, { updated_at: `2026-10-27T11:00:${String(clock++).padStart(2, "0")}Z` }); }
  }
  writes++; return response(structuredClone(data));
} } });
globalThis.__homepageTest = { client, session, revalidated: [] };
function block(section, content, active = true) { return { id: randomUUID(), page_slug: "home", section_key: section, block_key: "copy", block_type: "section_copy", content, media: { retained: true }, is_active: active, sort_order: 0, updated_at: "2026-10-25T00:00:00Z" }; }

const firstSlide = { ...block("hero_slider", {}), block_key: "slide", media: { imageUrl: DEFAULT_HERO_SLIDES[0].src }, sort_order: 1 };
const laterSlide = { ...firstSlide, id: randomUUID(), sort_order: 4 };
const hiddenSlide = { ...firstSlide, id: randomUUID(), is_active: false, sort_order: 0 };
assert.equal(firstHeroEditorTarget([laterSlide, firstSlide], true), firstSlide.id);
assert.equal(firstHeroEditorTarget([hiddenSlide, laterSlide, firstSlide], true), firstSlide.id);
assert.equal(firstHeroEditorTarget([hiddenSlide], true), hiddenSlide.id);
assert.equal(firstHeroEditorTarget([], true), "builtin:0");
assert.equal(firstHeroEditorTarget([firstSlide], false), "global");
assert.equal(firstHeroEditorTarget([block("destinations", {})], true), "builtin:0");
console.log("PASS: first available hero slide selected automatically in display order, with built-in fallback and existing view restrictions");

assert.deepEqual(valuesOf(resolveGlobalHero({})), HERO_DEFAULTS);
assert.equal(resolveGlobalHero({ "home.hero.title": "Saved headline" }).title.source, "saved");
assert.equal(resolveGlobalHero({ "home.hero.title": "  " }).title.value, HERO_DEFAULTS.title);
for (const section of Object.keys(SECTION_DEFAULTS)) assert.deepEqual(valuesOf(resolveSection([], section)), SECTION_DEFAULTS[section]);
const localized = block("destinations", { title: { en: "Saved destination heading", fr: "Titre français" }, extra: { retained: true } });
assert.equal(resolveSection([localized], "destinations").title.value, "Saved destination heading");
assert.equal(resolveSection([localized], "destinations").subtitle.source, "default");
assert.deepEqual(publicHeroSlides([]), DEFAULT_HERO_SLIDES);
assert.deepEqual(publicHeroSlides([{ ...localized, section_key: "hero_slider", block_key: "slide", is_active: false }]), DEFAULT_HERO_SLIDES);
assert.equal(resolveSlideCopy({ "home.hero.title": "Shared saved title" }).title.value, "Shared saved title");
assert.equal(resolveSlideCopy({}).title.source, "inherited");
assert.equal(resolveSection([block("why_europe", { title: "Custom Europe" })], "why_europe").subtitle.value, EUROPE_PARTIAL_DEFAULTS.subtitle);
assert.equal(resolveSection([block("why_europe", { title: "Hidden" }, false)], "why_europe").title.value, SECTION_DEFAULTS.why_europe.title);
assert.deepEqual(valuesOf(resolveSection([block("why_europe", { quickFact1Label: "Previously unused label" })], "why_europe")), SECTION_DEFAULTS.why_europe);
assert.equal(contentLabel("home.ticker.enabled", "home.ticker.enabled"), "News ticker visibility");
assert.equal(contentLabel("home.hero.cta_apply", "home.hero.cta_apply"), "Hero secondary button text");
console.log("PASS: shared saved/default/inherited values, English locale fallback, inactive records, exact legacy Europe defaults, built-in carousel and human-readable labels");

for (const value of ["/apply", "/destinations?country=Italy", "#eligibility", "https://www.unimondo.uk/apply"]) assert(safeDestination(value));
for (const value of ["", "javascript:alert(1)", "//evil.invalid", "http://evil.invalid", "data:text/html,x", "/\\evil", "/%5cevil", "https://user:password@example.invalid", " /apply", "https://example.invalid\n"]) assert(!safeDestination(value));
assert(safeImage(DEFAULT_HERO_SLIDES[0].src)); assert(!safeImage("https://unknown.invalid/picture.jpg"));
let before = writes;
for (const patch of [{ title: "" }, { title: "   " }, { primaryHref: "javascript:alert(1)" }, { bogus: "value" }]) assert.equal((await saveHomepageEditor({ kind: "global", patch, expected: {} })).ok, false);
assert.equal(writes, before);
let saved = await saveHomepageEditor({ kind: "global", patch: { title: "An explicitly saved headline", primaryHref: "/programs" }, expected: { title: null, primaryHref: null } });
assert(saved.ok); assert.equal(state.site_content.length, 2); assert.equal(state.site_content[0].label, "Hero main headline");
assert.equal(siteContentToHeroCopy(await getSiteContent()).title, "An explicitly saved headline");
assert.equal(siteContentToHeroCopy(await getSiteContent()).primaryHref, "/programs");
before = writes;
assert.equal((await saveHomepageEditor({ kind: "global", patch: { title: "Stale edit" }, expected: { title: null } })).ok, false); assert.equal(writes, before);
await assert.rejects(saveSiteContent([{ key: "agreement:protected", value: "unsafe" }])); assert.equal(writes, before);
console.log("PASS: valid global persistence through the existing batch save, explicit defaults, refreshed public values, blank/link/key rejection and stale edit protection");

saved = await saveHomepageEditor({ kind: "copy", section: "why_europe", patch: { title: "Our European journey" }, expectedUpdatedAt: null });assert(saved.ok);
const europe = state.cms_content_blocks.find(row => row.section_key === "why_europe");
assert.equal(europe.content.subtitle, SECTION_DEFAULTS.why_europe.subtitle, "First explicit save must retain every currently displayed legacy default");
state.cms_content_blocks.push(localized);
saved = await saveHomepageEditor({ kind: "copy", section: "destinations", patch: { title: "Updated English heading" }, expectedUpdatedAt: localized.updated_at });assert(saved.ok);
assert.equal(localized.content.title.en, "Updated English heading"); assert.equal(localized.content.title.fr, "Titre français"); assert(localized.content.extra.retained && localized.media.retained);
const count = state.cms_content_blocks.length;
saved = await saveHomepageEditor({ kind: "copy", section: "destinations", patch: { subtitle: "Updated destination description" }, expectedUpdatedAt: localized.updated_at });assert(saved.ok);assert.equal(state.cms_content_blocks.length, count);
assert.equal(resolveSection(state.cms_content_blocks, "destinations").subtitle.value, "Updated destination description");
const legacyEmpty = block("how_it_works", { kicker: "", title: "", subtitle: "" });state.cms_content_blocks.push(legacyEmpty);
saved = await saveHomepageEditor({ kind: "copy", section: "how_it_works", patch: { title: "A clearer process" }, expectedUpdatedAt: legacyEmpty.updated_at });assert(saved.ok);
assert.equal(resolveSection(state.cms_content_blocks, "how_it_works").subtitle.value, SECTION_DEFAULTS.how_it_works.subtitle);
assert.equal(legacyEmpty.content.subtitle, "", "Untouched legacy fallback fields are preserved");
console.log("PASS: existing section save workflow, no duplicate copy records, current defaults retained, unknown fields/media/translations preserved");

fine = { "home.view": true }; before = writes;
assert.equal((await saveHomepageEditor({ kind: "global", patch: { title: "Denied" }, expected: { title: "An explicitly saved headline" } })).ok, false);
assert.equal((await upsertCmsBlock({ page_slug: "home", section_key: "destinations", block_key: "copy", block_type: "section_copy", content: { title: "Injected permission" }, permission_key: "home.view" })).ok, false);
assert.equal(writes, before, "Client-supplied permission keys cannot grant homepage editing");
fine = { "home.edit": true, "home.cta.edit": false }; before = writes;
assert.equal((await saveHomepageEditor({ kind: "copy", section: "journey_cta", patch: { title: "Denied" }, expectedUpdatedAt: null })).ok, false); assert.equal(writes, before);
fine = { "home.hero_slider.edit": true, "home.hero_slider.create": false };
assert.equal((await saveHomepageEditor({ kind: "builtin", index: 0, patch: { imageAlt: "Updated description" }, inherit: [], visible: true })).ok, false);assert.equal(writes, before);
fine = { "home.*": true };
globalThis.__homepageTest.session = null;
assert.equal((await saveHomepageEditor({ kind: "global", patch: { title: "Denied" }, expected: {} })).ok, false);assert.equal(writes, before);
globalThis.__homepageTest.session = session;
console.log("PASS: missing session, view-only staff, per-section permissions, first-slide creation permission and manipulated legacy permission inputs are denied server-side");

saved = await saveHomepageEditor({ kind: "builtin", index: 0, patch: { imageAlt: "Accessible Italian scene" }, inherit: [], visible: true });assert(saved.ok);
let slides = state.cms_content_blocks.filter(row => row.section_key === "hero_slider");assert.equal(slides.length, 5);
assert.deepEqual(slides.map(row => row.media.imageUrl), DEFAULT_HERO_SLIDES.map(slide => slide.src));
assert.equal(slides[1].content.line, DEFAULT_HERO_SLIDES[1].line);
before = writes;assert.equal((await saveHomepageEditor({ kind: "builtin", index: 0, patch: { imageAlt: "Duplicate attempt" }, inherit: [], visible: true })).ok, false);assert.equal(writes, before);
const slide = slides[0];slide.content.title = { en: "Custom slide title", fr: "Titre conservé" };slide.content.extra = "keep";slide.media.captionCredit = "keep";
saved = await saveHomepageEditor({ kind: "slide", id: slide.id, patch: { line: "Updated caption" }, inherit: ["title"], visible: false, order: 10, expectedUpdatedAt: slide.updated_at });assert(saved.ok);
assert.equal(slide.content.title.en, "");assert.equal(slide.content.title.fr, "Titre conservé");assert.equal(slide.content.extra, "keep");assert.equal(slide.media.captionCredit, "keep");assert.equal(slide.is_active, false);assert.equal(slide.sort_order, 10);
assert.equal(resolveSlideCopy(Object.fromEntries(state.site_content.map(row => [row.key,row.value])), slide).title.value, "An explicitly saved headline");
assert.equal(publicHeroSlides(state.cms_content_blocks).length, 4);
assert.equal(state.cms_content_blocks.filter(row => row.section_key === "hero_slider").length, 5);
before = writes;
assert.equal((await saveHomeHeroSlide({ id: europe.id, imageUrl: DEFAULT_HERO_SLIDES[0].src, imageAlt: "Forged target" })).ok, false);assert.equal(writes, before);
assert.equal((await saveHomepageEditor({ kind: "slide", id: slide.id, patch: { imageUrl: "https://unapproved.invalid/image.jpg" }, inherit: [], visible: true, order: 10, expectedUpdatedAt: slide.updated_at })).ok, false);assert.equal(writes, before);
unavailable = true;assert.equal((await saveHomepageEditor({ kind: "global", patch: { title: "Unavailable" }, expected: {} })).ok, false);assert.equal(writes, before);
assert(globalThis.__homepageTest.revalidated.includes("/"));
console.log("PASS: atomic five-slide first save, no repeated materialization, existing slide updates/visibility/order, inheritance removal, translations/media retention, scoped IDs, safe images and unavailable service protection");
console.log("All homepage editor checks passed using synthetic, isolated in-memory records only.");
