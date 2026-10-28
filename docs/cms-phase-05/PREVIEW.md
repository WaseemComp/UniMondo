# Phase 05 Preview preparation — 28 October 2026

The owner manually applied `20261029090000_academic_catalogue.sql`, reported successful execution, and authorized commit/push/PR/Preview preparation. It was **not executed again**. Merge to `main`, production deployment, production writes and Phase 06 remain outside this authorization.

## Focused live checks (read-only)

The existing local Supabase configuration targets production project `uizaxrmijvyymiyzoadb.supabase.co`. All verification requests were GET or OPTIONS. No production saves, uploads, edits, archiving, deletion, permission changes or account changes were performed.

- New columns were selected successfully: country catalogue/visibility/archive fields; university country relationship/profile/archive fields; programme university relationship/details/archive fields.
- Service-role OpenAPI metadata identifies `featured_universities.country_id → countries.id` and `programs.university_id → featured_universities.id` as foreign keys. Both new visibility functions are exposed with GET support and returned expected results for all 15 countries and 6 universities.
- Current counts: **15 countries, 6 universities, 10 programmes**. Anonymous SELECT returns the same 15/6/10 IDs, matching the current saved publication/archival state and parent visibility. There are currently no hidden/archived catalogue rows, so the hidden-parent branches were not exercised live; previous isolated PostgreSQL checks covered those cases without production writes.
- Both new relationship columns remain null on the existing records, as intended by the migration. There are no dangling new foreign keys. All 6 university country names match existing destination records. Four programmes match an institution master by their existing university/country text; six retain legacy institution names without a matching master. No master records or associations were fabricated to fill that gap.
- All **10 legacy `program_openings` IDs** still exist in `programs`, and their country/university associations match. Latest country/university/programme update timestamps all predate this migration verification; the check did not change them.
- There are currently no persisted Phase 04 destination/university collection references to validate. The existing inherited selections continue to use the catalogue; no collections were initialized by this check.
- Catalogue identity/relationship fingerprint at verification: `45b3b4f3087fa437268f9a45095c31cb9f5f6655a68fffe398a5a08d92425a62`.

### Verification limits

The configured service credential provides table reads and service-role API metadata, including available service CRUD methods. Anonymous table reads work, but anonymous API-root OpenAPI introspection returns 401. No SQL-management credential or authenticated staff session is available to inspect `pg_policies`, `pg_class` or `has_table_privilege` for every role directly. OPTIONS responses describe endpoint methods, **not role grants**, and were not treated as proof of write restrictions. The owner-reported migration execution and previously passed isolated grant/RLS checks are recorded separately from the live read checks; no write attempts were made to infer privileges.

There is no pre-migration production snapshot available for an exact historical count/hash comparison. Current old record timestamps, legacy opening IDs/associations, readable data and non-dangling relationships are preservation evidence, not proof that every historical record count was unchanged.

## Diff and checks

The targeted final diff review and secret-pattern scan found no credentials or unrelated modifications. Existing authentication, staff permission assignment, Agreement and application API sources are unchanged. No production environment, storage or Vercel configuration is changed.

Previously completed production build/TypeScript, focused lint, isolated academic action/DOM/PostgreSQL checks, homepage default/preview checks and CMS/Media Library/staff/Agreement regressions remain the implementation evidence. They were not unnecessarily repeated during release preparation. Only focused live read checks and diff validation were added. The PR's Vercel build must complete before handoff.

## Preview safety

The Preview's resolved Supabase environment is not established by the local environment file or a successful build. Until deployment configuration or rendered Preview evidence confirms it, **treat the Preview as connected to production Supabase**. Do not perform test saves, uploads, edits, archiving or deletion. Owner desktop/mobile inspection is pending. Safari control was not retried.

The migration is retained in Git as the reviewed source for the already completed manual change; committing it does not run it. The existing build command contains no migration application step.
