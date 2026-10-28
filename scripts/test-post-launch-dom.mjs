import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { randomUUID } from "node:crypto";
import { HomepageEditor } from "../src/components/admin/homepage/homepage-editor.tsx";
import { PriceCatalogueManager } from "../src/components/admin/catalogue/price-catalogue-manager.tsx";
import { RegionsManager } from "../src/components/admin/cms/regions-manager.tsx";
import { AdminProfileForm } from "../src/components/admin/admin-profile-form.tsx";
import { AdminChangePasswordForm } from "../src/components/admin/admin-change-password-form.tsx";
const { state, db } = globalThis.__publishingFixture;
state.super = true;
const course = randomUUID(),
  country = randomUUID();
state.tables.language_courses.push({
  id: course,
  title: { en: "Existing QA language course" },
  description: { en: "Saved course" },
  price: 100,
  currency_code: "USD",
  source_key: null,
  is_active: true,
  sort_order: 0,
  archived_at: null,
});
state.tables.region_groups.push({
  id: 1,
  label: "Existing region",
  continent: "Europe",
  is_published: true,
  sort_order: 0,
  archived_at: null,
});
state.tables.countries.push({
  id: country,
  name: "QA country",
  slug: "qa-country",
  region_group_id: 1,
  sort_order: 0,
  is_published: true,
});
await state.sync();
const root = createRoot(document.getElementById("root"));
const settle = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, 35)));
const until = async (fn, label) => {
  for (let i = 0; i < 100; i++) {
    await settle();
    if (fn()) return;
  }
  assert.fail(label);
};
const render = async (element) => {
  await act(async () => root.render(element));
  await settle();
};
const button = (text) => {
  const b = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text,
  );
  assert(b, "Button " + text);
  return b;
};
const click = async (text) => {
  const b = button(text);
  assert(!b.disabled, "Enabled " + text);
  await act(async () => b.click());
  await settle();
};
const fill = async (el, value) => {
  assert(el);
  await act(async () => {
    const proto =
      el.tagName === "SELECT"
        ? window.HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(
      new window.Event(el.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
  await settle();
};
const byLabel = (text) =>
  [...document.querySelectorAll("label")]
    .find((l) => l.textContent.trim().startsWith(text))
    ?.querySelector("input,select,textarea");
const frame = () =>
  document.querySelector(".hp-preview-panel iframe")?.contentDocument;
const data = {
  available: true,
  site: {},
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
    editStats: true,
    viewStats: true,
    storyView: true,
    storyCreate: true,
    storyEdit: true,
    storyPublish: true,
    storyArchive: true,
  },
};
try {
  await render(<HomepageEditor initial={data} />);
  await until(
    () => byLabel("Overlay opacity") && !byLabel("Overlay opacity").disabled,
    "Hero appearance controls",
  );
  await fill(byLabel("Image brightness"), "130");
  await fill(byLabel("Image contrast"), "75");
  await fill(byLabel("Overlay opacity"), "45");
  await fill(byLabel("Text colour"), "light");
  await until(
    () =>
      frame()?.querySelector("img")?.style.filter.includes("brightness(130%)"),
    "Live image filter",
  );
  assert(frame().querySelector("img").style.filter.includes("contrast(75%)"));
  assert(!frame().querySelector(".um-hero-copy").style.filter);
  assert(frame().querySelector("h1 span").style.color === "rgb(255, 255, 255)");
  await click("Mobile");
  await until(
    () =>
      frame()?.querySelector("img")?.style.filter.includes("brightness(130%)"),
    "Mobile preview retains controls",
  );
  await click("Desktop");
  assert.equal(
    state.tables.cms_content_blocks.filter(
      (r) => r.section_key === "hero_slider",
    ).length,
    0,
    "Preview changes must not save",
  );
  await click("Save Draft");
  await until(
    () => document.body.textContent.includes("Draft"),
    "Hero draft saved",
  );
  assert.equal(
    state.tables.cms_content_blocks.filter(
      (r) => r.section_key === "hero_slider",
    ).length,
    0,
    "Draft remains private",
  );
  const grants = {
    view: true,
    edit: true,
    create: true,
    delete: true,
    publish: true,
  };
  await render(
    <PriceCatalogueManager
      kind="courses"
      initialRecord={course}
      rows={state.tables.language_courses}
      defaults={[]}
      currencies={state.tables.cms_currencies}
      ready
      grants={grants}
    />,
  );
  await until(
    () => byLabel("Course title") && !byLabel("Course title").disabled,
    "Existing course editor",
  );
  assert.equal(byLabel("Course title").value, "Existing QA language course");
  await fill(byLabel("Currency"), "EUR");
  await click("Save Draft");
  await until(
    () => document.body.textContent.includes("Confirm the currency"),
    "Currency confirmation error",
  );
  const confirmBox = byLabel("I verified");
  await act(async () => confirmBox.click());
  await click("Save Draft");
  await until(
    () => document.body.textContent.includes("Private draft saved"),
    "Currency draft save",
  );
  assert.equal(state.tables.language_courses[0].currency_code, "USD");
  await render(<RegionsManager grants={grants} />);
  await until(
    () => byLabel("Region name") && !byLabel("Region name").disabled,
    "Regions editor",
  );
  assert.equal(byLabel("Region name").value, "Existing region");
  await fill(byLabel("Region name"), "QA renamed region");
  await click("Save Draft");
  await until(
    () => document.body.textContent.includes("Private region draft saved"),
    "Regions private save",
  );
  assert.equal(state.tables.region_groups[0].label, "Existing region");
  const updates = [];
  globalThis.__profileBrowser = {
    auth: {
      updateUser: async (value) => {
        updates.push(value);
        return { data: { user: {} }, error: null };
      },
    },
  };
  await render(<AdminProfileForm displayName="Assigned QA Name" />);
  await fill(byLabel("Full / display name"), "My QA Display");
  await act(async () =>
    document
      .querySelector("form")
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  await until(() => updates.length === 1, "Profile update");
  assert.deepEqual(updates[0], { data: { display_name: "My QA Display" } });
  await render(<AdminChangePasswordForm />);
  const synthetic = "QA-only-Aa9!" + randomUUID();
  await fill(document.getElementById("newp"), synthetic);
  await fill(document.getElementById("newp2"), synthetic);
  await act(async () =>
    document
      .querySelector("form")
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  await until(() => updates.length === 2, "Own password update");
  assert.deepEqual(Object.keys(updates[1]), ["password"]);
  assert.equal(updates[1].password, synthetic);
  assert.equal(document.getElementById("newp").value, "");
  assert.equal(
    (await db.query("select enabled from cms_publishing_settings")).rows[0]
      .enabled,
    false,
  );
  console.log(
    "PASS: rendered hero colour/brightness/contrast controls and instant desktop/mobile preview; private course currency confirmation/save; region editing/private save; own display-name/password payloads and cleared password fields. All writes isolated; publishing remains disabled.",
  );
} finally {
  await act(async () => root.unmount());
  delete globalThis.__profileBrowser;
}
