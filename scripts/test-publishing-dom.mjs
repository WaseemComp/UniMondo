import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { randomUUID } from "node:crypto";
import { HomepageEditor } from "../src/components/admin/homepage/homepage-editor.tsx";
import { CatalogueManager } from "../src/components/admin/academic/catalogue-manager.tsx";
const { state } = globalThis.__publishingFixture;
state.super = true;
state.tables.site_content.push({
  key: "home.hero.title",
  value: "Current public headline",
  page: "home",
  section: "hero",
});
const cid = randomUUID(),
  uid = randomUUID();
state.tables.region_groups.push({ id: 1, label: "Southern Europe" });
state.tables.countries.push({
  id: cid,
  name: "Italy",
  slug: "italy",
  region_group_id: 1,
  is_published: true,
  why_study: "Existing benefits",
  living_cost: "Existing costs",
  visa_info: "Existing visa",
  updated_at: "2026-10-27T00:00:00.000Z",
});
state.tables.featured_universities.push({
  id: uid,
  name: "Existing university",
  country: "Italy",
  country_id: cid,
  is_published: true,
  updated_at: "2026-10-27T00:00:00.000Z",
});
state.tables.programs.push({
  id: "stable-programme",
  title: "Current public programme",
  country: "Italy",
  university: "Existing university",
  university_id: uid,
  degree: "master",
  intake: "Autumn",
  deadline: "2027-06-01",
  tuition_range: "Existing fees",
  is_published: true,
  updated_at: "2026-10-27T00:00:00.000Z",
});
await state.sync();
const data = {
  available: true,
  site: { "home.hero.title": "Current public headline" },
  blocks: [],
  openings: [],
  stories: [],
  references: {
    countries: [],
    programs: [],
    universities: [],
    available: true,
  },
  editableStories: { rows: [], available: true },
  permissions: {
    editHome: true,
    viewSlides: true,
    editSlides: true,
    createSlides: true,
    viewCta: true,
    editCta: true,
    viewStats: true,
    editStats: true,
    storyView: true,
    storyCreate: true,
    storyEdit: true,
    storyPublish: true,
    storyArchive: true,
  },
};
const root = createRoot(document.getElementById("root"));
const settle = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
const until = async (predicate, label) => {
  for (let i = 0; i < 125; i++) {
    await settle();
    if (predicate()) return;
  }
  assert.fail(
    "Timed out: " + label + "; " + document.body.textContent.slice(0, 700),
  );
};
const button = (name, scope = document) => {
  const rows = [...scope.querySelectorAll("button")].filter(
    (element) => element.textContent.replace(/\s+/g, " ").trim() === name,
  );
  assert.equal(rows.length, 1, "Unique button " + name);
  return rows[0];
};
const click = async (element) => {
  assert(element);
  assert(!element.disabled, "Enabled " + element.textContent);
  await act(async () => element.click());
  await settle();
};
const fill = async (id, value) => {
  const element = document.getElementById(id);
  assert(element, id);
  assert(!element.disabled, "Editable " + id);
  const proto =
    element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : element.tagName === "SELECT"
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(
      new window.Event(element.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
  await settle();
};
const workflow = () =>
  document.querySelector('[aria-label="Content publishing workflow"]');
const status = () => workflow()?.querySelector('[role="status"]')?.textContent;
const frame = () =>
  document.querySelector(".hp-preview-panel iframe")?.contentDocument;
try {
  await act(async () => root.render(<HomepageEditor initial={data} />));
  await until(
    () =>
      document.getElementById("hp-target") &&
      !document.getElementById("hp-target").disabled,
    "Initial hero workflow",
  );
  await fill("hp-target", "global");
  await until(
    () =>
      document.getElementById("hp-title") &&
      !document.getElementById("hp-title").disabled,
    "Global editor",
  );
  await fill("hp-title", "Private draft headline");
  await until(
    () => frame()?.body.textContent.includes("Private draft headline"),
    "Unsaved private preview",
  );
  assert.equal(
    state.tables.site_content.find((row) => row.key === "home.hero.title")
      .value,
    "Current public headline",
  );
  await click(button("Save Draft", document.querySelector("form")));
  await until(
    () =>
      status() === "Draft" &&
      document.getElementById("hp-title")?.value === "Private draft headline",
    "Saved draft",
  );
  assert.equal(
    state.tables.site_content.find((row) => row.key === "home.hero.title")
      .value,
    "Current public headline",
  );
  await click(button("Submit for Review"));
  await until(() => status() === "In Review", "Review submission");
  assert(document.getElementById("hp-title").disabled);
  await click(button("Approve"));
  await until(() => status() === "Approved", "Approval");
  assert(document.body.textContent.includes("Approved but unpublished"));
  await click(button("View Published Version"));
  await until(
    () => frame()?.body.textContent.includes("Current public headline"),
    "Current public preview",
  );
  assert(!frame().body.textContent.includes("Private draft headline"));
  await click(button("View Draft Preview"));
  await until(
    () => frame()?.body.textContent.includes("Private draft headline"),
    "Approved draft preview",
  );
  await click(button("Publish"));
  await until(() => status() === "Published", "Publication");
  assert.equal(
    state.tables.site_content.find((row) => row.key === "home.hero.title")
      .value,
    "Private draft headline",
  );
  assert(workflow().textContent.includes("Revision History"));
  const publicView = await globalThis.__publishingActions.readContentWorkflow({
    type: "home",
    key: "hero",
  });
  assert(
    publicView.history.every((revision) => revision.proposed === undefined),
    "Initial history contains only metadata",
  );
  const comparison = [...workflow().querySelectorAll("details")].find(
    (element) =>
      element.querySelector("summary")?.textContent === "View revision changes",
  );
  await act(async () => {
    comparison.open = true;
  });
  await until(
    () => !comparison.textContent.includes("Loading revision comparison"),
    "Lazy immutable revision comparison",
  );

  await click(
    [...document.querySelectorAll(".hp-sections button")].find((element) =>
      element.textContent.includes("Why UniMondo"),
    ),
  );
  await until(() => status() === "Current published content", "Why section");
  await click(button("Benefit cards"));
  await until(
    () =>
      document.getElementById("hp-item-title") &&
      !document.getElementById("hp-item-title").disabled,
    "Card mode in same workflow",
  );
  await fill("hp-item-title", "Private card revision");
  await click(button("Save Draft", document.querySelector("form")));
  await until(() => status() === "Draft", "Saved card draft");
  assert.equal(
    state.tables.cms_content_blocks.length,
    0,
    "Private cards do not publish",
  );
  await click(button("View Published Version"));
  await until(
    () =>
      frame()?.querySelectorAll('[data-home-item^="why_cards:"]').length === 6,
    "Published cards remain populated",
  );
  assert(!frame().body.textContent.includes("Private card revision"));
  await click(button("View Draft Preview"));
  await until(
    () => frame()?.body.textContent.includes("Private card revision"),
    "Saved card preview",
  );
  await click(button("Mobile", document.querySelector(".hp-preview-toolbar")));
  assert.equal(
    document.querySelector(".hp-preview-panel iframe").style.width,
    "390px",
  );
  await click(button("Desktop", document.querySelector(".hp-preview-toolbar")));
  assert.equal(
    document.querySelector(".hp-preview-panel iframe").style.width,
    "1120px",
  );
  const link = frame().querySelector("a");
  if (link) {
    const event = new frame().defaultView.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    assert.equal(
      link.dispatchEvent(event),
      false,
      "Preview navigation blocked",
    );
  }
  const permissions = Object.fromEntries(
    ["countries", "universities", "programmes"].map((kind) => [
      kind,
      Object.fromEntries(
        ["view", "create", "edit", "publish", "delete"].map((key) => [
          key,
          true,
        ]),
      ),
    ]),
  );
  const catalogue = {
    countries: structuredClone(state.tables.countries),
    universities: structuredClone(state.tables.featured_universities),
    programmes: structuredClone(state.tables.programs),
    regions: state.tables.region_groups,
    permissions,
    ready: true,
  };
  await act(async () =>
    root.render(<CatalogueManager kind="programmes" data={catalogue} />),
  );
  await click(
    [...document.querySelectorAll('section[aria-label="Records"] button')].find(
      (element) => element.textContent.includes("Current public programme"),
    ),
  );
  await until(
    () =>
      document.getElementById("academic-title") &&
      !document.getElementById("academic-title").disabled,
    "Academic workflow",
  );
  await fill("academic-title", "Private academic programme");
  await until(
    () => frame()?.body.textContent.includes("Private academic programme"),
    "Actual academic component preview",
  );
  await click(button("Save Draft"));
  await until(
    () =>
      status() === "Draft" &&
      document.getElementById("academic-title")?.value ===
        "Private academic programme",
    "Academic draft save",
  );
  assert.equal(state.tables.programs[0].title, "Current public programme");
  await click(button("Discard Saved Draft"));
  await until(() => status() === "Draft discarded", "Discard draft");
  assert.equal(
    document.getElementById("academic-title").value,
    "Current public programme",
  );
  assert.equal(state.tables.programs[0].title, "Current public programme");
  console.log(
    "PASS: actual React editors with real isolated SQL-backed actions: unsaved/saved/approved/public preview distinction, draft submission/review locking/publication, six-card preservation and saved draft preview, same-document mode changes, desktop/mobile iframe modes, inert public links, academic actual-component preview, private persistence and safe discard. Simulated DOM, not Safari pixel-layout verification.",
  );
} finally {
  await act(async () => root.unmount());
}
