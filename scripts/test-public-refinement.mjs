import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createJiti } from "jiti";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  { JSDOM } = require("jsdom"),
  root = process.cwd();
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "unimondo-footer-defaults-"),
);
try {
  fs.symlinkSync(root + "/node_modules", temp + "/node_modules", "dir");
  const alias = {
    "@": root + "/src",
    "next/image": root + "/scripts/fixtures/homepage-items-dom-elements.mjs",
    "next/link": root + "/scripts/fixtures/homepage-items-dom-link.mjs",
  };
  const jiti = createJiti(import.meta.url, {
    jsx: { runtime: "automatic" },
    alias,
    fsCache: false,
    moduleCache: false,
    tryNative: false,
  });
  const { footerDefaults } = await jiti.import(
      root + "/src/lib/footer/model.ts",
    ),
    { FooterView } = await jiti.import(
      root + "/src/components/footer-view.tsx",
    );
  const summary = {
    headAddressShort: "Existing office address",
    branchAddressShort: "Existing branch address",
    primaryPhone: "+44 (20) 1234-5678",
    emailHello: "hello@example.invalid",
    emailAdmissions: "admissions@example.invalid",
  };
  fs.writeFileSync(
    temp + "/contact.mjs",
    "export async function getContactFooterSummary(){return " +
      JSON.stringify(summary) +
      "}",
  );
  fs.writeFileSync(
    temp + "/footer.tsx",
    execFileSync("git", ["show", "11d82cf:src/components/site-footer.tsx"], {
      encoding: "utf8",
    }),
  );
  const oldJiti = createJiti(import.meta.url, {
    jsx: { runtime: "automatic" },
    alias: { ...alias, "@/lib/data/contact-page": temp + "/contact.mjs" },
    fsCache: false,
    moduleCache: false,
    tryNative: false,
  });
  const { SiteFooter } = await oldJiti.import(temp + "/footer.tsx");
  const old = new JSDOM(renderToStaticMarkup(await SiteFooter())),
    current = new JSDOM(
      renderToStaticMarkup(
        React.createElement(FooterView, { config: footerDefaults(summary) }),
      ),
    );
  assert.equal(
    current.window.document.body.textContent.replace(/\s/g, ""),
    old.window.document.body.textContent.replace(/\s/g, ""),
    "Every existing footer word retained",
  );
  const links = (dom) =>
    [...dom.window.document.querySelectorAll("a")].map((link) => [
      link.textContent.trim(),
      link.getAttribute("href"),
      link.getAttribute("aria-label"),
    ]);
  assert.deepEqual(
    links(current),
    links(old),
    "Every footer destination retained",
  );
  old.window.close();
  current.window.close();
  const linear = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const values = hex
      .match(/[0-9a-f]{2}/gi)
      .map((v) => linear(parseInt(v, 16)));
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  for (const [ink, surface] of [
    ["2F3E46", "F4F3EF"],
    ["2F3E46", "E4F1F7"],
    ["244B50", "F4F3EF"],
    ["244B50", "E4F1F7"],
    ["FFFFFF", "244B50"],
  ]) {
    const a = luminance(ink),
      b = luminance(surface),
      ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert(ratio >= 4.5, ink + " on " + surface + " meets WCAG AA");
  }
  for (const [file, forbidden, tint] of [
    ["home/why-europe.tsx", "bg-[#1A2E3A]/92", "bg-[#244B50]/10"],
    ["home/hero-carousel.tsx", "via-[#1A2E3A]/70", 'slide.overlayOpacity ?? 15'],
    ["about/about-page-view.tsx", "via-[#1A2E3A]/95", "bg-[#244B50]/10"],
    ["contact/contact-page-shell.tsx", "from-[#1A2E3A]/98", "bg-[#244B50]/15"],
  ]) {
    const source = fs.readFileSync(root + "/src/components/" + file, "utf8");
    assert(!source.includes(forbidden));
    assert(source.includes(tint));
  }
  console.log(
    "PASS: exact inherited footer text and link preservation, approved palette WCAG AA contrast, and section-specific photo tints. No records/storage accessed.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
