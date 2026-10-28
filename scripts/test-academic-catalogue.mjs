import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mediaFixture } from "./fixtures/media-fixture.mjs";
import { readAcademicCatalogue } from "../src/lib/academic/server.ts";
import { academicDraft } from "../src/lib/academic/draft.ts";
import {
  filterAcademic,
  PRIORITY_COUNTRIES,
} from "../src/lib/academic/model.ts";
import {
  publicProgramme,
  publicUniversity,
} from "../src/lib/academic/public.ts";
import { saveAcademicRecord } from "../src/app/admin/cms/academic-actions.ts";
import {
  saveCountry,
  deleteCountry,
} from "../src/app/admin/cms/countries-actions.ts";
import {
  saveProgram,
  deleteProgram,
} from "../src/app/admin/cms/programs-actions.ts";
import {
  saveFeaturedUniversity,
  deleteFeaturedUniversity,
} from "../src/app/admin/cms/featured-universities-actions.ts";
import {
  destinationCards,
  resolveCollection,
} from "../src/lib/homepage/items.ts";
import { getCountryDetails } from "../src/lib/data/countries.ts";
import { getFeaturedUniversities } from "../src/lib/data/featured-universities.ts";
import { getOpenings } from "../src/lib/data/openings.ts";
import { programRowToOpening } from "../src/lib/cms/maps.ts";
import { loadMediaCatalogue } from "../src/lib/media/catalogue.ts";
import { getMediaAccess } from "../src/lib/media/access.ts";
const { state, user } = mediaFixture(),
  tables = state.tables;
const timestamp = "2026-10-27T00:00:00.000Z";
const country = {
  id: randomUUID(),
  name: "Italy",
  slug: "italy",
  region_group_id: 1,
  why_study_there: "Existing guidance",
  living_cost_approx: "Existing costs",
  visa_info: "Existing visa guidance",
  popular_universities: ["Existing university"],
  updated_at: timestamp,
  is_published: true,
  archived_at: null,
  catalogue: { credit: "Preserved credit" },
  destination_guide: {
    overview: {
      educationSystem: "Existing education information",
      legacy: "Retain unknown value",
    },
  },
};
const university = {
  id: randomUUID(),
  name: "Existing university",
  country: "Italy",
  country_id: null,
  profile: { legacy: "Preserved profile" },
  hero_image_url:
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
  logo_url: null,
  programs: [{ name: "Existing summary", tuition_range: "Existing fees" }],
  is_published: true,
  updated_at: timestamp,
};
const programme = {
  id: "existing-stable-programme",
  title: "Existing programme",
  university: university.name,
  country: "Italy",
  degree: "master",
  intake: "Existing intake",
  deadline: "2027-06-01",
  tuition_range: "Existing fees",
  university_id: null,
  details: { legacy: "Preserved detail" },
  updated_at: timestamp,
  is_published: true,
};
tables.region_groups.push({ id: 1, label: "Southern Europe" });
tables.countries.push(country);
tables.featured_universities.push(university);
tables.programs.push(programme);
const save = (
  kind,
  row,
  values = academicDraft(kind, row),
  operation = "save",
  expectedUpdatedAt = row?.updated_at ?? null,
) =>
  saveAcademicRecord({
    kind,
    id: row?.id,
    expectedUpdatedAt,
    operation,
    values,
  });
const writes = () =>
  state.requests.filter(
    (r) =>
      ["POST", "PATCH", "DELETE"].includes(r.method) &&
      r.pathname.startsWith("/rest/"),
  ).length;
let before = writes();
const catalogue = await readAcademicCatalogue();
assert(catalogue.ready);
assert.equal(catalogue.countries.length, 1);
assert.equal(writes(), before, "Loading and priority coverage never writes");
assert.equal(PRIORITY_COUNTRIES.length, 12);
const oldProgramme = structuredClone(programme),
  oldUniversity = structuredClone(university);
let draft = academicDraft("countries", country);
assert.equal(draft.why_study, "Existing guidance");
assert.equal(draft.living_cost, "Existing costs");
draft.description = "Approved destination introduction";
draft.catalogue = {
  ...draft.catalogue,
  image_url: university.hero_image_url,
  image_alt: "Approved destination image",
  eligibility: "Approved eligibility",
  seo_title: "Approved search title",
};
let result = await save("countries", country, draft);
assert(result.ok, JSON.stringify(result));
assert.equal(country.catalogue.credit, "Preserved credit");
assert.equal(country.destination_guide.overview.legacy, "Retain unknown value");
assert.equal(country.slug, "italy");
assert.deepEqual(programme, oldProgramme);
assert.deepEqual(university, oldUniversity);
assert(
  !(await save("countries", country, { ...draft, slug: "new-address" })).ok,
);
assert(
  !(await save("countries", country, draft, "save", timestamp)).ok,
  "Stale edits rejected",
);
let publicCountries = await getCountryDetails();
assert.equal(publicCountries[0].imageUrl, university.hero_image_url);
assert.equal(publicCountries[0].catalogue.seo_title, "Approved search title");
assert(
  !(await save("countries", country, { ...draft, name: "Renamed country" })).ok,
  "Legacy relationships protected",
);
draft = academicDraft("universities", university);
draft.country_id = country.id;
draft.profile = {
  ...draft.profile,
  location: "Existing city",
  official_url: "https://university.example.invalid",
  description: "Approved institutional description",
};
result = await save("universities", university, draft);
assert(result.ok, JSON.stringify(result));
assert.equal(university.country_id, country.id);
assert.equal(university.profile.legacy, "Preserved profile");
assert.equal(programme.university_id, null);
assert(
  !(
    await save("universities", university, {
      ...draft,
      country_id: randomUUID(),
    })
  ).ok,
);
assert(
  !(
    await save("universities", university, {
      ...draft,
      name: "Different university",
    })
  ).ok,
  "Legacy child names protected",
);
draft = academicDraft("programmes", programme);
draft.university_id = university.id;
draft.details = {
  ...draft.details,
  teaching_language: "English",
  discipline: "Approved discipline",
  official_url: "https://university.example.invalid/programme",
  application_url: "https://university.example.invalid/apply",
  verification: "verified",
  verified_on: "2026-01-01",
  opens_on: "2027-01-01",
  tuition_amount: 2500,
  currency: "EUR",
  non_eu_guidance: "Official guidance for non-EU applicants",
};
result = await save("programmes", programme, draft);
assert(result.ok, JSON.stringify(result));
assert.equal(programme.university_id, university.id);
assert.equal(programme.details.legacy, "Preserved detail");
assert.equal(programme.id, oldProgramme.id);
assert.equal(programme.country, country.name);
assert.equal(
  (await getOpenings())[0].details.discipline,
  "Approved discipline",
);
assert.equal(
  (await getFeaturedUniversities())[0].profile.location,
  "Existing city",
);
for (const bad of [
  { ...draft, deadline: "2027-02-30" },
  {
    ...draft,
    details: { ...draft.details, official_url: "javascript:alert(1)" },
  },
  { ...draft, details: { ...draft.details, opens_on: "2028-01-01" } },
  { ...draft, details: { ...draft.details, verified_on: "2999-01-01" } },
  { ...draft, details: { ...draft.details, official_url: "" } },
  { ...draft, title: "<script>bad</script>" },
  { ...draft, university_id: randomUUID() },
]) {
  before = writes();
  assert(!(await save("programmes", programme, bad)).ok);
  assert.equal(writes(), before);
}
const fresh = academicDraft("programmes");
fresh.title = "Isolated unpublished programme";
fresh.university_id = university.id;
fresh.deadline = "";
fresh.intake = "";
fresh.tuition_range = "";
result = await save("programmes", null, fresh);
assert(result.ok, JSON.stringify(result));
const created = tables.programs.find((r) => r.id === result.row.id);
assert.equal(created.deadline, null);
assert.equal(created.is_published, false);
assert.equal(created.details.teaching_language, "");
assert.equal(
  programRowToOpening(created).languageOfInstruction,
  "Not confirmed",
);
assert.equal(programRowToOpening(created).deadline, "");
assert.equal(tables.program_openings.length, 0, "No duplicate legacy records");
for (const [fine, kind, row, values] of [
  [
    { "countries.view": true },
    "countries",
    country,
    academicDraft("countries", country),
  ],
  [
    { "universities.view": true, "universities.edit": true },
    "programmes",
    programme,
    { ...draft, is_published: false },
  ],
  [
    { "universities.view": true, "universities.edit": true },
    "programmes",
    null,
    fresh,
  ],
  [
    { "universities.view": true, "universities.create": true },
    "programmes",
    programme,
    draft,
  ],
]) {
  state.fine = fine;
  before = writes();
  assert(!(await save(kind, row, values)).ok);
  assert.equal(writes(), before, "Fine permission denial performs no writes");
}
state.fine = { "*": true };
const originalToken = university.updated_at;
let childrenBefore = JSON.stringify(tables.programs);
result = await save("universities", university, {}, "archive");
assert(result.ok, JSON.stringify(result));
assert(university.archived_at);
assert.equal(university.is_published, false);
assert.equal(JSON.stringify(tables.programs), childrenBefore);
assert(
  !publicProgramme(programme, tables.countries, tables.featured_universities),
);
assert.equal(
  (await getOpenings()).length,
  0,
  "Hidden parent suppresses programmes",
);
assert.equal((await getFeaturedUniversities()).length, 0);
assert(
  !(
    await save(
      "universities",
      university,
      academicDraft("universities", university),
      "restore",
      originalToken,
    )
  ).ok,
);
result = await save("universities", university, {}, "restore");
assert(result.ok);
assert.equal(
  university.is_published,
  false,
  "Restore does not implicitly republish",
);
draft = academicDraft("universities", university);
draft.is_published = true;
assert((await save("universities", university, draft)).ok);
childrenBefore = JSON.stringify({
  u: tables.featured_universities,
  p: tables.programs,
});
result = await save("countries", country, {}, "archive");
assert(result.ok);
assert.equal(
  childrenBefore,
  JSON.stringify({ u: tables.featured_universities, p: tables.programs }),
);
assert(!publicUniversity(university, tables.countries));
assert.equal(
  destinationCards(
    resolveCollection([], "destinations").items,
    await getCountryDetails(),
  ).length,
  0,
  "Hidden destinations must not reappear as legacy homepage cards",
);
assert.equal(
  (await getCountryDetails()).length,
  0,
  "Intentional empty country list never restores static defaults",
);
assert.equal((await getFeaturedUniversities()).length, 0);
assert.equal((await getOpenings()).length, 0);
assert(
  !(
    await save("programmes", programme, {
      ...academicDraft("programmes", programme),
      title: "Should fail",
    })
  ).ok,
  "Cannot publish under hidden destination",
);
assert((await save("countries", country, {}, "restore")).ok);
draft = academicDraft("countries", country);
draft.is_published = true;
assert((await save("countries", country, draft)).ok);
const assets = await loadMediaCatalogue(await getMediaAccess(user));
assert(
  assets.assets
    .find((a) => a.url === university.hero_image_url)
    .usage.some((u) => u.startsWith("Destinations")),
  "Destination images included in usage protection",
);
const imagePath =
  "https://media-tests.invalid/storage/v1/object/public/featured-university-media/cms-library/" +
  randomUUID() +
  ".webp";
tables.cms_media_assets.push({
  id: randomUUID(),
  url: imagePath,
  category: "universities",
  status: "ready",
  archived_at: timestamp,
});
assert(
  !(
    await save("universities", university, {
      ...academicDraft("universities", university),
      hero_image_url: imagePath,
    })
  ).ok,
  "Archived media cannot replace existing image",
);
for (const legacy of [
  () => saveCountry({}),
  () => saveProgram({}),
  () => saveFeaturedUniversity({}),
  () => deleteCountry(country.id),
  () => deleteProgram(programme.id),
  () => deleteFeaturedUniversity(university.id),
]) {
  before = writes();
  assert(!(await legacy()).ok);
  assert.equal(
    writes(),
    before,
    "Legacy actions cannot bypass safe catalogue controls",
  );
}
state.fine = { "universities.view": true };
before = writes();
assert(!(await save("universities", university, {}, "archive")).ok);
assert.equal(writes(), before);
state.fine = { "*": true };
state.areas.academic = false;
assert(
  !(await save("programmes", programme, academicDraft("programmes", programme)))
    .ok,
);
state.areas.academic = true;
state.session = null;
assert(
  !(await save("countries", country, academicDraft("countries", country))).ok,
);
state.session = user;
assert.equal(
  filterAcademic(
    tables.programs,
    "programmes",
    "existing university",
    "Italy",
    "Published",
    "master",
  ).length,
  1,
);
assert.equal(
  filterAcademic(tables.programs, "programmes", "nothing-matches", "", "", "")
    .length,
  0,
);

const legacyAddress = academicDraft("countries", {
  ...country,
  slug: null,
  name: "United Kingdom",
});
assert.equal(legacyAddress.slug, "united-kingdom");
const newCountry = academicDraft("countries");
Object.assign(newCountry, {
  name: "Isolated destination",
  slug: "isolated-destination",
  region_group_id: 1,
});
result = await save("countries", null, newCountry);
assert(result.ok, JSON.stringify(result));
const newCountryRow = tables.countries.find((r) => r.id === result.row.id);
assert.equal(newCountryRow.is_published, false);
const newUniversity = academicDraft("universities");
Object.assign(newUniversity, {
  name: "Isolated institution",
  country_id: newCountryRow.id,
});
result = await save("universities", null, newUniversity);
assert(result.ok, JSON.stringify(result));
const newUniversityRow = tables.featured_universities.find(
  (r) => r.id === result.row.id,
);
assert.equal(newUniversityRow.country, newCountryRow.name);
assert.equal(newUniversityRow.is_published, false);
assert(
  !(
    await save("universities", newUniversityRow, {
      ...academicDraft("universities", newUniversityRow),
      is_published: true,
    })
  ).ok,
  "Cannot publish under hidden destination",
);
const archivedProgramme = JSON.stringify({
  ...created,
  updated_at: undefined,
  archived_at: undefined,
  is_published: undefined,
});
result = await save("programmes", created, {}, "archive");
assert(result.ok, JSON.stringify(result));
assert.equal(
  JSON.stringify({
    ...created,
    updated_at: undefined,
    archived_at: undefined,
    is_published: undefined,
  }),
  archivedProgramme,
  "Programme archive retains all existing details",
);
assert((await save("programmes", created, {}, "restore")).ok);
assert.equal(created.is_published, false);
state.tableFailure = "programs";
assert(!(await readAcademicCatalogue()).ready);
before = writes();
assert(
  !(await save("programmes", programme, academicDraft("programmes", programme)))
    .ok,
);
assert.equal(writes(), before);
state.tableFailure = "";
assert(
  state.requests.every(
    (r) => !/(applications|agreement|auth\/v1)/.test(r.pathname),
  ),
);
assert(state.requests.every((r) => r.method !== "DELETE"));
console.log(
  "PASS: existing-country effective copy, 12-country coverage without writes, institutions and programme relationships, metadata preservation, source verification, unknown dates/fees/language, field validation, stale writes, create/edit/publish/archive permissions, server area/anonymous denial, legacy bypass protection, media usage/archived-image protection, search/filter, public hidden-parent/empty-state compatibility. All writes used isolated synthetic transport; no production requests.",
);
