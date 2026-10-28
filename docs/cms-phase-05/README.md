# CMS Phase 05 — academic catalogue

Implemented locally on `codex/cms-phase-05-academic-catalogue` from production `main` at `0478493058fbc3b65d8cedf762d61d47ff7992eb`. The owner has authorized commit, push, PR and Vercel Preview preparation. Production merge/deployment and production mutations remain unauthorized.

## Delivered

- A shared Content Studio catalogue at the compatible existing destinations, universities, featured-universities and programmes routes. Search by institution/programme/name/discipline, country and visibility filters, degree filter, collapsible form sections, mobile stacking, clear save/discard feedback, unsaved navigation warning and permission-aware controls.
- Country management: existing names and addresses, legacy/effective country copy, structured overview/cost/visa/scholarship guidance, key facts, eligibility, Media Library image, SEO overrides, priority and order, visibility, archive/restore and related institution listings. The 12 requested priority countries have coverage indicators. Missing destinations are never seeded or populated with invented content.
- Universities: reuse `featured_universities` rather than introducing another master table. Country association, location, description, official URL, image/logo through the existing library, public introduction/ranking label, existing flagship summaries, order, publication and non-destructive archive/restore. Homepage feature selections remain in the Phase 04 editor.
- Individual programmes: reuse `programs` and its stable text IDs. Parent university/country, degree including doctorate/other, discipline, teaching language, duration/ECTS, tuition display/optional amount and currency, intake, admissions, opening/closing dates, eligibility/academic/language/test requirements, scholarships, non-EU guidance, official programme/application links, verification status/date, image, visibility and order.
- Public destination guides and university/programme cards consume the persisted metadata, using expandable programme details and official-source links within the established design. Existing country URLs and generated SEO remain unchanged unless an explicit optional SEO override is saved. The established `/programs` redirect remains unchanged; individual institution/programme detail routes are not invented.
- Hidden/archived parents suppress descendants publicly without changing child records. Intentional empty results cannot restore legacy openings or fallback homepage destination cards. Realtime programme refresh also accepts empty results and responds to parent changes. Existing Phase 04 selections retain their references and explicit image overrides.

## Data model and preservation

No new catalogue/master tables, uploads backend, credentials, authentication architecture or permission keys. Existing `countries`, `featured_universities` and `programs` retain their IDs, records and compatibility text columns. Optional `country_id` and `university_id` foreign keys establish the stable hierarchy. Existing text associations remain valid and are not automatically guessed/backfilled. New records require an existing parent; existing unlinked records show their current association for deliberate linking.

Structured additions are `countries.catalogue`, `featured_universities.profile` and `programs.details`. Unknown pre-existing metadata is preserved when known fields change. Country copy retains existing legacy-column compatibility. Country image references join the Media Library inventory, so a referenced image cannot be archived inadvertently.

Archive is reversible, retains all text/images/children and sets public visibility off. Restore keeps the record hidden until explicitly republished. Former catalogue hard-delete/server-save entry points reject obsolete clients and direct them to the current editor; the replaced screens all use the new guarded action. No catalogue action issues a DELETE.

Existing public country addresses are locked, including computed addresses on records whose stored address is empty. Names/country changes that would break existing child or homepage text references are rejected with guidance; no implicit cascading renames occur. Programme IDs and application references are retained.

## Required manual SQL prerequisite

The owner manually executed `supabase/migrations/20261029090000_academic_catalogue.sql` and reported “Success. No rows returned.” on 28 October 2026. **Do not execute it again.** Read-only release verification is recorded in [PREVIEW.md](PREVIEW.md).

The transaction:

1. Adds optional relationship/metadata/archive fields and country visibility (default true preserves existing public content).
2. Allows unknown programme deadlines without inventing a date, and expands the existing degree check while retaining both previous degree values.
3. Adds restrictive parent foreign keys and indexes. Does not insert, reset, rename, delete or automatically link existing records.
4. Adds future duplicate-country/institution protection without rejecting unchanged legacy duplicates or modifying them.
5. Removes direct browser INSERT/UPDATE/DELETE privileges for these three tables. Existing catalogue operations already run with the server service role; the new action enforces existing area and detailed permissions. This closes the existing broad `is_cms_admin()` direct-write bypass. Staff assignments/accounts are unchanged.
6. Updates these catalogue tables' public SELECT policies and adds visibility-only helpers so hidden parents also suppress legacy text-linked descendants. It does not change storage policies, `admin_profiles`, authentication, student records or Agreement policies.

This is an additive/backward-compatible schema extension with relaxed deadline/degree constraints and catalogue-specific privilege hardening, not a pure column-only migration. The owner should review the privilege/policy changes as well as the new columns. Existing service access remains available. The owner has completed manual execution; no migration is run by the application build or release preparation. The live API now exposes the new columns and relationships.

## Checks

Executed locally with isolated transport / in-memory PostgreSQL for writes:

- `npm run test:academic`: actual server actions and Supabase SDK; existing country effective values; all three create/edit paths; stable relationships; metadata preservation; safe unknown values; date/link/content validation; media selection/usage; stale writes; archive/restore; each relevant permission and area/anonymous denial; legacy mutation bypass prevention; search/filter; intentional-empty/public-parent compatibility. PostgreSQL timestamp offsets are accepted during save confirmation.
- `PGLITE_MODULE=/tmp/unimondo-phase05-qa/node_modules/@electric-sql/pglite npm run test:academic:sql`: actual isolated PostgreSQL semantics. Migration twice, original values/timestamps retained, direct mutation grants, RLS with linked and legacy parents, foreign keys, duplicate prevention, nullable deadlines and expanded degrees. No application environment or production service is loaded.
- `JSDOM_MODULE=/tmp/unimondo-phase05-qa/node_modules/jsdom npm run test:academic:dom`: actual rendered React forms and real server actions against isolated SDK data; private typing state, explicit save/discard, invalid links, archive/restore, destination/university/programme editing, protected addresses, Media Library selection and view-only controls. Mobile/desktop responsive structure is checked; this is **not Safari pixel/layout QA**.
- Existing CMS, Media Library, staff, Agreement and homepage-item suites passed. Application access guards/filter regression checks are included in the CMS suite; no live student data or destructive application scripts were used.
- Public default renderer comparison preserves all nine homepage sections with populated existing destination references. A separate test ensures intentionally hidden countries never reappear as legacy cards.
- Final built-app read-only HTTP smoke: homepage, destinations, Italy guide and login returned 200; eight protected admin routes redirected to login; Media Library, Agreement and application APIs rejected anonymous access with 401. Only GET requests were made.
- Final production build (including TypeScript), focused ESLint and diff checks passed. A pattern scan found no secrets; protected authentication, Agreement and application API sources are unchanged.

The optional DOM/SQL tools were installed outside the repository in `/tmp/unimondo-phase05-qa` using `npm install --prefix /tmp/unimondo-phase05-qa --no-audit --no-fund jsdom @electric-sql/pglite`. They are test-only, not new production dependencies. No package runtime/dependency versions were changed.

## Limits and review notes

- No browser screenshots were captured. Safari control was not retried; simulated DOM checks do not establish pixel layout. Owner desktop/mobile Preview inspection remains part of release review.
- New metadata is intentionally blank/incomplete until researched by staff. “Verified” is a staff declaration requiring an official URL and non-future verification date; the application does not independently verify claims or scrape university websites.
- Existing programme records that name an institution absent from the institution table remain unlinked; staff may select a confirmed existing parent or add a researched institution. There is no automatic duplicate master creation or bulk matching.
- Existing university flagship summaries are preserved and editable separately from the individual programme records. No automatic conversion of promotional summary lines into admissions records.
- Existing source-code destination guidance remains a fallback where structured guidance is blank. No new factual claims, dates, fees, rankings or scholarship amounts were introduced.
- Catalogue loading uses ordered chunks and a 20,000-record safety ceiling per type; an explicit error disables partial editing if exceeded. Search/filter are local within the complete loaded catalogue.
- Public page links open the saved current destination page, not an unsaved or unpublished preview system. Draft/publishing revisions remain Phase 06 work.

## Manual release procedure and rollback

1. Completed: owner reviewed the implementation, manually applied the SQL and authorized Preview preparation. Do not reapply SQL or run production write-based QA.
2. Perform focused read-only checks and record their limitations; no storage, account or permission changes are part of release preparation.
3. Commit/push this feature branch and open a PR against current `main`; obtain a Vercel Preview using the existing configuration. Treat Preview as production-connected until verified otherwise and keep testing read-only if it shares production Supabase.
4. Owner inspects desktop/mobile forms and public pages. Merge/deploy only after a separate production release authorization.

Do not drop the new columns or relationship data to roll back. The migration leaves old values valid and timestamps intact. A code rollback before any Phase 05 edits can retain the added schema and tightened grants because existing server actions use the service role. After Phase 05 edits, older code is not fully compatible with nullable deadlines, expanded degree values and intentional empty lists. Freeze catalogue edits and prepare a reviewed compatibility rollback/hotfix; never reset records or restore broad browser write privileges as a shortcut. Retain archived records, saved metadata and storage assets.

Phase 06 has not been started.
