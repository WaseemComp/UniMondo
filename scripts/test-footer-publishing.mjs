import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { publishingFixture } from "./fixtures/publishing-fixture.mjs";
import { saveFooterDraft } from "../src/app/admin/cms/footer-actions.ts";
import {
  readContentWorkflow,
  readContentRevision,
  transitionContent,
} from "../src/app/admin/cms/publishing-actions.ts";
import {
  FOOTER_RESOURCE,
  footerSchema,
  resolveFooter,
  footerDefaults,
} from "../src/lib/footer/model.ts";
import {
  getFooterDefaults,
  getPublicFooter,
} from "../src/lib/footer/server.ts";
import { getMediaAccess } from "../src/lib/media/access.ts";
import { changeMedia } from "../src/lib/media/operations.ts";
const fixture = await publishingFixture(),
  { state, db, user } = fixture;
try {
  for (const name of [
    "contact_offices",
    "contact_addresses",
    "contact_phones",
    "contact_emails",
  ])
    state.tables[name] = [];
  state.tables.contact_offices.push({
    id: "existing-office",
    office_type: "head",
    title: "Existing office",
    address_lines: "Existing published address\nSecond line",
    phones: [{ number: "+44 (20) 1234-5678", kind: "landline" }],
    emails: [
      { email: "hello@example.invalid" },
      { email: "admissions@example.invalid" },
    ],
    social_links: [],
    sort_order: 0,
  });
  const inherited = await getFooterDefaults(true),
    originalContact = JSON.stringify(state.tables.contact_offices);
  assert.equal(inherited.contacts[0].value, "Existing published address");
  assert.equal(
    inherited.contacts.find((row) => row.id === "phone").value,
    "+44 (20) 1234-5678",
  );
  assert.deepEqual((await getPublicFooter()).config, inherited);
  const save = (input) =>
    saveFooterDraft({ ...input, expectedDefaults: JSON.stringify(inherited) });
  const before = JSON.stringify(state.tables.cms_content_blocks);
  let result = await save({ config: inherited, expectedVersion: 0 });
  assert(
    !result.ok,
    "Footer saves fail closed before the small Phase 07 extension",
  );
  const extension = readFileSync(
    new URL(
      "../supabase/migrations/20261031090000_footer_publishing.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(extension);
  await db.exec(extension);
  assert.equal(
    (await db.query("select enabled from cms_publishing_settings")).rows[0]
      .enabled,
    false,
  );
  assert.equal(JSON.stringify(state.tables.cms_content_blocks), before);
  assert.equal(JSON.stringify(state.tables.contact_offices), originalContact);
  state.tables.contact_offices[0].address_lines =
    "Changed after opening the editor";
  result = await save({ config: inherited, expectedVersion: 0 });
  assert(!result.ok && /Inherited contact details changed/.test(result.error));
  state.tables.contact_offices[0].address_lines =
    "Existing published address\nSecond line";
  const config = {
    ...inherited,
    description: "Privately revised footer description",
    explore: [...inherited.explore].reverse(),
  };
  config.explore[0] = { ...config.explore[0], visible: false };
  result = await save({ config, expectedVersion: 0 });
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    JSON.stringify(state.tables.cms_content_blocks),
    before,
    "Save Draft never touches public blocks",
  );
  let view = await readContentWorkflow(FOOTER_RESOURCE);
  assert.equal(view.document.status, "draft");
  assert(!view.publicationEnabled);
  assert.equal(
    resolveFooter(inherited, view.document.proposed.tables.cms_content_blocks)
      .config.description,
    config.description,
  );
  assert.deepEqual((await getPublicFooter()).config, inherited);
  const baseline = view.history.find(
    (row) => row.event === "existing_baseline",
  );
  const baselineFull = await readContentRevision({
    resource: FOOTER_RESOURCE,
    id: baseline.id,
  });
  assert.equal(
    baselineFull.proposed.tables.cms_content_blocks[0].content.footer
      .description,
    inherited.description,
  );
  assert(
    !(await save({ config, expectedVersion: 0 })).ok,
    "Stale footer writes refused",
  );
  for (const broken of [
    { ...config, description: "" },
    {
      ...config,
      explore: [{ ...config.explore[0], href: "javascript:alert(1)" }],
    },
    { ...config, social: [{ ...config.social[0], href: "//evil.invalid" }] },
    {
      ...config,
      contacts: [
        {
          id: "bad",
          label: "",
          kind: "email",
          value: "not-an-email",
          visible: true,
        },
      ],
    },
    { ...config, logoUrl: "/../secret.svg", logoAlt: "Unsafe" },
    {
      ...config,
      sections: [
        config.sections[0],
        config.sections[0],
        config.sections[2],
        config.sections[3],
      ],
    },
  ])
    assert(!footerSchema.safeParse(broken).success);
  const transition = async (action, extra = {}) => {
    const current = await readContentWorkflow(FOOTER_RESOURCE);
    return transitionContent({
      resource: FOOTER_RESOURCE,
      version: current.document.version,
      action,
      approvedRevisionId: current.document.approved_revision_id,
      ...extra,
    });
  };
  state.fine = { "home.view": true };
  assert(!(await save({ config, expectedVersion: view.document.version })).ok);
  assert.equal(
    (await readContentWorkflow(FOOTER_RESOURCE)).document,
    null,
    "View-only staff cannot inspect private drafts",
  );
  state.fine = {
    "home.view": true,
    "home.edit": true,
    "publishing.review": true,
    "publishing.publish": true,
  };
  assert((await transition("submit")).ok);
  assert(!(await transition("approve")).ok, "Staff cannot self-approve");
  state.super = true;
  state.fine = { "*": true };
  assert(
    (
      await transition("request_changes", {
        note: "Clarify the published footer wording.",
      })
    ).ok,
  );
  assert((await transition("submit")).ok);
  assert((await transition("approve")).ok);
  assert(
    !(await transition("publish")).ok,
    "Owner activation remains required",
  );
  await state.activate();
  assert((await transition("publish")).ok);
  assert.equal(
    (await getPublicFooter()).config.description,
    config.description,
  );
  assert(
    state.revalidated.includes("/"),
    "Publication revalidates the public layout",
  );
  assert.equal(
    JSON.stringify(state.tables.contact_offices),
    originalContact,
    "Footer changes never modify Contact records",
  );
  view = await readContentWorkflow(FOOTER_RESOURCE);
  const retainedId = randomUUID(),
    edited = {
      ...config,
      company: [
        ...config.company,
        {
          id: retainedId,
          label: "Newly approved link",
          href: "/contact",
          visible: true,
        },
      ],
    };
  assert(
    (await save({ config: edited, expectedVersion: view.document.version })).ok,
  );
  for (const action of ["submit", "approve", "publish"])
    assert((await transition(action)).ok);
  assert((await transition("restore", { revisionId: baseline.id })).ok);
  view = await readContentWorkflow(FOOTER_RESOURCE);
  const restored = resolveFooter(
    inherited,
    view.document.proposed.tables.cms_content_blocks,
  ).config;
  assert.equal(restored.description, inherited.description);
  assert.equal(
    restored.company.find((item) => item.id === retainedId).visible,
    false,
    "Restore retains newer link hidden",
  );
  assert.equal(
    (await getPublicFooter()).config.description,
    config.description,
    "Restoration remains private",
  );
  assert((await transition("discard")).ok);
  const mediaId = randomUUID(),
    url =
      "https://media-tests.invalid/storage/v1/object/public/featured-university-media/cms-library/" +
      mediaId +
      ".webp";
  state.tables.cms_media_assets.push({
    id: mediaId,
    url,
    object_path: "cms-library/" + mediaId + ".webp",
    source: "upload",
    original_name: "Isolated logo",
    alt_text: "Existing brand image",
    category: "general",
    status: "ready",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  });
  view = await readContentWorkflow(FOOTER_RESOURCE);
  result = await save({
    config: { ...edited, logoUrl: url, logoAlt: "Approved branding" },
    expectedVersion: view.document.version,
  });
  assert(result.ok, JSON.stringify(result));
  const grants = await getMediaAccess(state.session);
  await assert.rejects(
    () =>
      changeMedia(
        mediaId,
        { operation: "archive", confirm: true },
        user.id,
        grants,
      ),
    /in use/,
  );
  assert((await transition("discard")).ok);
  await assert.rejects(
    () =>
      changeMedia(
        mediaId,
        { operation: "archive", confirm: true },
        user.id,
        grants,
      ),
    /in use/,
    "History retains the image reference",
  );
  state.tableFailure = "contact_offices";
  await assert.rejects(() => getFooterDefaults(true), /could not be verified/);
  state.tableFailure = "";
  for (const role of ["anon", "authenticated"]) {
    await db.exec("set role " + role);
    try {
      await assert.rejects(
        () => db.query("select cms_content_snapshot('home','footer')"),
        /permission denied/,
      );
    } finally {
      await db.exec("reset role");
    }
  }
  await assert.rejects(
    () =>
      db.query(
        "update cms_content_blocks set content='{}'where section_key='footer'",
      ),
    /approved content publishing/,
  );
  assert(
    state.requests.every(
      (request) => !/(applications|agreement|auth\/v1)/.test(request.pathname),
    ),
  );
  console.log(
    "PASS: footer defaults/contact inheritance, additive migration compatibility, private draft/review/publication, owner activation gate, stale/invalid inputs, view-only denial, independent approval, restoration retaining newer items, public layout invalidation, contact preservation, private/history media safety and SQL bypass rejection. All writes isolated.",
  );
} finally {
  await fixture.close();
}
