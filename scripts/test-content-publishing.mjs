import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { publishingFixture } from "./fixtures/publishing-fixture.mjs";
import {
  readContentWorkflow,
  readContentRevision,
  transitionContent,
} from "../src/app/admin/cms/publishing-actions.ts";
import { saveHomepageEditor } from "../src/app/admin/cms/homepage-editor-actions.ts";
import {
  saveHomepageCollection,
  saveHomepagePresentation,
} from "../src/app/admin/cms/homepage-items-actions.ts";
import { saveAcademicRecord } from "../src/app/admin/cms/academic-actions.ts";
import { saveHomepageStory } from "../src/app/admin/cms/homepage-story-actions.ts";
import { upsertTickerItem, deleteTickerItem } from "../src/app/admin/actions.ts";
import { saveSiteSettings } from "../src/app/admin/cms/site-settings-actions.ts";
import { saveHomeHeroSlide } from "../src/app/admin/cms/home-page-blocks-actions.ts";
import { saveSiteContent } from "../src/app/admin/actions.ts";
import { deleteCmsBlock } from "../src/app/admin/cms/cms-block-actions.ts";
import { resolveCollection } from "../src/lib/homepage/items.ts";
import {
  HERO_SITE_KEYS,
  DEFAULT_HERO_SLIDES,
  HOME_SECTIONS,
} from "../src/lib/homepage/content.ts";
import { academicDraft } from "../src/lib/academic/draft.ts";
import { homepageWorkflowPreview } from "../src/lib/publishing/preview.ts";
import { compareContent } from "../src/lib/publishing/comparison.ts";
import { requireRestorationAccess } from "../src/lib/publishing/access.ts";
const fixture = await publishingFixture(),
  { state, user, db } = fixture;
try {
  const now = "2026-10-28T00:00:00.000Z";
  state.tables.region_groups.push({
    id: 1,
    label: "Southern Europe",
    continent: "Europe",
  });
  const cid = randomUUID(),
    uid = randomUUID();
  state.tables.countries.push({
    id: cid,
    name: "Italy",
    slug: "italy",
    region_group_id: 1,
    why_study: "Existing guidance",
    why_study_there: "Existing guidance",
    living_cost: "Existing costs",
    living_cost_approx: "Existing costs",
    visa_info: "Existing visa",
    popular_unis: [],
    popular_universities: [],
    destination_guide: {},
    catalogue: {},
    is_published: true,
    updated_at: now,
  });
  state.tables.featured_universities.push({
    id: uid,
    name: "Existing university",
    country: "Italy",
    country_id: cid,
    profile: {},
    programs: [],
    is_published: true,
    updated_at: now,
  });
  state.tables.programs.push({
    id: "stable-programme",
    title: "Existing programme",
    university: "Existing university",
    country: "Italy",
    university_id: uid,
    degree: "master",
    intake: "Existing intake",
    deadline: "2027-06-01",
    tuition_range: "Existing fees",
    details: {},
    is_published: true,
    updated_at: now,
  });
  state.tables.site_content.push({
    key: HERO_SITE_KEYS.title,
    value: "Existing public headline",
    page: "home",
    section: "hero",
  });
  await state.sync();
  let result = await saveHomepageEditor({
    kind: "global",
    patch: { title: "Private setup draft" },
    expected: { title: "Existing public headline" },
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    state.tables.site_content[0].value,
    "Existing public headline",
    "Private drafting is safe before publication cutover",
  );
  let setupView = await readContentWorkflow({ type: "home", key: "hero" });
  assert(setupView.ready && !setupView.publicationEnabled);
  state.super = true;
  for (const action of ["submit", "approve"]) {
    const current = await readContentWorkflow({ type: "home", key: "hero" });
    const changed = await transitionContent({
      resource: { type: "home", key: "hero" },
      version: current.document.version,
      action,
    });
    assert(changed.ok, JSON.stringify(changed));
  }
  setupView = await readContentWorkflow({ type: "home", key: "hero" });
  const disabledPublish = await transitionContent({
    resource: { type: "home", key: "hero" },
    version: setupView.document.version,
    action: "publish",
    approvedRevisionId: setupView.document.approved_revision_id,
  });
  assert(!disabledPublish.ok);
  assert.equal(state.tables.site_content[0].value, "Existing public headline");
  assert(
    (
      await transitionContent({
        resource: { type: "home", key: "hero" },
        version: setupView.document.version,
        action: "discard",
      })
    ).ok,
  );
  state.super = false;
  await state.activate();
  const home = { type: "home", key: "hero" };
  result = await saveHomepageEditor({
    kind: "global",
    patch: { title: "Private draft headline" },
    expected: { title: "Existing public headline" },
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    state.tables.site_content[0].value,
    "Existing public headline",
    "Save Draft must never change public copy",
  );
  let view = await readContentWorkflow(home);
  assert.equal(view.document.status, "draft");
  assert.equal(view.document.owner_id, user.id);
  assert(
    view.history.length >= 2 &&
      view.history.some((row) => row.event === "existing_baseline"),
  );
  assert(
    compareContent(view.published, view.document.proposed).some(
      (diff) => diff.after === "Private draft headline",
    ),
  );
  const originalVersion = view.document.version;
  const transition = async (resource, action, extra = {}) => {
    const current = await readContentWorkflow(resource);
    return transitionContent({
      resource,
      version: current.document.version,
      action,
      approvedRevisionId: current.document.approved_revision_id,
      ...extra,
    });
  };
  const unchanged = JSON.stringify(state.tables.site_content);
  result = await transition(home, "publish");
  assert(!result.ok, "Cannot publish a Draft");
  assert.equal(JSON.stringify(state.tables.site_content), unchanged);
  result = await transition(home, "submit");
  assert(result.ok, JSON.stringify(result));
  assert(
    !(
      await saveHomepageEditor({
        kind: "global",
        patch: { title: "Bypass review" },
        expected: { title: "Private draft headline" },
      })
    ).ok,
    "In Review is locked",
  );
  state.fine = { "home.*": true };
  result = await transition(home, "approve");
  assert(!result.ok, "Legacy wildcard must not acquire new review permission");
  state.fine = {
    "home.*": true,
    "publishing.review": true,
    "publishing.publish": true,
  };
  result = await transition(home, "approve");
  assert(!result.ok, "Staff cannot approve their own content");
  state.session = { id: randomUUID(), email: "reviewer@example.invalid" };
  result = await transition(home, "request_changes", {
    note: "Please clarify the headline.",
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(result.view.document.status, "changes_requested");
  assert.equal(result.view.document.note, "Please clarify the headline.");
  state.session = user;
  result = await saveHomepageEditor({
    kind: "global",
    patch: { title: "Approved private headline" },
    expected: { title: "Private draft headline" },
  });
  assert(result.ok, JSON.stringify(result));
  assert(
    !(
      await transitionContent({
        resource: home,
        version: originalVersion,
        action: "submit",
      })
    ).ok,
    "Stale draft version rejected",
  );
  await transition(home, "submit");
  state.session = { id: randomUUID(), email: "reviewer@example.invalid" };
  result = await transition(home, "approve");
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.site_content[0].value, "Existing public headline");
  assert.equal(result.view.document.status, "approved");
  assert(
    !(
      await saveHomepageEditor({
        kind: "global",
        patch: { title: "Stale approved edit" },
        expected: { title: "Approved private headline" },
      })
    ).ok,
  );
  result = await transition(home, "publish");
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.site_content[0].value, "Approved private headline");
  assert.equal(result.view.document.status, "published");
  assert(result.view.document.published_revision_id);
  const revisions = (await readContentWorkflow(home)).history;
  assert(revisions.some((row) => row.event === "publish"));
  let firstRevision;
  for (const revision of revisions.filter(
    (row) => row.event === "save_draft",
  )) {
    const loaded = await readContentRevision({
      resource: home,
      id: revision.id,
    });
    if (
      loaded.proposed.tables.site_content.some(
        (row) => row.value === "Private draft headline",
      )
    ) {
      firstRevision = loaded;
      break;
    }
  }
  assert(firstRevision);
  result = await transition(home, "restore", { revisionId: firstRevision.id });
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    state.tables.site_content[0].value,
    "Approved private headline",
    "Restore creates a draft",
  );
  assert.equal(result.view.document.status, "draft");
  assert.equal(result.view.document.approved_revision_id, null);
  assert.equal(
    result.view.document.proposed.tables.site_content[0].value,
    "Private draft headline",
  );
  result = await transition(home, "discard");
  assert(result.ok);
  assert.equal(state.tables.site_content[0].value, "Approved private headline");
  assert(
    (await readContentWorkflow(home)).history.length > revisions.length,
    "Discard retains history",
  );
  console.log(
    "PASS: private draft/public separation, explicit activation, author metadata, submission, permission opt-in, independent approval, requests for changes, stale versions, approved edit lock, atomic publication, immutable event history, compare, restore and discard.",
  );
  state.session = user;
  state.fine = { "*": true };
  state.super = true;
  const cards = resolveCollection([], "why_cards").items;
  cards[0].title = "Approved draft benefit";
  result = await saveHomepageCollection({
    collection: "why_cards",
    items: cards,
    expectedUpdatedAt: null,
  });
  assert(result.ok, JSON.stringify(result));
  assert(!state.tables.cms_content_blocks.length);
  view = await readContentWorkflow({ type: "home", key: "why_unimondo" });
  assert(
    view.document.proposed.tables.cms_content_blocks[0].content.items[0]
      .title === "Approved draft benefit",
  );
  const baseData = {
    site: { [HERO_SITE_KEYS.title]: "Approved private headline" },
    blocks: [],
    permissions: {},
    stories: [],
    editableStories: { rows: [], available: true },
  };
  const preview = homepageWorkflowPreview(baseData, view);
  assert(
    preview.blocks.some(
      (block) => block.content.items[0].title === "Approved draft benefit",
    ),
  );
  assert.equal(
    homepageWorkflowPreview(baseData, view, true).blocks.length,
    0,
    "Published preview excludes saved draft",
  );
  await transition({ type: "home", key: "why_unimondo" }, "submit");
  await transition({ type: "home", key: "why_unimondo" }, "approve");
  result = await transition({ type: "home", key: "why_unimondo" }, "publish");
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    state.tables.cms_content_blocks[0].content.items[0].title,
    "Approved draft benefit",
  );
  assert(
    !(
      await saveHomeHeroSlide({
        imageUrl: DEFAULT_HERO_SLIDES[0].src,
        imageAlt: "Bypass",
      })
    ).ok,
    "Legacy save endpoint blocked",
  );
  await assert.rejects(() =>
    saveSiteContent([{ key: HERO_SITE_KEYS.title, value: "Bypass" }]),
  );
  assert(
    !(
      await deleteCmsBlock({
        id: state.tables.cms_content_blocks[0].id,
        permission_key: "home.edit",
        revalidate_paths: [],
      })
    ).ok,
  );
  const oldCountries = JSON.stringify(state.tables.countries),
    oldUnis = JSON.stringify(state.tables.featured_universities);
  const prog = state.tables.programs[0],
    draft = academicDraft("programmes", prog);
  draft.title = "Private academic title";
  const resource = { type: "programmes", key: prog.id };
  result = await saveAcademicRecord({
    kind: "programmes",
    id: prog.id,
    expectedUpdatedAt: prog.updated_at,
    values: draft,
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.programs[0].title, "Existing programme");
  await transition(resource, "submit");
  await transition(resource, "approve");
  result = await transition(resource, "publish");
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.programs[0].title, "Private academic title");
  assert.equal(state.tables.programs[0].university_id, uid);
  assert.equal(JSON.stringify(state.tables.countries), oldCountries);
  assert.equal(JSON.stringify(state.tables.featured_universities), oldUnis);
  console.log(
    "PASS: real homepage card/preview integration, legacy bypass refusal and catalogue publication retaining parent IDs/records.",
  );
  // All existing homepage copy/presentation scopes save privately.
  const publicBefore = JSON.stringify({
    site: state.tables.site_content,
    blocks: state.tables.cms_content_blocks,
  });
  for (const section of [
    "marketing_banner",
    "why_unimondo",
    "destinations",
    "universities",
    "success_stories",
    "how_it_works",
    "why_europe",
    "journey_cta",
  ]) {
    const scope = { type: "home", key: section };
    const current = await readContentWorkflow(scope),
      copy =
        current.document?.proposed.tables.cms_content_blocks.find(
          (row) => row.block_key === "copy",
        ) ??
        current.published.tables.cms_content_blocks.find(
          (row) => row.block_key === "copy",
        );
    result = await saveHomepageEditor({
      kind: "copy",
      section,
      patch: {
        [HOME_SECTIONS.find((value) => value.id === section).fields.find(
          (field) => field.type !== "link",
        ).key]: "Private " + section,
      },
      expectedUpdatedAt: copy ? `draft:${current.document.version}` : null,
    });
    assert(result.ok, JSON.stringify(result));
    const after = await readContentWorkflow(scope);
    assert.equal(after.document.status, "draft");
    assert(
      after.history.some((revision) => revision.event === "existing_baseline"),
    );
  }
  assert.equal(
    JSON.stringify({
      site: state.tables.site_content,
      blocks: state.tables.cms_content_blocks,
    }),
    publicBefore,
    "Eight copy edits did not publish anything",
  );
  const newSlide = {
    kind: "newSlide",
    patch: {
      imageUrl: DEFAULT_HERO_SLIDES[0].src,
      imageAlt: "Approved private slide",
      title: "Private new slide",
    },
    inherit: [],
    visible: true,
    order: 5,
  };
  result = await saveHomepageEditor(newSlide);
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    state.tables.cms_content_blocks.filter(
      (block) => block.section_key === "hero_slider",
    ).length,
    0,
  );
  const slides = { type: "home", key: "hero_slides" };
  view = await readContentWorkflow(slides);
  assert.equal(view.document.proposed.tables.cms_content_blocks.length, 6);
  await transition(slides, "submit");
  await transition(slides, "approve");
  assert((await transition(slides, "publish")).ok);
  assert.equal(
    state.tables.cms_content_blocks.filter(
      (block) => block.section_key === "hero_slider",
    ).length,
    6,
  );
  view = await readContentWorkflow(slides);
  const baselineSlide = view.history.find(
    (revision) => revision.event === "existing_baseline",
  );
  result = await transition(slides, "restore", {
    revisionId: baselineSlide.id,
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(
    result.view.document.proposed.tables.cms_content_blocks.filter(
      (row) => row.is_active,
    ).length,
    5,
    "Restore preserves original five and retains newer slide hidden",
  );
  assert.equal(
    state.tables.cms_content_blocks.filter(
      (row) => row.section_key === "hero_slider" && row.is_active,
    ).length,
    6,
    "Restore is still private",
  );
  // Existing country/university drafts and new programmes keep canonical hierarchy intact.
  for (const [kind, key, field, value] of [
    ["countries", cid, "description", "Approved destination copy"],
    ["universities", uid, "prestige_line", "Approved university copy"],
  ]) {
    const record = state.tables[
        kind === "universities" ? "featured_universities" : "countries"
      ].find((row) => row.id === key),
      values = academicDraft(kind, record);
    values[field] = value;
    const old = JSON.stringify(record);
    result = await saveAcademicRecord({
      kind,
      id: key,
      expectedUpdatedAt: record.updated_at,
      values,
    });
    assert(result.ok, JSON.stringify(result));
    assert.equal(
      JSON.stringify(
        state.tables[
          kind === "universities" ? "featured_universities" : "countries"
        ].find((row) => row.id === key),
      ),
      old,
    );
    await transition({ type: kind, key }, "submit");
    await transition({ type: kind, key }, "approve");
    assert((await transition({ type: kind, key }, "publish")).ok);
    assert.equal(
      state.tables[
        kind === "universities" ? "featured_universities" : "countries"
      ].find((row) => row.id === key)[field],
      value,
    );
  }
  state.super = false;
  state.fine = { "universities.view": true, "universities.create": true };
  const newKey = randomUUID(),
    values = academicDraft("programmes");
  Object.assign(values, {
    title: "Isolated new academic draft",
    university_id: uid,
    is_published: true,
  });
  const count = state.tables.programs.length;
  result = await saveAcademicRecord({
    kind: "programmes",
    workflowKey: newKey,
    expectedUpdatedAt: null,
    values,
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.programs.length, count);
  assert.equal(result.row.id, newKey);
  assert.equal(result.row.deadline, null);
  const again = { ...values, title: "Continued private progress" };
  result = await saveAcademicRecord({
    kind: "programmes",
    id: newKey,
    expectedUpdatedAt: result.row.updated_at,
    values: again,
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.programs.length, count);
  const newResource = { type: "programmes", key: newKey };
  assert((await transition(newResource, "submit")).ok);
  assert(!(await transition(newResource, "approve")).ok);
  state.super = true;
  state.fine = { "*": true };
  assert((await transition(newResource, "approve")).ok);
  assert((await transition(newResource, "publish")).ok);
  const newRecord = state.tables.programs.find((row) => row.id === newKey);
  assert.equal(newRecord.university_id, uid);
  assert.equal(newRecord.deadline, null);
  assert.equal(state.tables.programs.length, count + 1);
  // Test an actual transactional failure after an earlier row write.
  await transition(home, "return_to_draft").catch(() => {});
  view = await readContentWorkflow(home);
  if (view.document.status === "discarded") {
  } else if (view.document.status !== "published")
    await transition(home, "discard");
  result = await saveHomepageEditor({
    kind: "global",
    patch: { eyebrow: "First row would be written", title: "Force rollback" },
    expected: {
      eyebrow:
        state.tables.site_content.find(
          (row) => row.key === HERO_SITE_KEYS.eyebrow,
        )?.value ?? null,
      title:
        state.tables.site_content.find(
          (row) => row.key === HERO_SITE_KEYS.title,
        )?.value ?? null,
    },
  });
  assert(result.ok, JSON.stringify(result));
  await transition(home, "submit");
  await transition(home, "approve");
  await db.exec(
    "alter table site_content add constraint isolated_publication_failure check(value<>'Force rollback')",
  );
  const sqlBefore = (
    await db.query("select key,value from site_content order by key")
  ).rows;
  result = await transition(home, "publish");
  assert(!result.ok, "A database failure must reject publication");
  assert.deepEqual(
    (await db.query("select key,value from site_content order by key")).rows,
    sqlBefore,
    "Whole publication transaction rolls back",
  );
  assert.equal((await readContentWorkflow(home)).document.status, "approved");
  await db.exec(
    "alter table site_content drop constraint isolated_publication_failure",
  );
  // Pending and retained historical media cannot be archived.
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
    original_name: "Isolated private image",
    alt_text: "Approved image",
    category: "general",
    status: "ready",
    created_at: now,
    updated_at: now,
    archived_at: null,
  });
  const { presentationDefaults } = await import("../src/lib/homepage/items.ts"),
    { changeMedia } = await import("../src/lib/media/operations.ts"),
    { getMediaAccess } = await import("../src/lib/media/access.ts");
  result = await saveHomepagePresentation({
    section: "why_europe",
    values: {
      ...presentationDefaults("why_europe"),
      imageUrl: url,
      imageAlt: "Private approved image",
    },
    expectedUpdatedAt: null,
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
  assert((await transition({ type: "home", key: "why_europe" }, "discard")).ok);
  await assert.rejects(
    () =>
      changeMedia(
        mediaId,
        { operation: "archive", confirm: true },
        user.id,
        grants,
      ),
    /in use/,
    "Discard retains media safety through immutable history",
  );
  // A standalone story editor retains its existing blog permissions without homepage access.
  state.super = false;
  state.fine = { "blog.view": true, "blog.create": true, "blog.edit": true };
  result = await saveHomepageStory({
    expectedUpdatedAt: null,
    profile_image_url: DEFAULT_HERO_SLIDES[0].src,
    full_name: "Isolated approved public name",
    testimonial: "Isolated testimonial draft; never sent to production.",
    country: "", program: "", university: "", sort_order: 0,
    is_published: false, public_approved: false,
  });
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.success_stories.length, 0);
  const storyView = await readContentWorkflow({ type: "home", key: "testimonials" });
  assert.equal(storyView.document.proposed.tables.success_stories.length, 1);
  state.fine = { "blog.view": true, "blog.create": true };
  const oldStory = storyView.document.proposed.tables.success_stories[0];
  await assert.rejects(() => requireRestorationAccess(
    { type: "home", key: "testimonials" },
    { tables: { success_stories: [oldStory] } },
    { tables: { success_stories: [{ ...oldStory, testimonial: "Unauthorized history rewrite" }] } }, user
  ), /permission/);
  state.fine = { "blog.view": true, "blog.edit": true };
  await assert.rejects(() => requireRestorationAccess(
    { type: "home", key: "testimonials" },
    { tables: { success_stories: [{ ...oldStory, is_published: true }] } },
    { tables: { success_stories: [oldStory] } }, user
  ), /archiving permission/);
  await assert.rejects(() => readContentWorkflow(home), /permission/);
  assert(!(await transition({ type: "home", key: "testimonials" }, "approve")).ok);
  state.super = true;
  state.fine = { "*": true };
  // Header announcements share the same private workflow and optimistic version checks.
  let ticker = await readContentWorkflow({ type: "home", key: "ticker" });
  await upsertTickerItem({ message: "Private announcement", href: "/destinations", sortOrder: 0, isPublished: true, expectedVersion: ticker.document?.version ?? 0 });
  assert.equal(state.tables.news_ticker_items.length, 0);
  ticker = await readContentWorkflow({ type: "home", key: "ticker" });
  const line = ticker.document.proposed.tables.news_ticker_items[0];
  result = await saveSiteSettings({ ticker_text: "Private header", ticker_active: true, expectedVersion: ticker.document.version });
  assert(result.ok, JSON.stringify(result));
  assert.equal(state.tables.site_settings.length, 0);
  await assert.rejects(() => deleteTickerItem(line.id, ticker.document.version), /changed|Reload|version/);
  ticker = await readContentWorkflow({ type: "home", key: "ticker" });
  await deleteTickerItem(line.id, ticker.document.version);
  ticker = await readContentWorkflow({ type: "home", key: "ticker" });
  assert.equal(ticker.document.proposed.tables.news_ticker_items[0].is_published, false);
  for (const action of ["submit", "approve", "publish"]) {
    const outcome = await transition({ type: "home", key: "ticker" }, action);
    assert(outcome.ok, JSON.stringify(outcome));
  }
  assert.equal(state.tables.site_settings[0].ticker_text, "Private header");
  assert.equal(state.tables.news_ticker_items[0].is_published, false);
  console.log("PASS: standalone story permissions, private testimonials and announcement settings/lines, stale announcement rejection and controlled publication.");
  // SQL/API privacy: even existing broad public-table grants cannot bypass activation.
  const role = async (name, query) => {
    await db.exec("set role " + name);
    try {
      return await db.query(query);
    } finally {
      await db.exec("reset role");
    }
  };
  for (const actor of ["anon", "authenticated"]) {
    await assert.rejects(
      () => role(actor, "select * from cms_content_workflows"),
      /permission denied/,
    );
    await assert.rejects(
      () => role(actor, "select * from cms_content_revisions"),
      /permission denied/,
    );
    await assert.rejects(
      () => role(actor, "select cms_content_snapshot('home','hero')"),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        role(
          actor,
          "update site_content set value='Bypass approved publication'where key='home.hero.title'",
        ),
      /approved content publishing/,
    );
  }
  await assert.rejects(
    () => db.query("update cms_content_revisions set note='Alter history'"),
    /immutable/,
  );
  const beforeBad = (
    await db.query("select count(*)as count from cms_content_revisions")
  ).rows;
  await assert.rejects(
    () =>
      db.query("select cms_content_save_draft($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
        "home",
        "why_stats",
        "Bad cross section",
        0,
        { tables: { cms_content_blocks: [] } },
        {
          tables: {
            cms_content_blocks: [
              {
                id: randomUUID(),
                page_slug: "about",
                section_key: "marketing_banner",
                block_key: "copy",
                sort_order: 0,
              },
            ],
          },
        },
        user.id,
        "Isolated author",
        null,
      ]),
    /Cross-section/,
  );
  assert.deepEqual(
    (await db.query("select count(*)as count from cms_content_revisions")).rows,
    beforeBad,
    "Bad scope leaves no workflow history",
  );
  state.super = false;
  state.fine = { "home.view": true };
  view = await readContentWorkflow(home);
  assert.equal(
    view.document,
    null,
    "View-only staff receive no private draft or history",
  );
  assert.equal(view.history.length, 0);
  state.session = null;
  await assert.rejects(() => readContentWorkflow(home));
  assert(
    state.requests.every(
      (request) => !/(applications|agreement|auth\/v1)/.test(request.pathname),
    ),
    "Publishing never accesses excluded operational systems",
  );
  console.log(
    "PASS: all homepage copy scopes, built-in/new slide preservation and controlled baseline restoration, country/university edits, create-only private programme continuation, role/private-table isolation, direct-writer activation guard, real multi-row rollback, draft/historical media retention and cross-section injection rejection. No production requests.",
  );
} finally {
  await fixture.close();
}
