# CMS Phase 03 — Media Library

Implementation branch: `codex/cms-phase-03-media-library`  
Production baseline: `c29157be74741b7685cfb28cfeedba1b1abe3f34`

Phase 03 is implemented. Feature-branch commit, push, PR and Vercel Preview preparation are authorized. See [release verification](RELEASE.md) for the current checks and limitations. No production content save or production storage mutation was performed.

## Implemented

- Authorized sidebar destination at `/admin/media`, with responsive gallery, search, five category filters, pagination, existing-image thumbnails, metadata inspection, upload and drag/drop queues.
- Server-decoded JPG, PNG, WebP and AVIF uploads. Each image is limited to 4 MB, 36 megapixels and 12,000 pixels per side, with a minimum of 16 × 16 pixels. Still images only. Uploads become WebP at quality 88, oriented correctly, stripped of EXIF/GPS, and resized within 2560 × 2560 without enlargement. The 4 MB limit also fits the existing Vercel request limit without changing configuration.
- Original filename, accessible description, category, dimensions, optimized size and upload date. Existing images retain their original addresses; unavailable legacy dimensions/sizes are honestly marked as not recorded. Category/description changes do not move or overwrite files.
- Hero **Change Image** opens the shared chooser. Choosing or uploading an image updates the real desktop/mobile public-component preview in memory. Only the existing **Save changes** action updates public homepage content. Cancelling, closing or discarding leaves saved selections intact.
- **Choose for homepage** opens the current first hero slide with the requested image highlighted in the chooser. It never automatically saves or replaces the slide.
- Existing saved/default/inherited content resolution and all five fallback slides are retained. Root-relative repository images are compatible with hero saves.
- Removal is confirmed, reversible **Archive image**, with usage protection and existing permission checks. No hard-delete interface exists. Archived images cannot be selected as new managed hero images. Original files/URLs remain accessible for historical references.
- All mutations use authenticated server Route Handlers, existing fine and area permissions, same-origin checks, bounded request parsing, strict metadata schemas and optimistic concurrency checks. New storage keys are server-generated UUIDs with `upsert: false`.

## Supabase catalogue setup

The owner reports successful manual application of [the additive migration](../../supabase/migrations/20261028090000_cms_media_catalogue.sql). Release checks confirm the table and expected columns are accessible. Do not reapply it or recreate the table. Exact RLS/grant introspection limitations are recorded in [release verification](RELEASE.md).

The migration creates **only** `public.cms_media_assets`, its category/date index and service-only table grants. RLS is enabled; `anon` and `authenticated` receive no direct table access. The existing server service role receives SELECT/INSERT/UPDATE, with no DELETE grant. No existing rows, tables, users, policies or storage objects are modified. The table is needed to change categories and archive images without rewriting immutable files or abusing website-content records as an asset catalogue.

Storage remains in the existing public **featured-university-media** bucket. New objects use `cms-library/<UUID>.webp`; existing `cms/` objects remain untouched. No new bucket, storage policy, environment variable or credential is needed. The server verifies the existing bucket is public and supports WebP, and fails safely if not. This configuration was checked against repository configuration and an isolated SDK transport; no production storage reconfiguration was attempted.

Before the migration, existing images remain browsable/selectable with a setup notice. Uploads, metadata edits and archiving are disabled. A missing table reported by PostgREST (`PGRST205`) or PostgreSQL (`42P01`) is handled safely.

### Existing permissions

No permission key or assignment was added or changed. Category view/upload/edit/archive use existing view/create/edit/delete keys respectively:

| Category | Existing area and permissions |
| --- | --- |
| Hero Banners | Content · `home.hero_slider.*` |
| Destinations | Academic · `countries.*` |
| Universities & Programs | Academic · `universities.*` |
| Success Stories | Content · `blog.*` |
| General Website Images | Content · corresponding Home/About/Contact/Blog view/edit/create access; archiving reserved to Superadmin |

An upload also requires category view access. Reclassification requires edit access to both old and new categories. Existing legacy-account wildcard/default behavior remains that of the existing permission checker. Homepage saving still requires the existing homepage/slide permissions; managing an asset never grants permission to publish it.

### Usage and failure safety

Usage scans inspect image fields in existing public CMS content, site copy, featured universities, programs, success stories, blogs, team members and partners, including inactive/draft records conservatively. Known source-code images are included as compatibility references. Existing website-image uploads are enumerated only in the `featured-university-media/cms` folder. Student-application storage, Agreements and private applicant records are never scanned.

An incomplete usage scan disables archiving. Known default images remain protected conservatively even while saved overrides are active. Usage labels do not expose student records or profile details. Historical references cannot be exhaustively enumerated; archiving therefore always retains the original file. Concurrent operations can leave a newly published reference pointing to an archived asset; that URL remains valid because no file is deleted.

Uploads reserve an `uploading` catalogue row before touching storage. A failed upload compensates only its freshly reserved UUID path and marks that row failed. If the catalogue's final acknowledgement is uncertain, the file is retained and a clear error asks the operator to refresh. Pending/failed rows never become selectable. An operator may need to reconcile a persistent pending row against its new storage object before retrying; there is intentionally no automatic destructive cleanup.

## Verification

- `npm run test:media`: real Sharp decoding/optimization, supported formats, spoofed/invalid/oversized/tiny/extreme images, bounded multipart streams, exact existing fine/area permissions, unauthenticated access, source/destination category checks, immutable uploads, reference protection, legacy imports of metadata only, archive/restore, pending-migration behavior, partial/uncertain failures, real API handlers, CSRF checks and actual hero persistence through existing actions.
- `npm run test:media:browser`: actual React gallery, chooser, CMS shell and real public homepage components, backed by actual media Route Handlers and save actions using an isolated Supabase SDK transport. Covers search, file uploads, drag/drop, invalid uploads, unsaved image selection, desktop/mobile iframe image rendering, save/discard, current-usage protection, archive/restore, keyboard close, view-only permissions, setup notice and 320/390/768/1660 px overflow checks.
- `npm run test:homepage`, `npm run test:cms`, `npm run test:staff`, `npm run test:agreements`.
- `npx tsc --noEmit`, focused ESLint and `npm run build`.
- Anonymous HTTP checks against the actual production build redirect `/admin/media`, `/admin/home`, `/admin/agreements`, `/admin/applications` and `/admin/settings` to login; media and Agreement APIs return 401.

Tests use synthetic records and generated files in an isolated local transport. No real account login, student information, production write, production upload or destructive database test is used. The browser harness is not an authenticated end-to-end deployment against real Supabase; confirm the migration and bucket integration with isolated data in a staging Supabase project before release.

Browser checks require Playwright and Chromium available locally. Set `PLAYWRIGHT_MODULE` to a local Playwright module path if it is not installed in the workspace; `PLAYWRIGHT_BROWSERS_PATH` may point to an existing Chromium cache. No new application dependency is required.

Screenshots clearly display **ISOLATED QA — SYNTHETIC CONTENT**. Generated colored banners are QA uploads and are never seeded into the application:

- [Desktop gallery](desktop-media-library.png)
- [Mobile gallery](mobile-media-library.png)
- [Mobile hero image chooser](mobile-image-chooser.png)

## Release procedure

1. The owner has already applied the SQL above to the intended Supabase project. Do not reapply it. Confirm the existing role grants and RLS through the dashboard; no storage-policy changes are requested.
2. After separate release authorization, review the final diff, commit this branch, push and open a PR against `main`. Use the established Vercel Preview workflow.
3. Point write tests at isolated staging Supabase, verify a real upload/selection/save/usage/archive/restore cycle with test-only records and confirm access controls. Do not run write tests against shared production storage or CMS content.
4. Obtain separate approval before merging/deploying production. Preserve all existing account, content and storage records. No rollback should drop the catalogue table or remove uploaded objects; reverting the frontend safely leaves them intact.

Phase 04 has not begun. Individual cards, process steps, facts, testimonials and featured-item editing remain the mandatory work recorded in [the Phase 04 requirements](../cms-phase-04-requirements.md). The shared chooser, category grants and asset types are the integration points for future editors. Static section images without existing CMS persistence fields are not silently converted to duplicate content records in this phase.
