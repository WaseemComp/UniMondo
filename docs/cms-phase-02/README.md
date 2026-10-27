# UniMondo CMS 2.0 — Phase 02

Implemented on `codex/cms-phase-02-homepage-editor`, starting from merged Phase 01 production commit `8a635fafcde00794dfac333ed857d63018384e12`. Phase 01 PR #2 was verified as merged before branching. The workspace was clean at preflight; no existing work was reset or discarded.

**Release boundary:** the feature branch is authorized for commit, pull request and Vercel Preview review. Merging to main and production deployment require separate authorization. No production records, accounts, credentials, permissions, schema, RLS, environment variables or storage configuration were modified. No migration is required. Automated save verification uses isolated transports only; no save action is invoked against the deployed Preview or production Supabase. Phase 03 has not started.

## Working editor

`/admin/home` now contains the section navigation, editing controls and live public-component preview. `/admin/content/home` redirects to this one editor, keeping old links compatible.

Sections: Hero & Main Banner, Marketing Announcement, Why UniMondo, Popular Destinations, Featured Universities & Programs, Success Stories, How It Works, Why Study in Europe, and Final Call to Action. Existing detailed view/edit permissions govern available controls, including the dedicated hero-slide and final-section permissions.

Hero controls distinguish global copy from each saved slide’s overrides. They show the current introductory label, headline, paragraph, button text/destinations, image, image description, caption, visibility and saved slide position. Inheritance has an explicit “Use global copy” control; inherited inputs display their actual effective values. The global preview explains when a slide override takes priority.

Desktop and Mobile previews render the actual public components in an isolated iframe, with their real viewport breakpoints, public fonts and styling. Editing updates the preview without a refresh. Expand preview and small-screen Preview/Back to editing controls are functional. Preview links and application controls cannot navigate or submit.

Save uses the existing `site_content`, `cms_content_blocks` and server-action workflows. It immediately affects the public content after website refresh/revalidation; there is no invented draft or publish system. Unsaved state is clearly marked. Section/slide switches and navigation warn before discarding edits; Discard changes is explicit. Blank/invalid fields cannot be saved. Existing update timestamps detect stale section/slide edits; global saves compare changed source values. Successful saves read back the persisted values before showing confirmation.

The existing write actions now derive homepage permissions from the target section rather than trusting a submitted permission name, and scope row updates to the intended page/section/block. Permission keys and assignments remain unchanged. The global-copy save accepts only the supported homepage keys and uses one upsert batch. Unknown content/media properties and non-English translations are preserved.

## Effective content examples

- **Default:** when no hero headline is saved, the field and preview show the existing “Your Future Knows No Borders” default, with a Default value label.
- **Saved:** an existing `home.hero.cta_apply` value appears as the secondary button text with a Saved value label. Saving an explicit default creates/updates that canonical key; it does not create a duplicate field.
- **Inherited:** a slide without its own headline displays the effective global headline, marked Inherited value. Turning off inheritance creates an explicit slide override; turning it on removes only the English override while retaining other languages.
- **Existing empty records:** blank fields previously written by older forms continue to use the website defaults. Editing another field does not overwrite those defaults with blanks or force unrelated changes.
- **Legacy Europe behavior:** the existing no-copy and partial-copy defaults differ. Both are preserved, including label-only records that the previous public renderer ignored. A first explicit save retains the currently displayed untouched text.
- **Built-in carousel:** if no saved slides exist, all five source slides are visible in the editor. The first authorized slide save atomically makes those same five slides editable, retaining all other images/captions. Both existing create-slide and edit-slide permissions are required. Later saves update those records; repeated fallback materialization is rejected. When all saved slides are hidden, the existing built-in fallback remains, and the UI explains it.

Dashboard recent-content labels now map identifiers such as `home.ticker.enabled` and `home.hero.cta_apply` to “News ticker visibility” and “Hero secondary button text”. Stored keys were not renamed and no label migration was run.

## Boundaries and limitations

- Text introductions/headings and supported links are editable. Existing benefit cards, process steps, destination cards, academic records and testimonial records remain in their existing structures. No testimonial or academic management system was built here.
- The Success Stories section is public only when published stories exist; the preview explains the empty condition. This editor adds header editing and does not create sample testimonials.
- Slide ordering uses the existing numeric positions and uniqueness constraint. There is no drag-and-drop, slide deletion or new independent slide-management system.
- Existing image thumbnails and an existing-image chooser are available. No computer upload or new media storage backend was implemented. New image addresses must match the website’s existing supported image sources; configuration is unchanged.
- No complete publishing/revision workflow was added. Save/preview messaging reflects the current immediate-save behavior. Full drafts and publishing remain Phase 06.
- Persistence and authenticated staff scenarios were tested using isolated synthetic records and sessions. No live existing account login, production content save or real student data was used.

## Verification

Passed:

- `npx tsc --noEmit`; `npm run build` including production TypeScript and all existing routes.
- ESLint on all changed/new TS, TSX and test files; `git diff --check`.
- `npm run test:homepage`: effective values, locale/fallback handling, legacy empty records, real SDK with isolated transport, canonical saves/read-back, invalid/empty fields, valid destinations, missing sessions, view-only access, fixed section permissions, scoped target IDs, stale edits, five-slide first save, repeated-save prevention, visibility/order, preserved translations/media and service failure handling.
- `npm run test:cms`, `npm run test:staff`, `npm run test:agreements`, `npm run test:agreements:standardization`.
- Browser tests of the actual homepage editor/public components with synthetic CMS records: default/saved/inherited labels, immediate form/preview synchronization, slide override precedence, actual desktop/mobile breakpoints and isolated public typography, exact save payloads, blank/invalid input, inherited copy, captions, visibility, all nine sections, failed saves retaining unsaved state, cancelled navigation retaining edits, expanded preview, read-only/unavailable states and desktop/tablet/mobile/narrow layouts without page-level overflow.
- Existing Applications, Agreements, Settings, Detailed modal, password screen and CMS navigation browser regression checks.
- Built-server unauthenticated checks for Homepage, legacy home URL, Overview, Applications, Agreements, Settings and existing APIs; existing login renders normally. No credentials submitted.
- Public component default markup compared with production baseline for all nine sections, plus the existing partial-copy Europe case. Markup/classes/default content match (identical lightweight Next image/link adapters were used in this isolated SSR comparison).
- No changes to authentication libraries, permissions definitions/assignments, student application implementations, staff account implementations, Agreement calculations/generation/revisions, Supabase files, public theme CSS or Next/Vercel configuration.

Screenshots are QA fixtures using synthetic CMS records/edited text and existing website images, not production account or student information:

- [Desktop hero editor](screenshots/desktop-hero.png)
- [Desktop slide overrides](screenshots/desktop-slide.png)
- [Mobile hero editor](screenshots/mobile-hero.png)
- [Mobile destinations editor](screenshots/mobile-destinations.png)

## Phase 03 integration points

Connect the shared media chooser to the current background-image fields and existing-image selection area in `homepage-editor.tsx`, returning the existing `{ imageUrl, imageAlt }` values. Reuse the established Supabase storage configuration and permission system; do not introduce another storage system. Existing iframe rendering already previews selected media. Keep uploads, shared-library management and advanced image controls in Phase 03, and retain the existing save contract and effective-value resolver.

## Files changed

- `package.json`
- `scripts/fixtures/homepage-services.mjs`
- `scripts/run-homepage-tests.mjs`
- `scripts/test-homepage-editor.mjs`
- `src/app/(public)/page.tsx`
- `src/app/admin/(panel)/content/home/page.tsx`
- `src/app/admin/(panel)/home/page.tsx`
- `src/app/admin/actions.ts`
- `src/app/admin/cms/cms-block-actions.ts`
- `src/app/admin/cms/home-page-blocks-actions.ts`
- `src/app/admin/cms/homepage-editor-actions.ts`
- `src/components/admin/homepage/homepage-editor.css`
- `src/components/admin/homepage/homepage-editor.tsx`
- `src/components/admin/homepage/homepage-preview.tsx`
- `src/components/home/featured-programs.tsx`
- `src/components/home/hero-carousel.tsx`
- `src/components/home/home-marketing-banner.tsx`
- `src/components/home/home-page.tsx`
- `src/components/home/how-it-works.tsx`
- `src/components/home/journey-cta.tsx`
- `src/components/home/popular-destinations.tsx`
- `src/components/home/success-stories-section.tsx`
- `src/components/home/why-europe.tsx`
- `src/components/home/why-unimondo.tsx`
- `src/lib/admin/homepage-editor.ts`
- `src/lib/admin/overview.ts`
- `src/lib/data/site-content.ts`
- `src/lib/homepage/content.ts`
- `src/lib/homepage/validation.ts`
- `docs/cms-phase-02/README.md` and its four screenshots.
