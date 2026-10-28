// Simulated DOM interactions, not a browser/screenshot or pixel-layout check.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { mediaFixture } from "./fixtures/media-fixture.mjs";
import { mediaJiti } from "./run-media-tests.mjs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { JSDOM } = require(process.env.JSDOM_MODULE || "jsdom");
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { url: "http://localhost/admin/programs", pretendToBeVisual: true },
);
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "MutationObserver",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, key, {
    value:
      key === "getComputedStyle"
        ? dom.window[key].bind(dom.window)
        : dom.window[key],
    configurable: true,
    writable: true,
  });
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.FormData = dom.window.FormData;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window,
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.confirm = () => true;
dom.window.confirm = () => true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
dom.window.ResizeObserver = globalThis.ResizeObserver;
const { state } = mediaFixture(),
  server = mediaJiti();
const root = fileURLToPath(new URL("../", import.meta.url));
globalThis.__academicActions = await server.import(
  root + "src/app/admin/cms/academic-actions.ts",
);
const mediaRoute = await server.import(
  root + "src/app/api/admin/media/route.ts",
);
const mediaItem = await server.import(
  root + "src/app/api/admin/media/[id]/route.ts",
);
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(
    typeof input === "string" ? input : input.url,
    "http://localhost",
  );
  assert.equal(url.hostname, "localhost", "No external DOM-test fetch");
  assert(
    url.pathname.startsWith("/api/admin/media"),
    "Only isolated media route requests",
  );
  const id = url.pathname.split("/")[4],
    request = new Request(url, options);
  return id
    ? mediaItem.GET(request, { params: Promise.resolve({ id }) })
    : mediaRoute.GET(request);
};
dom.window.fetch = globalThis.fetch;
const mock = root + "scripts/fixtures/academic-dom-services.mjs",
  mediaMock = root + "scripts/fixtures/homepage-items-dom-services.mjs";
const alias = {
  "@": root + "src",
  "next/navigation": mock,
  "next/link": root + "scripts/fixtures/homepage-items-dom-link.mjs",
  "@/lib/supabase/browser": mediaMock,
};
for (const path of [
  "@/app/admin/cms/academic-actions",
  root + "src/app/admin/cms/academic-actions.ts",
  root + "src/app/admin/cms/academic-actions",
])
  alias[path] = mock;
for (const path of [
  "./media-library.css",
  root + "src/components/admin/media/media-library.css",
])
  alias[path] = mock;
const client = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  alias,
  fsCache: false,
  moduleCache: false,
  tryNative: false,
});
const file = root + "scripts/test-academic-dom.mjs";
try {
  await client.evalModule(readFileSync(file, "utf8"), {
    filename: file,
    async: true,
  });
} finally {
  dom.window.close();
  delete globalThis.__academicActions;
}
