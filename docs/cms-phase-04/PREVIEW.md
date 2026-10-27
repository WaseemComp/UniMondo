# Phase 04 Preview preparation

The owner authorized commit and push of `codex/cms-phase-04-homepage-management`, a PR against latest `main`, and the existing Vercel Preview workflow. Production merge/deployment and Phase 05 remain outside this authorization.

The completed regression suites and Safari control attempts are not repeated. A final diff review found one narrow save-confirmation correction: compare JSONB values structurally instead of comparing JSON serialization order, because PostgreSQL can reorder object keys. The isolated collection fixture now emulates reordered JSONB keys, and the affected collection/action suite and TypeScript check pass.

No new SQL, schema change, account operation, permission assignment change or live data mutation is required. New fixture/test modules are not used by application routes, and no test data is seeded into a deployed website.

Preview build/check results, exact URL and commit are reported after Vercel creates the deployment. The existing project environment configuration is retained. The workspace configuration points to production Supabase; until the deployed Preview's environment is independently confirmed, treat its saves, uploads and archives as production operations. Live verification during preparation is read-only. Vercel CLI is logged out, so protected configuration may require the owner's existing Vercel session to inspect.

The owner will inspect the Preview in Safari and provide approval or corrections. Existing Safari visual-QA limitations remain documented; Preview preparation does not claim that those checks have been performed.
