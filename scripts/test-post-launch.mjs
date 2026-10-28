import JSZip from "jszip";
import { buildApplicationZipBuffer } from "../src/lib/apply/application-export.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  getPublishedPackages,
  getPublishedAddOns,
} from "../src/lib/data/study-pricing.ts";
import { publicCourseCatalogue } from "../src/lib/data/language-courses.ts";
import { saveAcademicRecord } from "../src/app/admin/cms/academic-actions.ts";
import { academicDraft } from "../src/lib/academic/draft.ts";
import { validateProgrammeCurrency } from "../src/lib/currencies/programme.ts";
import { sourceCourseRows } from "../src/lib/catalogue/model.ts";
import { formatMoney } from "../src/lib/currencies/model.ts";
import { publishingFixture } from "./fixtures/publishing-fixture.mjs";
import {
  savePriceDraft,
  readPriceCatalogue,
} from "../src/app/admin/cms/catalogue-actions.ts";
import {
  readRegions,
  saveRegionsDraft,
} from "../src/app/admin/cms/regions-actions.ts";
import {
  readContentWorkflow,
  transitionContent,
} from "../src/app/admin/cms/publishing-actions.ts";
import { saveCurrency } from "../src/app/admin/cms/currencies-actions.ts";
import { validateSlidePatch } from "../src/lib/homepage/validation.ts";
import { heroTextStyle } from "../src/lib/homepage/hero-presentation.ts";
import { saveHomepageEditor } from "../src/app/admin/cms/homepage-editor-actions.ts";
import { heroSlideFromBlock } from "../src/lib/homepage/content.ts";
import {
  staffIdentity,
  staffDisplayName,
} from "../src/lib/auth/staff-identity.ts";
import {
  GET as COURSE_GET,
  POST as COURSE_POST,
  DELETE as COURSE_DELETE,
} from "../src/app/api/admin/courses/route.ts";
const f = await publishingFixture({ footer: true, postLaunch: true }),
  { state, db } = f;
globalThis.__mediaTest = state;
try {
  assert.equal(
    (await db.query("select enabled from cms_publishing_settings")).rows[0]
      .enabled,
    false,
  );
  assert.equal(
    (await db.query("select count(*)::int n from cms_currencies")).rows[0].n,
    8,
  );
  const installation = await db.query(
    readFileSync(
      new URL("../docs/post-launch/verify-installation.sql", import.meta.url),
      "utf8",
    ),
  );
  assert(installation.rows.length > 15);
  assert(
    installation.rows.every((r) => r.passed),
    JSON.stringify(installation.rows.filter((r) => !r.passed)),
  );
  await assert.rejects(
    validateProgrammeCurrency(
      { currency: "PKR", tuition_amount: 100 },
      { currency: "EUR", tuition_amount: 100 },
      false,
    ),
    /Confirm/,
  );
  await validateProgrammeCurrency(
    { currency: "PKR", tuition_amount: 100 },
    { currency: "EUR", tuition_amount: 100 },
    true,
  );
  await validateProgrammeCurrency(
    { currency: "CAD", tuition_amount: 100 },
    { currency: "CAD", tuition_amount: 100 },
    false,
  );
  await assert.rejects(
    validateProgrammeCurrency(
      { currency: "EUR", tuition_amount: 12.345 },
      undefined,
      true,
    ),
    /decimal/,
  );
  const country = randomUUID(),
    university = randomUUID(),
    course = randomUUID(),
    pkg = randomUUID(),
    programme = randomUUID();
  state.tables.region_groups.push({
    id: 1,
    label: "Existing Europe",
    continent: "Europe",
    sort_order: 0,
    is_published: true,
    archived_at: null,
  });
  state.tables.countries.push({
    id: country,
    name: "QA country",
    slug: "qa-country",
    region_group_id: 1,
    sort_order: 0,
    is_published: true,
    catalogue: {},
    destination_guide: {},
    updated_at: "2026-10-28T00:00:00Z",
  });
  state.tables.featured_universities.push({
    id: university,
    name: "QA university",
    country: "QA country",
    country_id: country,
    updated_at: "2026-10-28T00:00:00Z",
  });
  state.tables.programs.push({
    id: programme,
    title: "Existing academic programme",
    intake: "Unconfirmed QA",
    tuition_range: "Unconfirmed",
    degree: "master",
    country: "QA country",
    university: "QA university",
    university_id: university,
    is_published: false,
    sort_order: 0,
    updated_at: "2026-10-28T00:00:00Z",
    details: { currency: "EUR", tuition_amount: 100 },
  });
  state.tables.language_courses.push({
    id: course,
    title: { en: "Real existing QA course", fr: "Existing translation" },
    description: { en: "Existing course description" },
    price: 100,
    is_active: true,
    currency_code: null,
    source_key: null,
    sort_order: 0,
    archived_at: null,
  });
  state.tables.packages.push({
    id: pkg,
    name: "Existing package",
    slug: "existing-package",
    teaser: "Existing",
    description: "Existing",
    best_for: "Existing",
    features: [],
    price_full: 200,
    price_installment: null,
    sort_order: 0,
    is_published: true,
    currency_code: null,
    archived_at: null,
  });
  await state.sync();
  state.super = true;
  const initial = await readPriceCatalogue("courses");
  assert.equal(initial.rows.length, 1);
  assert.equal(initial.defaults.length, 3);
  const input = {
    kind: "courses",
    id: course,
    version: 0,
    values: { title: "Edited QA course", currency_code: "EUR" },
    currencyChangeConfirmed: false,
  };
  let result = await savePriceDraft(input);
  assert.equal(result.ok, false);
  assert.match(result.error, /Confirm/);
  result = await savePriceDraft({ ...input, currencyChangeConfirmed: true });
  assert(result.ok, result.error);
  assert.equal(
    state.tables.language_courses[0].title.en,
    "Real existing QA course",
    "Saving must stay private",
  );
  let view = await readContentWorkflow({ type: "courses", key: course });
  assert.equal(view.document.status, "draft");
  assert.equal(
    view.document.proposed.tables.language_courses[0].title.fr,
    "Existing translation",
  );
  const version = view.document.version;
  result = await savePriceDraft({
    ...input,
    version: version - 1,
    currencyChangeConfirmed: true,
  });
  assert.equal(result.ok, false);
  state.super = false;
  state.fine = { "courses.view": true };
  result = await savePriceDraft({
    ...input,
    version,
    currencyChangeConfirmed: true,
  });
  assert.equal(result.ok, false);
  assert.equal((await COURSE_GET()).status, 200);
  state.session = null;
  assert.equal((await COURSE_GET()).status, 401);
  assert.equal(
    (
      await COURSE_POST(
        new Request("https://isolated.invalid", { method: "POST", body: "{}" }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await COURSE_DELETE(
        new Request("https://isolated.invalid?id=" + course + "&version=1", {
          method: "DELETE",
        }),
      )
    ).status,
    401,
  );
  state.session = f.user;
  state.super = true;
  state.fine = { "*": true };
  async function transition(resource, action, note = "") {
    const v = await readContentWorkflow(resource);
    const out = await transitionContent({
      resource,
      action,
      version: v.document.version,
      note,
      approvedRevisionId: v.document.approved_revision_id,
    });
    assert(out.ok, out.error);
    return out.view;
  }
  await transition({ type: "courses", key: course }, "submit");
  const editorSession = state.session;
  state.super = false;
  state.session = { ...f.user, id: randomUUID() };
  state.fine = { "courses.view": true, "publishing.review": true };
  await transition({ type: "courses", key: course }, "approve");
  state.super = true;
  state.session = editorSession;
  state.fine = { "*": true };
  view = await readContentWorkflow({ type: "courses", key: course });
  result = await transitionContent({
    resource: { type: "courses", key: course },
    action: "publish",
    version: view.document.version,
    approvedRevisionId: view.document.approved_revision_id,
  });
  assert(!result.ok);
  assert.match(result.error, /activation/);
  // Activation is isolated, in-memory QA only. Never a production call.
  await state.activate();
  state.super = false;
  state.session = { ...f.user, id: randomUUID() };
  state.fine = {
    "courses.view": true,
    "courses.publish": true,
    "publishing.publish": true,
  };
  await transition({ type: "courses", key: course }, "publish");
  state.super = true;
  state.session = editorSession;
  state.fine = { "*": true };
  assert.equal(state.tables.language_courses[0].title.en, "Edited QA course");
  assert.equal(state.tables.language_courses[0].price, 100);
  assert.equal(state.tables.language_courses[0].currency_code, "EUR");
  // Real source-card defaults are saved privately, including a recoverable effective baseline.
  const source = sourceCourseRows()[0],
    { sourceDefault, ...sourceValues } = source;
  delete sourceValues.id;
  delete sourceValues.archived_at;
  result = await savePriceDraft({
    kind: "courses",
    id: source.id,
    version: 0,
    values: sourceValues,
  });
  assert(result.ok, result.error);
  let sourceView = await readContentWorkflow({
    type: "courses",
    key: source.id,
  });
  assert.equal(
    sourceView.baseline.tables.language_courses[0].title.en,
    source.title.en,
  );
  assert.equal(state.tables.language_courses.length, 1);
  await transition({ type: "courses", key: source.id }, "submit");
  await transition({ type: "courses", key: source.id }, "approve");
  await transition({ type: "courses", key: source.id }, "publish");
  assert.equal(
    state.tables.language_courses.find((r) => r.id === source.id).price,
    null,
  );
  // Both package tables retain full currency precision; add-ons have no package-only columns.
  result = await savePriceDraft({
    kind: "packages",
    id: pkg,
    version: 0,
    values: { currency_code: "LYD", price_full: 234.567 },
    currencyChangeConfirmed: true,
  });
  assert(result.ok, result.error);
  for (const action of ["submit", "approve", "publish"])
    await transition({ type: "packages", key: pkg }, action);
  assert.equal(Number(state.tables.packages[0].price_full), 234.567);
  assert.equal(state.tables.packages[0].slug, "existing-package");
  const addon = randomUUID();
  result = await savePriceDraft({
    kind: "addons",
    id: addon,
    version: 0,
    values: {
      name: "Isolated add-on",
      slug: "isolated-addon",
      description: "Isolated QA",
      best_for: "QA",
      currency_code: "TND",
      price_full: 12.345,
      price_installment: null,
      is_published: false,
      sort_order: 0,
    },
  });
  assert(result.ok, result.error);
  for (const action of ["submit", "approve", "publish"])
    await transition({ type: "addons", key: addon }, action);
  assert.equal(Number(state.tables.add_ons[0].price_full), 12.345);
  result = await savePriceDraft({
    kind: "addons",
    id: addon,
    version: (await readContentWorkflow({ type: "addons", key: addon }))
      .document.version,
    values: {},
    archive: true,
  });
  assert(result.ok, result.error);
  assert.equal(state.tables.add_ons[0].archived_at, null);
  for (const action of ["submit", "approve", "publish"])
    await transition({ type: "addons", key: addon }, action);
  assert(state.tables.add_ons[0].archived_at);
  assert.equal(formatMoney(12.345, "TND"), "DT12.345 TND");
  const publicPackages = await getPublishedPackages();
  assert.equal(publicPackages[0].currencyCode, "LYD");
  assert.equal(publicPackages[0].priceFull, 234.567);
  assert.equal((await getPublishedAddOns()).length, 0);
  result = await savePriceDraft({
    kind: "courses",
    id: source.id,
    version: (await readContentWorkflow({ type: "courses", key: source.id }))
      .document.version,
    values: {},
    archive: true,
  });
  assert(result.ok, result.error);
  for (const action of ["submit", "approve", "publish"])
    await transition({ type: "courses", key: source.id }, action);
  const visibleCourses = await publicCourseCatalogue();
  assert(visibleCourses.hiddenSources.includes(source.source_key));
  assert(!visibleCourses.courses.some((r) => r.id === source.id));

  const programmeRow = state.tables.programs[0],
    academicValues = academicDraft("programmes", {
      ...programmeRow,
      details: { ...programmeRow.details, currency: "PKR" },
    });
  let academicInput = {
    kind: "programmes",
    id: programme,
    expectedUpdatedAt: programmeRow.updated_at,
    operation: "save",
    values: academicValues,
    currencyChangeConfirmed: false,
  };
  result = await saveAcademicRecord(academicInput);
  assert(!result.ok);
  assert.match(result.error, /Confirm/);
  result = await saveAcademicRecord({
    ...academicInput,
    currencyChangeConfirmed: true,
  });
  assert(result.ok, result.error);
  assert.equal(state.tables.programs[0].details.currency, "EUR");
  for (const action of ["submit", "approve", "publish"])
    await transition({ type: "programmes", key: programme }, action);
  assert.equal(state.tables.programs[0].details.currency, "PKR");
  assert.equal(state.tables.programs[0].university_id, university);
  const application = {
    trackingId: "ISOLATED-CURRENCY-QA",
    submittedAt: "2026-10-28T00:00:00Z",
    screeningTag: "Review Needed",
    reviewStatus: "Pending",
    applicationType: "university",
    documents: [],
    payload: {
      personalInfo: {
        fullName: "Synthetic QA",
        email: "qa@example.invalid",
        phone: "000",
        dateOfBirth: "2000-01-01",
        nationality: "QA",
      },
      academicBackground: {
        highestQualification: "QA",
        institutionName: "QA",
        gpa: 3,
        ieltsScore: 6,
        graduationYear: "2025",
      },
      programPreferences: {
        intake: "Fall 2026",
        preferredContinent: "Europe",
        destinationChoices: [],
        programInterest: "QA",
      },
      packageSelection: {
        packageId: pkg,
        packageSlug: "existing-package",
        packageName: "QA",
        addonIds: [addon],
      },
    },
  };
  const zip = await JSZip.loadAsync(
    await buildApplicationZipBuffer(application),
  );
  const summary = await zip
    .file("ISOLATED-CURRENCY-QA/ISOLATED-CURRENCY-QA - Package and add-ons.txt")
    .async("string");
  assert(summary.includes("LYD 234.567"));
  assert(summary.includes("TND 12.345"));
  assert(summary.includes("Separate currency totals"));
  assert(!summary.includes("246.912"));
  assert(
    Object.keys(zip.files).some((n) => n.endsWith(".pdf")),
    "Actual PDF generation supports ISO currency codes without unsupported symbol glyphs",
  );
  const beforeCountry = structuredClone(state.tables.countries[0]);
  let regions = await readRegions();
  const changes = {
    version: 0,
    regions: [
      {
        id: 1,
        label: "Renamed Europe",
        continent: "Europe",
        sort_order: 1,
        is_published: true,
        archived_at: null,
      },
      {
        id: 2,
        label: "QA new region",
        continent: "Europe",
        sort_order: 0,
        is_published: true,
        archived_at: null,
      },
    ],
    countries: [{ id: country, region_group_id: 2, sort_order: 0 }],
  };
  result = await saveRegionsDraft(changes);
  assert(result.ok, result.error);
  assert.equal(state.tables.countries[0].region_group_id, 1);
  await transition({ type: "regions", key: "catalogue" }, "submit");
  await transition({ type: "regions", key: "catalogue" }, "approve");
  await transition({ type: "regions", key: "catalogue" }, "publish");
  assert.equal(state.tables.countries[0].region_group_id, 2);
  assert.equal(state.tables.countries[0].id, beforeCountry.id);
  assert.equal(state.tables.countries[0].slug, beforeCountry.slug);
  assert.equal(state.tables.featured_universities[0].country_id, country);
  const rv = await readRegions(),
    bad = structuredClone(rv.published);
  bad.tables.countries[0].slug = "changed";
  await assert.rejects(
    db.query("select cms_content_check_scope($1,$2,$3)", [
      "regions",
      "catalogue",
      bad,
    ]),
    /must remain unchanged/,
  );
  result = await saveCurrency({
    code: "ZZZ",
    name: "QA unused currency",
    symbol: "Z",
    decimals: 4,
    active: true,
  });
  assert(result.ok, result.error);
  result = await saveCurrency({
    code: "ZZZ",
    name: "QA unused currency",
    symbol: "Z",
    decimals: 3,
    active: true,
  });
  assert(result.ok, result.error);
  result = await saveCurrency({
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimals: 0,
    active: true,
  });
  assert(!result.ok);
  assert.match(result.error, /precision/);
  state.super = false;
  result = await saveCurrency({
    code: "ZZZ",
    name: "Not permitted",
    symbol: "Z",
    decimals: 3,
    active: true,
  });
  assert(!result.ok);
  state.super = true;
  const newCourse = randomUUID();
  result = await savePriceDraft({
    kind: "courses",
    id: newCourse,
    version: 0,
    values: {
      title: "QA new course",
      description: "QA only",
      price: 1.234,
      currency_code: "EUR",
      source_key: null,
      sort_order: 0,
      is_active: false,
    },
    currencyChangeConfirmed: true,
  });
  assert(!result.ok);
  assert.match(result.error, /decimal/);
  for (const bad of [
    { overlayColor: "url(evil)" },
    { overlayOpacity: "101" },
    { brightness: "49" },
    { contrast: "NaN" },
    { textColor: "#fff" },
    { textMode: "none" },
  ])
    assert(validateSlidePatch(bad));
  assert.equal(
    validateSlidePatch({
      overlayOpacity: "0",
      brightness: "110",
      contrast: "90",
      textColor: "#FFFFFF",
      textMode: "light",
      overlayColor: "#000000",
    }),
    null,
  );
  for (const color of ["#777777", "#FFFFFF", "#000000", "#2F3E46"]) {
    const style = heroTextStyle({ textMode: "custom", textColor: color });
    assert(["#000000", "#FFFFFF"].includes(style.backgroundColor));
    assert.equal(style.color, color);
  }
  const person = {
    email: "legacy@example.invalid",
    app_metadata: {
      staff_identity: {
        full_name: "Assigned identity",
        designation: "Assigned role",
      },
    },
    user_metadata: { display_name: "My greeting", role: "superadmin" },
  };
  assert.equal(staffDisplayName(person), "My greeting");
  assert.deepEqual(staffIdentity(person), {
    fullName: "Assigned identity",
    designation: "Assigned role",
  });
  console.log(
    "PASS: isolated real SQL migration/idempotency; private course drafts, currency confirmation, language preservation, permissions, API auth, approval/owner activation, publication, region reassignment/identity preservation, currency restrictions, mixed-currency Application PDF/ZIP exports without relabeling or cross-currency totals, hero input and profile identity separation.",
  );
} finally {
  await f.close();
}
