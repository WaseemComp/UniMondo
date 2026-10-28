# Phase 07 release preparation

The owner reports successful manual execution of `20261031090000_footer_publishing.sql` and authorized commit/push/PR/Vercel Preview preparation. The migration was not rerun. Merge, production deployment, publishing activation and production/Preview writes remain prohibited.

## Focused live read-only checks

All live verification requests were GET. The existing production Supabase project is `uizaxrmijvyymiyzoadb.supabase.co`.

- `cms_publishing_settings` returned the existing singleton `id=1, enabled=false`.
- The expanded `cms_content_snapshot('home','footer')` succeeded and returned only the expected existing `cms_content_blocks` scope. It currently contains zero published footer blocks/configurations. This is expected: migration installation creates no content; existing inherited footer values remain effective.
- The exact public footer query succeeds using the anonymous client and returns zero configuration rows. The existing anonymous Contact queries (offices, addresses, phones and emails) succeed with all expected column projections.
- Private workflow/revision tables are available to the server credential. Existing hero, Why UniMondo, testimonial and ticker snapshots still succeed.
- Snapshot/save-draft/transition function definitions remain available in the API contract. Only snapshot reads were invoked. No save, review, approval, publication, upload, archive or delete operation was called.
- Anonymous access to the footer snapshot and all three private publishing tables is denied with PostgreSQL code `42501`. No credentials or account assignments were changed.

The exact Phase 06 RLS, table privileges, function EXECUTE grants and triggers were previously verified by the owner with every consolidated SQL check passing. The reviewed Phase 07 extension changes only the snapshot function's allowed document list and explicitly retains its service-only EXECUTE grant; it does not modify tables, records, triggers or the activation flag. Service snapshot success and anonymous denial were independently checked live. Full PostgreSQL grant/catalog introspection is unavailable through the existing REST credential, so API endpoint listings are not represented as proof of every role's effective grant. No write probes were used to infer permissions.

## Current production compatibility

Current `main` was fetched and remains the deployed Phase 06 baseline `11d82cf9de6d0cc299dfebd04d15b75fc04f2da1`. Its Vercel production status is successful. No security or compatibility problem was detected in the focused checks.

Live production homepage, destinations, Italy guide, courses, packages, About, Contact, Blog and Apply pages return 200 and retain the existing footer description, tagline and expected Explore/Company links. Login returns 200; protected homepage/footer/publishing/media/Application/Agreement routes redirect unauthenticated visitors to login, and protected Media Library/Agreement APIs return 401.

New footer storage reuses `cms_content_blocks`; no new footer table is expected. The current production code continues to render its existing footer, and the additive SQL function extension does not alter that behavior. Private draft and published-content separation, false-mode compatibility, exact publication and enabled-mode guard enforcement were previously tested with actual SQL/RPCs in isolated PostgreSQL; real production test saves were deliberately not attempted.

## Diff / implementation checks

The final focused diff and secret-pattern review found no secrets or unrelated changes. Existing authentication, account assignments, Agreement, Application, submission and notification implementations remain unchanged. Dependency versions and Vercel configuration are unchanged. All previously completed implementation checks are recorded in `VERIFICATION.md`; they were not unnecessarily repeated during release preparation. The Vercel deployment must build successfully for the exact feature commit before handoff.

## Preview review boundary

Treat Preview as production-connected unless deployment configuration establishes otherwise. Owner inspection must remain read-only: do not save drafts, upload/replace images, archive, approve, publish or delete content during testing. Unsaved local form/preview inspection does not authorize persistence.

No Safari automation attempts or full repository audit were repeated. Vercel deployment protection may require the owner's existing sign-in for inspection; it must not be disabled or bypassed as a configuration change. No browser screenshot or signed-in visual pass is claimed by this release preparation.

Stop once Preview is Ready with successful checks. Do not merge, deploy to production or activate publishing without separate owner authorization.
