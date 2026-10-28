# Post-launch enhancements — Preview preparation

The owner manually applied `20261101090000_post_launch_enhancements.sql` and confirmed every row in `verify-installation.sql` has `passed=true`. The migration was not rerun. Commit, push, PR and Vercel Preview are authorized; merge, production deployment, production test writes and publishing activation are not.

## Installed schema and security

All live checks used GET only against the existing production Supabase project. Required currency/region/course/pricing columns are readable. The service OpenAPI contract includes snapshot/save-draft/transition/currency-management functions; only the read-only snapshot function was invoked. Snapshots for regions, hero slides, footer, courses, packages and add-ons succeed with the expected scopes. Anonymous direct reads of the currency registry and all three private publishing tables, and anonymous snapshot execution, are denied with PostgreSQL `42501`.

The owner’s SQL results confirm the registry RLS and zero policies, private role grants and function execution, enabled publication guards, currency foreign keys, course source uniqueness, and four-decimal price columns. REST metadata/OPTIONS alone are not treated as proof of these PostgreSQL catalogue checks.

The seven defaults EUR, PKR, LYD, TND, TRY, USD and BDT are present and active, with expected decimal precision. The additional legacy GBP entry remains inactive. `cms_publishing_settings.enabled=false` was independently read from production.

## Existing data and financial compatibility

- Current read-only counts: 5 regions, 15 countries, 6 universities, 10 programmes, 3 packages, 3 add-ons, 6 Agreements and matching Agreement state rows, 2 finalized revisions, and 0 application/submission rows in the unified `applications` table. No student identity fields were retrieved.
- All ten legacy programme IDs remain present with matching country/university associations. No dangling regional, country or university foreign keys were found. Country/university/programme counts match the earlier read-only baseline of 15/6/10.
- Both finalized Agreement state financial JSON snapshots exactly match the corresponding immutable finalized revision financial JSON: two compared, zero mismatches and zero missing financial snapshots. No calculation or currency conversion was invoked against production.
- Course records remain zero; the three existing public source-code course cards are effective defaults, not fabricated database rows.
- All package/add-on currency columns remain null, retaining their pre-existing USD interpretation. Current full/instalment values are listed below; the latest package update predates this migration. Numeric(12,2) → numeric(16,4) is a precision widening, not conversion or rounding. No backfill or business-row UPDATE/DELETE exists in the prepared migration.

- packages: `standard` — full 500, instalment not set, legacy USD.
- packages: `admission-premium` — full 800, instalment 1200, legacy USD.
- packages: `basic` — full 200, instalment not set, legacy USD.
- addons: `scholarship-application` — full 250, instalment 300, legacy USD.
- addons: `post-admission-visa` — full 300, instalment 350, legacy USD.
- addons: `extra-country-1` — full 100, instalment not set, legacy USD.

No pre-migration complete database snapshot is available for byte-for-byte comparison of every historical row. The checks establish current availability, retained legacy IDs/associations, unchanged recorded Agreement snapshots, and absence of conversion/backfill logic; they are not represented as a full historical database audit.

## Narrow release correction

Final currency compatibility review found that legacy Application PDF/ZIP exports always labelled package amounts USD and combined all selected prices. The correction uses each record’s currency and registered precision, separate per-currency totals, and font-compatible ISO codes. Unavailable prices remain unavailable instead of becoming zero quotes. Synthetic application export checks use isolated SDK transports; no production export, record mutation or student data is used. The pre-existing export design resolves current catalogue prices; it does not establish historical application price snapshots. Agreement exports remain a separate unchanged implementation.

## Verification and Preview boundary

Previously passed implementation checks are documented in README.md. Only focused export/SQL checks, lint and the production build are repeated for the release correction. Existing Safari automation attempts and full audits are not repeated. Browser pixel/visual QA is for the owner’s Preview inspection; no signed-in browser pass is claimed.

The release correction passed `npm run test:post-launch` with actual synthetic Application PDF/ZIP output and separate LYD/TND totals; focused ESLint, whitespace checks, TypeScript and the final production build (52 static pages plus protected dynamic routes) also passed. Production homepage, destinations, courses, packages and Apply returned 200. Existing protected admin routes returned login redirects; Agreement/Application APIs returned 401 without a session. No production test writes were made.

The Vercel Preview must reach Ready and both existing GitHub checks must pass for the exact committed SHA. Deployment protection must remain in place. Treat Preview as production-connected; no saves, uploads, archive, deletion, currency change or publishing tests are permitted. No production deployment or merge is authorized.
