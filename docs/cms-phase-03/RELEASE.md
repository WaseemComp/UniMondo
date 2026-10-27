# Phase 03 release verification

Branch: `codex/cms-phase-03-media-library`. Target: PR against `main`, Vercel Preview only. No merge or production deployment authorized.

## Applied catalogue

The project owner reports successful manual execution of `20261028090000_cms_media_catalogue.sql`. It was **not** executed again by the release checks.

Read-only checks against the configured production Supabase project confirmed:

- `cms_media_assets` is available through PostgREST with every expected column, including upload status, archive timestamps and ownership metadata. The catalogue contains zero rows before release tests.
- The server service client can read the table. Anonymous table reads are denied (HTTP 401).
- Existing `featured-university-media` storage is public, has a 5 MB bucket limit and permits WebP. No bucket or storage-policy change is required.
- The actual catalogue loader completes all 11 read/list requests with no errors: metadata ready, storage ready, usage verified, no warning. It discovers 27 existing images without moving, renaming or modifying them.

Direct SQL introspection of RLS and exact table grants is blocked: the available Supabase management credential returns HTTP 403, `Missing required permission(s): database_read`. The owner has been asked to confirm RLS and grants through Supabase. The applied SQL specifies RLS enabled, no public policies, no anon/authenticated privileges, and service-role SELECT/INSERT/UPDATE only. Zero policies is intentional: the server service role bypasses RLS. API-read success and anonymous denial alone do not independently prove every database grant or RLS flag.

No production uploads, mutations, archived rows, content saves, account changes or migrations were performed. All live integration requests were restricted to GET/HEAD and the storage list operation.

## Focused checks

- Actual Sharp validation/optimization, Supabase SDK protocol integration, media Route Handlers, existing homepage save actions, upload/gallery/selection/saved-reference/archive/restore checks: passed using isolated synthetic records and files.
- Browser tests of the actual gallery, drop upload, chooser, live desktop/mobile public-component previews, save/discard, usage protection, archive/restore, read-only staff, missing migration and responsive widths: passed against isolated transport.
- Homepage, CMS foundation, staff account and Agreement regression suites: passed.
- TypeScript, production build, focused lint and diff/secret review: passed.

These write checks do **not** demonstrate a real upload into a staging Supabase project. No separate staging project is configured in the workspace. Production was kept read-only as requested. Do not treat a Vercel Preview as a database sandbox: if it uses production Supabase, authenticated uploads, edits, saves and archives are real production mutations. Inspect with read-only requests until a separate safe environment is explicitly configured or an intended content change is authorized.

## Preview review boundary

The branch push uses the repository's existing Vercel GitHub integration. No Vercel environment, project setting or production alias is changed. Deployment URL, state and connected Supabase host are verified after the PR deployment is generated and reported in the completion message. No synthetic QA rows are seeded into deployed routes; fixtures and the isolated browser server are test scripts only. QA screenshots are clearly labelled.
