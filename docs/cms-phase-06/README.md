# Phase 06 — private content publishing

Implementation branch: `codex/cms-phase-06-publishing`, based on production `0057ca33a7614ad1673fcc97a040e6bd5ae47e6e`.

The owner reports manually applying the installation migration successfully and has authorized feature-branch commit, PR and Preview preparation. The migration is not to be run again. Production deployment, merge, publishing activation, account changes and production write tests are outside this release-preparation authorization. Phase 07 is outside this work.

## What changed

The existing homepage, country, university and programme editors now save private drafts. Public readers continue to read the same published tables and defaults. The existing Media Library, academic relationships, public URLs and real-component homepage preview are reused. The standalone Success Stories and announcement routes use the same workflow, closing their former immediate-save path.

The common workflow panel provides status, owner, last modification, submission, review, changes requested with a reason, approval, publication, published/draft preview switching, field comparison, immutable history and restoration as a new draft. The new Drafts & Reviews page reopens private work. Saving and discarding drafts do not change public content.

Workflow:

1. Save Draft creates or updates a private version. In-review and approved versions are locked.
2. Submit for Review validates current data and public baseline.
3. A reviewer approves, requests changes or returns the submission. Non-Superadmin reviewers cannot approve their own latest content edit. Superadmin may explicitly approve their own work.
4. Publish requires the exact approved revision, current optimistic version and unchanged public baseline. Publication and its history event run in one database transaction. A failed write rolls everything back and retains the approved draft.
5. Return to Draft invalidates approval. Restore as Draft validates an immutable historical snapshot, retains newer record IDs and hides newer items when necessary. Create, edit and archive permissions still apply. No history is deleted.

Archived is distinct from workflow review status: published withdrawals use existing archive/visibility fields. Academic archival and section-level withdrawal are reflected as Archived; hiding an individual item does not archive the whole collection. Discarded marks a retained private draft, never deletion of public content.

## Content boundaries

All nine existing homepage sections are supported. Related content with distinct existing permissions has its own document: global hero copy/presentation, hero slides, statistics, testimonial records and announcement strip. Section copy, ordered cards/steps/facts/featured selections and presentation are saved using their existing structures. Shared testimonial records are not duplicated into section-copy documents. Countries, universities and programmes each have one document per existing stable record ID. New catalogue records remain private until publication.

The first private save records a revision-zero baseline. Source defaults and inherited hero content are captured privately for meaningful comparison/restoration; this does not backfill published records. Saved/default/inherited field indicators remain available. Live, unsaved, saved draft and approved-but-unpublished previews have explicit labels. Preview links/forms remain inert.

Existing validators and server actions are reused through a request-local planning client. Their writes run against an in-memory projection; only the validated proposed document is saved through the private workflow RPC. Actual public database writes occur exclusively in the approved publication transaction. Missing workflow setup fails closed for saves and preserves public reads.

## Permissions and privacy

Authentication, area access, existing fine-grained content keys and existing Superadmin control remain in place. Two explicit opt-in keys were added to the existing Detailed permissions matrix:

- `publishing.review`: review and approve documents the user can view.
- `publishing.publish`: publish approved documents the user can view.

No account assignments are changed. Legacy empty permission maps and wildcard grants do not silently acquire these two new privileges. Superadmin retains access. Academic publishing additionally requires the existing country/university publish permission; testimonial publishing additionally requires `blog.publish`. Existing create/edit/archive checks remain in the reused editors and history restoration.

New tables use RLS with no anonymous or authenticated policies or grants. The service role can read private tables and execute only the three public workflow RPC entry points; direct private-table mutations and private helper execution are revoked. Server actions authenticate and authorize every workflow operation. Public readers, public APIs and search indexing use published tables only. Drafts & Reviews is authenticated and marked noindex.

Pending drafts and retained historical revisions participate in Media Library usage checks, preventing archival of referenced images. This adds no storage writes or duplicate media assets.

## SQL and manual release prerequisites

Files:

- `supabase/migrations/20261030090000_content_publishing.sql`: additive installation, initially disabled publication; idempotent installation tested twice in isolated PostgreSQL.
- `docs/cms-phase-06/activate-publishing.sql`: separate manual cutover, **only after Phase 06 deployment**.

The owner has already manually installed the numbered migration. It was not reapplied during release preparation. Required remaining sequence:

1. Check the existing installation read-only; `verify-installation.sql` is provided for owner SQL metadata inspection. Keep `cms_publishing_settings.enabled=false`. Private drafting/review can operate while publication is disabled. Phase 05 legacy writers remain compatible during this staged installation.
2. Prepare the authorized commit, PR, Preview and checks. Treat the Preview as production-connected and read-only; do not run isolated write suites against it.
3. After owner Preview acceptance and a separately authorized merge, wait for the exact Phase 06 production deployment to reach Ready and verify production code/authentication/read-only content. Do not activate while Phase 05 code is still serving write requests.
4. Only when the owner explicitly decides to activate, the owner manually runs `activate-publishing.sql` in the production Supabase SQL Editor. Its transaction updates only the existing singleton settings row to `enabled=true`; this enables approved publication and database guards preventing legacy direct writes. The assistant does not execute it. Confirm the setting afterward with `select id,enabled from public.cms_publishing_settings where id=1;`.
5. Superadmin may subsequently assign the two new privileges using the existing Detailed modal when authorized. No SQL changes to staff assignments are required for release preparation.

Migration prerequisites are the existing Phase 01–05 tables and Supabase roles. Verify the new tables have RLS enabled, zero public policies, no anon/authenticated privileges, service-role SELECT only, and only the snapshot/save/transition entry points have service-role EXECUTE. No existing RLS policies, credentials or account records are changed.

Rollback: stop publishing first. Retain private tables, revision history and assets. If rolling application code back to Phase 05, the owner must explicitly disable `cms_publishing_settings.enabled` before enabling legacy writes. Never drop history or reset published rows. Retain draft/history media usage protection or freeze media archival while older application code is running. A production rollback is a separate authorized operation.

## Verification

All write tests use generated fixtures, the actual Supabase SDK, and actual migration/RPC SQL in isolated PGlite PostgreSQL. The transport rejects external hosts; no application production environment is loaded by these suites. The migration is installed twice, and role/grant/trigger and transaction failure behavior are exercised.

Passed checks:

- `npm run test:publishing`: private drafts, all nine homepage copy scopes, item/slide/default preservation, first-save baseline restoration, granular permissions, independent review, review locks, stale versions, approval invalidation, atomic publication rollback, history comparison/restoration/discard, country/university/programme relationships, create-only programme draft continuation, standalone story permissions, private announcement lines/settings and stale announcement rejection, media references in drafts/history, RLS/grants and legacy-writer guards.
- `npm run test:publishing:dom`: rendered React editors with real isolated SQL-backed actions, unsaved/saved/approved/live preview distinction, explicit private save and discard, six-card preservation, mode switching, inert preview links, desktop/mobile iframe widths and actual public academic component preview.
- `npm run test:homepage`, `npm run test:homepage:defaults`, `npm run test:media`, `npm run test:cms`, `npm run test:staff`, `npm run test:agreements`, `npm run test:academic:sql`.
- TypeScript, focused ESLint, production build and Git whitespace check.
- Read-only local production-server smoke: homepage and destinations load, the existing `/programs` redirect is retained, login loads, protected homepage/publishing/catalogue/stories/ticker/media/application/Agreement/settings routes redirect unauthenticated visitors to login, and protected Media Library/Agreement APIs return 401. These checks did not sign in or write records.

The DOM suite simulates iframe lifecycle and viewport sizes; it is not Safari pixel-layout verification. No desktop/mobile screenshots are claimed. Existing Safari control failures were not repeated. Manual browser inspection is recommended on a separately authorized Preview, read-only if production-connected.

## Deliberate limits

- Immediate publication only; no scheduler or background infrastructure.
- One shared active draft per content document, with optimistic version checks rather than parallel editor branches. Conflicts require reloading; no automatic merge.
- Each document is capped at 750 KB. Revision metadata loads in pages of 20 with snapshots loaded on demand. The inbox shows the latest 500 documents.
- Old direct-save homepage actions refuse unsupported calls. Publication guards also block legacy clients after manual activation.
- Homepage and academic catalogue publishing only. Agreements retain their separate, unchanged legal revision system. Blog, other public modules and student operations are not migrated into content publishing.

See `FILES.md` for the complete changed-file inventory and `PREVIEW.md` for live read-only evidence and its limits. Do not start Phase 07, merge, deploy to production or activate publishing without separate authorization.
