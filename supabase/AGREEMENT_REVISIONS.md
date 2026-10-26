# Agreement revisions release

Migration: `20261026120000_agreement_revisions.sql`.

The migration creates only agreement-specific state, finalized revisions and audit events. Existing `agreements` and fallback `site_content` rows remain unchanged. The backfill copies complete raw JSON, including financial snapshots, without running pricing calculations. Duplicate references, unsupported statuses or malformed legacy JSON abort the transaction for review. Existing finalized records become immutable revision 1. Old duplicate fallback entries remain stored; the primary agreement remains authoritative.

Staff edits are stored separately as pending drafts. They leave the current finalized version and status intact. Superadmin can finalize the draft (superseding the previous revision) or reopen the agreement. Every mutation uses a per-agreement transaction lock, row lock and expected version. Each finalized snapshot and event is append-only. Deletion hides the agreement and retains the original row, revisions and a complete deletion snapshot.

All browser-role writes and direct RPC execution are denied. Only the server's service role can call the mutation RPC; the API checks the signed-in user's admin, discount and Superadmin permissions first. Server-only revision access also protects legacy agreement entries from the otherwise public `site_content` policy. Raw original rows cannot be updated/deleted by an older deployment once revision state exists.

## Local checks

Use a disposable local container; the regression suite never connects to production:

```sh
docker run --name unimondo-agreement-test -e POSTGRES_PASSWORD=local-agreement-test -p 127.0.0.1:55439:5432 -d postgres:17
npm run test:agreements:regressions
npm run test:agreements
npx tsc --noEmit
npm run build
```

The regression runner creates a new isolated database each run. It rehearses rollback, verifies unchanged original snapshots, exercises real PostgreSQL concurrent transactions and role/RLS checks, and calls the API handlers with isolated authentication. Stop the disposable container after verification.

## Production order

1. Confirm the linked project matches `NEXT_PUBLIC_SUPABASE_URL`. Use the project's established Supabase CLI connection, with database write access. Run `supabase migration list` and `supabase db push --dry-run`; confirm that only reviewed migrations will be applied. Do not repair migration history or apply unrelated migrations automatically.
2. Before applying, retain a protected backup of original agreement rows and legacy fallback snapshots. Compare counts and snapshot hashes after applying. Check that every original finalized record has exactly one matching imported revision. Never print private agreement data or credentials.
3. Apply with `supabase db push` only after the focused tests pass. The migration's explicit transaction and locks make its backfill and access-control changes atomic. An error rolls back the complete migration.
4. Pause agreement writes between migration and application rollout; older deployments cannot write the preserved original rows. Deploy the matching application commit through the existing Vercel integration. Verify the deployment's Git SHA and smoke-test agreements, history downloads and permission failures. Avoid writes to existing production agreements during smoke tests.

## Rollback

Before commit, PostgreSQL can roll back the entire migration; the regression suite rehearses that path and verifies original rows survive unchanged. After application use starts, do not drop revision tables or revert to an old writable application: those actions would lose access to new drafts/finalizations or reintroduce permission problems. Retain all revision/audit data, temporarily disable agreement writes if required, and roll forward with a corrected build. Original rows remain available as a preserved baseline. No destructive down migration is provided.

## Manual migration handoff

The owner will apply the production migration. In the Supabase SQL Editor for the linked UniMondo project, run the complete contents of `supabase/migrations/20261026120000_agreement_revisions.sql` once (including its transaction). Do not run the local bootstrap fixture. Keep a backup of agreement data before running. If any statement fails, stop and report the error; do not remove constraints or alter existing records to force the backfill through.

After applying, run the read-only verification in `supabase/tests/agreement-production-verification.sql`. The imported-snapshot mismatch counts must all be zero. Confirm success before merging/deploying the feature branch. If SQL Editor is used rather than the CLI, retain the migration in source control and reconcile its version in the project's established migration-history workflow before a future CLI push.
