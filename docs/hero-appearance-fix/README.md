# Hero appearance controls — local correction

Branch: `codex/hero-appearance-controls-fix`, created from production `origin/main` at `2f634b8` (PR #10). The owner has authorized the correction to be committed and pushed for a Pull Request and Vercel Preview. Merge, production deployment, publishing activation and production data changes remain prohibited.

## Confirmed causes

1. A read-only production metadata check found `cms_publishing_settings.enabled=false` and the `home/hero_slides` workflow in `approved` status. Approval deliberately locks private saves. The editor incorrectly reused that save lock for the entire appearance fieldset, preventing even local preview experiments by an authorized Superadmin. The disabled publishing switch itself does **not** disable private drafting or review.
2. The iframe's animation workaround used `[style*="opacity: 0"] { opacity: 1 !important; ... }`. This matches `opacity: 0.15` as well as zero. The production-source browser reproduction measured inline opacity `0.15` and computed opacity `1`, explaining the solid teal preview.
3. Existing-slide saves prepared the appearance patch but omitted it when calling `saveHomeHeroSlide`. Its schema and writer also omitted those fields. A private save therefore failed its confirmation check. New/built-in slide insertion followed a different path, which explains why earlier built-in-only tests missed this defect.
4. Missing `textMode` values bypassed the existing readable text backing even though the editor displayed the default Dark selection. The public renderer and local preview now both use that default consistently.

Controlled input state was connected to the in-memory preview. Pointer blocking in the iframe is intentionally confined to preview links/forms; it does not cover the external editing controls. Existing server permission checks and review locks remain enforced.

## Corrected behavior

- Authorized slide editors can adjust local appearance while an approved or in-review version remains locked against saves. An adjacent notice explains the preview-only state. Discard local changes before using the existing workflow actions; an approved version must return to Draft before saving.
- The explicit Published Version view is read-only and labelled Published appearance. Saved private drafts, approved but unpublished drafts, in-review drafts and unsaved previews have distinct labels.
- Missing workflow setup allows local appearance experiments when the original published snapshot and edit grant are available. Save Draft remains disabled with an explicit explanation. No fallback writes to public tables are introduced.
- Publishing disabled: private drafting and review continue; Publish stays disabled. This fix never activates publishing.
- Brightness and contrast remain independent image filters. Overlay colour/opacity remain on a separate layer, below fully opaque text/buttons. Preview animation handling excludes intentional overlay opacity, including zero.
- Defaults remain 15% teal overlay, 100% brightness and 100% contrast. Missing text appearance gets readable dark text with local white backing, leaving the photograph visible. Explicit saved values remain authoritative.
- The colour control offers the native chooser, clickable colour presets and an accessible hex field. Incomplete/invalid hex input is explained and never applied to the preview.
- Appearance fields now pass through validation and persistence for existing slides. Locale objects and unrelated stored settings are retained.

## Changed files

- `src/components/admin/homepage/homepage-editor.tsx`: separate local appearance access from private-save eligibility, explain locks and label preview sources.
- `src/components/admin/homepage/hero-appearance-controls.tsx`: controlled native sliders, colour input, preset palette and hex entry.
- `src/components/admin/homepage/homepage-editor.css`: usable slider/colour targets and preset/focus presentation, scoped to appearance controls.
- `src/components/admin/homepage/homepage-preview.tsx`: respect overlay opacity while suppressing motion, and show source labels in normal/expanded preview.
- `src/components/home/hero-carousel.tsx`: consistent default text backing, shared appearance defaults and explicit image/overlay/content layer markers.
- `src/app/admin/cms/homepage-editor-actions.ts`: forward changed appearance fields for existing slides.
- `src/app/admin/cms/home-page-blocks-actions.ts`: accept, validate and preserve appearance fields in the existing private planning path.
- `scripts/test-hero-appearance-browser.mjs`: real Chromium interactions against actual server actions and isolated Phase 06 PostgreSQL.
- `package.json`: add `test:hero:browser` command.
- This report.

## Verification

The browser harness does not load `.env.local`. It uses an isolated PGlite PostgreSQL instance, the real migration, actual Supabase SDK and actual server actions. Browser requests outside localhost and fixture database requests outside the synthetic transport are rejected. Publication is never activated or attempted by this harness.

Run after `npm run build`:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright npm run test:hero:browser
```

If Playwright is installed in the project's runtime, omit `PLAYWRIGHT_MODULE`. `--baseline` runs the production-source diagnostic through `git show origin/main`; it does not change workspace files. `HERO_QA_IMAGE=/absolute/path/to/photo.jpg` optionally supplies a local photograph for visual review; otherwise a generated landscape fixture is used.

Browser coverage includes pointer drags and Home/End/arrow keyboard input for every slider in desktop/mobile preview modes; colour preset clicks and hex entry through keyboard input; computed 0%, 1%, fractional and 100% overlay opacity; independent image filters; text/button opacity and text backing; private existing-slide save and reload; translated/unknown-setting retention; draft/published switching; approved/in-review locks; disabled publishing; view-only staff; unavailable workflow; and a 390px-wide editor. It checks that the public slide rows never change.

Native OS colour-dialog selection is not automated; real pointer/keyboard colour selection is covered through the integrated preset palette and hex field. Browser verification is Chromium, not a claim of a Safari run.

Additional checks: `test:post-launch:dom`, `test:publishing:dom`, `test:post-launch`, `test:publishing`, `test:homepage`, `test:homepage:defaults`, focused ESLint, TypeScript, production build and Git whitespace validation.

Local screenshots are in `output/hero-appearance/`. The photograph used for optional visual review is the existing built-in public hero image; it is never uploaded or written to CMS storage.

## Safety

Only read-only production metadata/settings/snapshot requests were made during investigation. No production records, saved hero settings, storage objects, permissions or publishing settings were changed. No migrations were applied to production. Agreements, Applications, currencies and other CMS module code were not modified. The initial local investigation performed no commit, push, PR, merge or deployment. Subsequent owner authorization covers the feature-branch commit, push, Pull Request and Vercel Preview only. Treat Preview as production-connected: assistant verification must remain read-only, with no saves, uploads, workflow transitions or publishing actions against the Preview environment.
