# Phase 06 Preview preparation

The owner reports successful manual execution of `20261030090000_content_publishing.sql` and authorized feature-branch commit, push, PR and Preview preparation. The migration was not rerun. No production or Preview content writes, activation, account/permission changes, storage operations, merge or production deployment are part of these checks.

## Live read-only evidence

The configured production project is `uizaxrmijvyymiyzoadb.supabase.co`. Verification used GET requests only.

- `cms_publishing_settings` returns the existing singleton `id=1, enabled=false`.
- `cms_content_workflows` and `cms_content_revisions` are readable with the configured server credential. The exposed column contracts match the implementation, including version, approval, author and snapshot fields.
- `cms_content_snapshot`, `cms_content_save_draft` and `cms_content_transition` have the expected API definitions. Only snapshot reads were invoked; save, transition and apply functions were not invoked in production.
- Read-only snapshots for global hero, Why UniMondo, testimonials and the announcement strip succeed with the expected document tables.
- Anonymous SELECT on all three workflow tables is denied with PostgreSQL code `42501`.
- The private `cms_content_clean` helper refuses service-role execution (`42501`); snapshot execution succeeds. Unsafe or mutating functions were not invoked to infer grants.
- Existing catalogue counts remain 15 countries, 6 universities and 10 programmes. No records were initialized or changed by verification.
- The production homepage, destinations and login pages return 200. Protected homepage, publishing, university, settings, media, application and Agreement routes redirect anonymous visitors to login. Protected media and Agreement APIs return 401.

## Compatibility and permission verification limits

Production is still Phase 05 at `0057ca33a7614ad1673fcc97a040e6bd5ae47e6e`. Current `main` was fetched and matches that baseline. The reviewed migration changes no existing content-table grants, records or defaults; its publication guard rejects legacy writes only when the owner-controlled enabled setting is true. The setting is confirmed false in production. Previously completed isolated PostgreSQL tests exercise disabled-mode compatibility and enabled-mode guards. No compatibility problem was detected; real production saves were deliberately not attempted.

OpenAPI and OPTIONS endpoint listings are not proof of table/function privileges. The available API cannot inspect `pg_class`, `pg_policies`, effective grants or installed trigger definitions directly. Full independent live RLS/grant/trigger verification therefore awaits the owner's SQL metadata confirmation, for which `verify-installation.sql` provides SELECT-only queries in a read-only transaction. Expected: RLS true and zero policies on all three private tables; anon/authenticated no table privileges; service-role SELECT only; service-role EXECUTE only for snapshot/save_draft/transition. Helper execution and all workflow functions must be unavailable to anon/authenticated. The existing table publication guards must check the enabled flag, and history must have its immutable trigger.

The owner-reported migration success and isolated migration/security tests are distinct from direct live metadata verification. No production write probes were used.

## Diff and previous checks

The focused diff review and secret-pattern scan found no secrets or unrelated implementation changes. Agreement, application, account-management and authentication implementations remain unchanged. Only two content publishing permission definitions are added; no assignments are changed. Existing dependency versions remain unchanged; PGlite and JSDOM are development-only test additions.

Previously completed TypeScript, build, lint, isolated PostgreSQL workflow/rendered-editor checks, homepage/public-default tests, and CMS/Media Library/staff/Agreement regressions remain the implementation evidence. Those suites were not unnecessarily repeated against production during Preview preparation. The GitHub/Vercel checks must pass for the released feature commit.

## Preview and activation boundary

Until the Preview environment is independently established, treat it as connected to production Supabase. Preview verification uses GET only: no test saves, submissions, approvals, publication, uploads, archive or deletion.

The owner will inspect the Preview and separately decide whether to merge. Publishing remains false throughout Preview. Only after Phase 06 production is Ready and verified may the owner separately execute `activate-publishing.sql`. The numbered installation migration is not part of that activation and must not be rerun. See README for the exact sequence and rollback considerations.
