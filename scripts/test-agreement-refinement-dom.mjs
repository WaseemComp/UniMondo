import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
const dom = new JSDOM('<div id="root"></div>', {
  url: "https://isolated.invalid/admin/agreements/new",
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "Event",
  "MouseEvent",
  "BeforeUnloadEvent",
  "PopStateEvent",
])
  globalThis[key] = dom.window[key];
globalThis.self = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react"),
  { act } = React,
  { createRoot } = await import("react-dom/client");
const { AgreementForm } =
  await import("../src/components/admin/agreements/agreement-form.tsx");
const { calculateAgreementFinancials } =
  await import("../src/lib/agreements/financials.ts");
const { STANDARD_CLAUSES } = await import("../src/lib/agreements/clauses.ts");
const initial = {
  id: "qa-dom",
  templateVersion: "4.0",
  referenceNumber: "UM/QA/DOM",
  version: 1,
  status: "draft",
  consultantEntityName: "QA Consultancy",
  consultantRegNumber: "QA REG",
  consultantAddress: "QA office",
  studentFullName: "QA Student",
  studentParentGuardian: "",
  studentCnicPassport: "QA ID",
  studentAddress: "",
  studentEmail: "",
  studentPhone: "",
  degreeLevel: "QA degree",
  fieldOfStudy: "QA field",
  preferredDestination: "Italy",
  academicYearIntake: "2027",
  repName: "QA Representative",
  repDesignation: "Manager",
  agreementDate: "2026-10-28",
  repDate: "2026-10-28",
  studentSignatureDate: "2026-10-28",
  createdAt: "",
  updatedAt: "",
  financials: calculateAgreementFinancials({
    paymentCurrency: "EUR",
    discountType: "percentage",
    discountValue: 0,
  }),
};
let writes = 0,
  confirmed = true;
window.confirm = () => confirmed;
globalThis.fetch = async (_url, options) => {
  writes++;
  const body = JSON.parse(options.body);
  assert.equal(body.templateVersion, "4.0");
  return new Response(
    JSON.stringify({
      agreement: {
        ...initial,
        ...body,
        version: initial.version + writes,
        financials: initial.financials,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
const root = createRoot(document.getElementById("root"));
const render = async (canEdit = true) =>
  act(async () =>
    root.render(
      React.createElement(AgreementForm, {
        key: String(canEdit),
        initialData: initial,
        canEditDiscount: canEdit,
        canEditProtectedClauses: canEdit,
        representativeName: "QA Rep",
        representativeDesignation: "QA Role",
      }),
    ),
  );
const button = (text) => {
  const b = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text,
  );
  assert(b, text);
  return b;
};
const click = async (text) => act(async () => button(text).click());
const fill = async (el, value) => {
  assert(el);
  await act(async () => {
    const prototype =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};
await render();
assert.equal(document.querySelectorAll('[role="tab"]').length, 3);
assert(!document.querySelector('input[type="email"],input[type="tel"]'));
await fill(document.getElementById("agreement-field-7"), "QA Changed Student");
await click("Live Preview");
assert(!document.getElementById("agreement-preview").hidden);
assert(
  document
    .querySelector(".agreement-document")
    .textContent.includes("QA Changed Student"),
);
assert.equal(writes, 0);
await click("Edit Clauses");
assert.equal(document.querySelectorAll("details").length, 8);
const textareas = [...document.querySelectorAll("textarea")];
const scope = textareas.find(
  (t) => t.value === STANDARD_CLAUSES[1].paragraphs[0].text,
);
await fill(scope, scope.value + " QA clause addition.");
assert(
  document
    .querySelector(".agreement-document")
    .textContent.includes("QA clause addition."),
);
await click("Discard Changes");
assert(
  !document
    .querySelector(".agreement-document")
    .textContent.includes("QA clause addition."),
);
assert.equal(
  document.getElementById("agreement-field-7").value,
  initial.studentFullName,
);
await click("Edit Clauses");
await fill(
  [...document.querySelectorAll("textarea")].find(
    (t) => t.value === STANDARD_CLAUSES[1].paragraphs[0].text,
  ),
  STANDARD_CLAUSES[1].paragraphs[0].text + " QA saved clause.",
);
await click("Save Agreement Draft");
assert.equal(writes, 1);
await click("Edit Clauses");
assert(
  [...document.querySelectorAll("textarea")].some((t) =>
    t.value.includes("QA saved clause."),
  ),
);
await click("Restore Standard Wording");
assert(
  ![...document.querySelectorAll("textarea")].some((t) =>
    t.value.includes("QA saved clause."),
  ),
);
await render(false);
await click("Edit Clauses");
const restricted = [...document.querySelectorAll("details")].filter((d) =>
  /^[345]\./.test(d.querySelector("summary").textContent),
);
assert.equal(restricted.length, 3);
for (const d of restricted) assert(d.querySelector("fieldset").disabled);
await act(async () => root.unmount());
dom.window.close();
console.log(
  "PASS: rendered Agreement form tabs, all eight clause editors, unsaved preview updates, explicit save, discard, restore, hidden contact fields and restricted sections. Isolated DOM/fetch only; no browser or production writes.",
);
