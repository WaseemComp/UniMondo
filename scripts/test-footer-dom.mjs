import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { FooterEditor } from "../src/components/admin/footer/footer-editor.tsx";
import { footerDefaults } from "../src/lib/footer/model.ts";
const { state } = globalThis.__publishingFixture;
state.super = true;
state.tables.contact_offices.push({id:"existing-office",office_type:"head",title:"Existing office",address_lines:"Existing public office",phones:[{number:"+44 20 1234 5678",kind:"landline"}],emails:[{email:"hello@example.invalid"},{email:"admissions@example.invalid"}],social_links:[],sort_order:0});

const defaults = footerDefaults({
  headAddressShort: "Existing public office",
  branchAddressShort: null,
  primaryPhone: "+44 20 1234 5678",
  emailHello: "hello@example.invalid",
  emailAdmissions: "admissions@example.invalid",
});
const root = createRoot(document.getElementById("root"));
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
async function until(predicate, label) {
  for (let i = 0; i < 120; i++) {
    await settle();
    if (predicate()) return;
  }
  assert.fail(
    "Timed out: " + label + " " + document.body.textContent.slice(0, 600),
  );
}
const button = (text) => {
  const result = [...document.querySelectorAll("button")].find(
    (node) => node.textContent.replace(/\s+/g, " ").trim() === text,
  );
  assert(result, "Button " + text);
  return result;
};
const click = async (element) => {
  assert(element && !element.disabled);
  await act(async () => element.click());
  await settle();
};
const field = (label) => {
  const match = [...document.querySelectorAll(".ft-field")].find(
    (node) => node.querySelector("span")?.textContent === label,
  );
  assert(match, label);
  return match.querySelector("input,textarea,select");
};
async function fill(element, value) {
  await act(async () => {
    const proto =
      element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await settle();
}
const frame = () =>
  document.querySelector(".hp-preview-panel iframe")?.contentDocument;
const status = () =>
  document.querySelector(
    '[aria-label="Content publishing workflow"] [role="status"]',
  )?.textContent;
try {
  await act(async () => root.render(<FooterEditor defaults={defaults} />));
  await until(
    () =>
      document.querySelector("fieldset") &&
      !document.querySelector("fieldset").disabled &&
      frame()?.querySelector("footer"),
    "Initial effective footer",
  );
  assert.equal(field("Company description").value, defaults.description);
  await fill(field("Company description"), "Unsaved footer description");
  await until(
    () => frame()?.body.textContent.includes("Unsaved footer description"),
    "Immediate real-component preview",
  );
  assert.equal(state.tables.cms_content_blocks.length, 0);
  const unload = new window.Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  assert(unload.defaultPrevented, "Unsaved navigation warns");
  await click(button("Discard unsaved changes"));
  assert.equal(field("Company description").value, defaults.description);
  await click(button("Navigation"));
  await fill(field("Link text"), "Revised destination label");
  await until(
    () => frame()?.body.textContent.includes("Revised destination label"),
    "Footer navigation preview",
  );
  await click(button("Contact"));
  await fill(field("Contact information"), "Revised public office address");
  await until(() => frame()?.body.textContent.includes("Revised public office address"), "Contact preview");
  assert.equal(state.tables.contact_offices[0].address_lines, "Existing public office");
  await click(button("Social links"));
  await fill(field("Accessible link name"), "Approved LinkedIn label");
  await until(() => frame()?.querySelector('a[aria-label="Approved LinkedIn label"]'), "Social icon accessible name");
  await click(button("Bottom notices"));
  await fill(field("Copyright line"), "© {year} UniMondo. Edited copyright.");
  await fill(field("Notice or disclaimer"), "Revised footer notice");
  await until(() => frame()?.body.textContent.includes("Revised footer notice"), "Bottom notice preview");
  await click(button("Sections"));
  const visible = [...document.querySelectorAll(".ft-field")].find(label => label.textContent.includes("Show footer after publication")).querySelector("input");
  await click(visible);
  assert(document.body.textContent.includes("This footer is hidden."));
  await click(visible);
  await click(document.querySelector('[aria-label="Move Footer sections item 2 up"]'));
  await until(() => frame()?.querySelector('footer > div > div')?.querySelector('h3')?.textContent === "Explore", "Section reordering");
  await click(button("Branding"));
  await fill(field("Company description"), "Private footer description");
  await click(button("Change branding image"));
  await until(
    () => document.querySelector(".ml-image-card"),
    "Existing Media Library images",
  );
  await click(document.querySelector(".ml-image-card"));
  await click(button("Use this image"));
  await until(
    () => frame()?.querySelector("footer img"),
    "Selected branding image preview",
  );
  assert.equal(state.tables.cms_content_blocks.length, 0);
  await click(button("Save Draft"));
  await until(
    () => status() === "Draft" && !document.querySelector("fieldset").disabled,
    "Private save",
  );
  assert.equal(state.tables.cms_content_blocks.length, 0);
  await click(button("View Published Version"));
  await until(
    () => frame()?.body.textContent.includes(defaults.description),
    "Published footer comparison",
  );
  assert(!frame().body.textContent.includes("Private footer description"));
  await click(button("View Draft Preview"));
  await until(
    () => frame()?.body.textContent.includes("Private footer description"),
    "Saved draft preview",
  );
  assert.equal(document.querySelector(".hp-preview-panel iframe").getAttribute("title"), "Desktop Footer preview");
  assert.equal(document.querySelector(".hp-preview-panel iframe").tabIndex, 0);
  await click(button("Mobile"));
  assert.equal(
    document.querySelector(".hp-preview-panel iframe").style.width,
    "390px",
  );
  await click(button("Desktop"));
  assert.equal(
    document.querySelector(".hp-preview-panel iframe").style.width,
    "1120px",
  );
  const anchor = frame().querySelector("a");
  const event = new (frame().defaultView.MouseEvent)("click", {
    bubbles: true,
    cancelable: true,
  });
  anchor.dispatchEvent(event);
  assert(event.defaultPrevented, "Preview navigation is inert");
  await click(button("Submit for Review"));
  await until(() => status() === "In Review", "Review");
  assert(document.querySelector("fieldset").disabled);
  await click(button("Approve"));
  await until(() => status() === "Approved", "Approval");
  await click(button("Publish"));
  await until(() => status() === "Published", "Publication");
  assert.equal(
    state.tables.cms_content_blocks[0].content.footer.description,
    "Private footer description",
  );
  await act(async () => root.unmount());
  state.super = false;
  state.fine = { "home.view": true };
  const viewer = createRoot(document.getElementById("root"));
  await act(async () => viewer.render(<FooterEditor defaults={defaults} />));
  await until(() => document.querySelector("fieldset"), "View-only footer");
  assert(document.querySelector("fieldset").disabled);
  assert(button("Save Draft").disabled);
  await act(async () => viewer.unmount());
  console.log(
    "PASS: actual footer form/rendering, effective values, unsaved preview/discard/warning, navigation edits, existing Media Library selection, private save/live comparison, desktop/mobile frame modes, inert links, review locks/publication and view-only controls. Simulated DOM; Safari pixel QA unavailable.",
  );
} finally {
  if (document.getElementById("root")?.childNodes.length)
    await act(async () => root.unmount());
}
