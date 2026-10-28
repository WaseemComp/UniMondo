import React, { act } from "react";
import { createRoot } from "react-dom/client";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CatalogueManager } from "../src/components/admin/academic/catalogue-manager.tsx";
const state = globalThis.__mediaTest,
  tables = state.tables,
  stamp = "2026-10-27T00:00:00.000Z";
const country = {
  id: randomUUID(),
  updated_at: stamp,
  name: "Italy",
  slug: "italy",
  region_group_id: 1,
  is_published: true,
  why_study_there: "Existing country guidance",
  living_cost_approx: "Existing costs",
  visa_info: "Existing visa guidance",
  catalogue: {},
  destination_guide: {},
};
const university = {
  id: randomUUID(),
  updated_at: stamp,
  name: "Existing university",
  country: "Italy",
  country_id: country.id,
  is_published: true,
  hero_image_url:
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
  profile: {},
  programs: [],
};
const programme = {
  id: "existing-stable-programme",
  updated_at: stamp,
  title: "Existing programme",
  country: "Italy",
  university: university.name,
  university_id: university.id,
  is_published: true,
  degree: "master",
  deadline: "2027-06-01",
  details: {},
};
tables.region_groups.push({ id: 1, label: "Southern Europe" });
tables.countries.push(country);
tables.featured_universities.push(university);
tables.programs.push(programme);
const permissions = Object.fromEntries(
  ["countries", "universities", "programmes"].map((kind) => [
    kind,
    Object.fromEntries(
      ["view", "create", "edit", "delete", "publish"].map((key) => [key, true]),
    ),
  ]),
);
const data = () => ({
  countries: structuredClone(tables.countries),
  universities: structuredClone(tables.featured_universities),
  programmes: structuredClone(tables.programs),
  regions: tables.region_groups,
  ready: true,
  permissions,
});
const root = createRoot(document.getElementById("root"));
let kind = "programmes";
const settle = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
const render = async (next = kind) => {
  kind = next;
  await act(async () =>
    root.render(<CatalogueManager key={kind} kind={kind} data={data()} />),
  );
  await settle();
};
const button = (label) => {
  const matches = [...document.querySelectorAll("button")].filter(
    (e) => e.textContent.trim() === label,
  );
  assert.equal(matches.length, 1, "Unique button " + label);
  return matches[0];
};
const click = async (element) => {
  assert(element);
  assert(!element.disabled, "Enabled control " + element.textContent);
  await act(async () => element.click());
  await settle();
};
const openRecord = async (name) =>
  click(
    [...document.querySelectorAll('section[aria-label="Records"] button')].find(
      (e) => e.textContent.includes(name),
    ),
  );
const fill = async (id, value) => {
  const element = document.getElementById(id);
  assert(element, "Field " + id);
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
try {
  await render();
  await openRecord("Existing programme");
  assert.equal(
    document.getElementById("academic-title").value,
    "Existing programme",
  );
  assert(!document.getElementById("academic-title").disabled);
  await fill("academic-title", "Edited unsaved programme");
  assert.equal(programme.title, "Existing programme", "Typing never persists");
  assert(document.body.textContent.includes("Unsaved changes"));
  await click(button("Discard"));
  assert.equal(
    document.getElementById("academic-title").value,
    "Existing programme",
  );
  await fill("academic-title", "Edited approved programme");
  await fill("academic-details.teaching_language", "English (confirmed)");
  await click(button("Save changes"));
  assert.equal(programme.title, "Edited approved programme");
  assert.equal(programme.details.teaching_language, "English (confirmed)");
  assert(document.body.textContent.includes("Saved record"));
  await fill("academic-details.official_url", "javascript:alert(1)");
  await click(button("Save changes"));
  assert(document.querySelector('[role="alert"]'));
  assert.equal(programme.details.official_url, undefined);
  await click(button("Discard"));
  await click(button("Archive"));
  assert(programme.archived_at);
  assert.equal(programme.is_published, false);
  await click(button("Restore as hidden"));
  assert.equal(programme.archived_at, null);
  assert.equal(programme.is_published, false);
  await render("countries");
  await openRecord("Italy");
  assert.equal(
    document.getElementById("academic-why_study").value,
    "Existing country guidance",
  );
  assert.equal(
    document.getElementById("academic-living_cost").value,
    "Existing costs",
  );
  assert(
    document.getElementById("academic-slug").disabled,
    "Stable public address is protected",
  );
  await fill("academic-description", "Approved destination description");
  await click(button("Save changes"));
  assert.equal(country.description, "Approved destination description");
  await render("universities");
  await openRecord("Existing university");
  await fill("academic-profile.location", "Approved city");
  await click(button("Save changes"));
  assert.equal(university.profile.location, "Approved city");
  await click(document.getElementById("academic-hero_image_url"));
  await settle();
  const image = document.querySelector(".ml-image-card");
  assert(image, "Existing images in shared Media Library");
  await click(image);
  await click(button("Use this image"));
  assert(
    document.querySelector('section[aria-label="Record editor"] img'),
    "Selected image preview renders",
  );
  // Mode checks are structural/responsive class checks only, not browser layout QA.
  for (const width of [390, 1440]) {
    Object.defineProperty(window, "innerWidth", {
      value: width,
      configurable: true,
    });
    assert(
      document.querySelector(
        ".xl\\:grid-cols-\\[minmax\\(280px\\,0\\.8fr\\)_minmax\\(0\\,1\\.5fr\\)\\]",
      ),
    );
    assert(document.querySelectorAll("label").length > 8);
  }
  const viewOnly = structuredClone(permissions);
  for (const grant of Object.values(viewOnly))
    for (const key of ["create", "edit", "publish", "delete"])
      grant[key] = false;
  await act(async () =>
    root.render(
      <CatalogueManager
        key="readonly"
        kind="programmes"
        data={{ ...data(), permissions: viewOnly }}
      />,
    ),
  );
  await settle();
  await openRecord(programme.title);
  assert(document.getElementById("academic-title").disabled);
  assert(
    ![...document.querySelectorAll("button")].some(
      (e) => e.textContent === "Add programme",
    ),
  );
  assert(button("Save changes").disabled);
  console.log(
    "PASS: rendered React catalogue forms load effective legacy content, update private draft state, save through real isolated actions, discard, validate links, archive/restore without deletion, protect stable addresses, edit all three record kinds, select from shared Media Library, and disable view-only controls. Responsive classes checked at desktop/mobile dimensions; no pixel-layout/browser claim.",
  );
} finally {
  await act(async () => root.unmount());
}
