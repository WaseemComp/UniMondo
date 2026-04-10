# UniMondo database (PostgreSQL / Supabase)

SQL migrations in `migrations/` define **content tables** you can deploy to Supabase (or any Postgres host) without changing the Next.js app yet.

## Tables

| Table | Purpose |
|--------|---------|
| `region_groups` | Filter buckets: Western Europe, Southern Europe, etc. |
| `countries` | Destination copy: universities list, visa blurb, costs, FK to `region_groups`. |
| `program_openings` | Current openings board rows (slug `id`, intake, deadline, tuition, etc.). |

Column names use **snake_case** in SQL (`logo_text`, `program_name`, …). Map to the app’s camelCase (`logoText`, `programName`) in API or server code.

## Apply on Supabase

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and link your project, **or** use the SQL Editor in the dashboard.
2. Run migrations in order:
   - `supabase db push` (CLI linked to project), **or**
   - Paste/run `20260331120000_initial_content_schema.sql`, then `20260331120001_seed_reference_data.sql` in the SQL Editor.

## Apply locally (Docker / Postgres)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260331120000_initial_content_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20260331120001_seed_reference_data.sql
```

## Security (RLS)

- **Anonymous + authenticated** users: `SELECT` allowed on `region_groups`, `countries`, and published `program_openings` (`is_published = true`).
- **Inserts/updates/deletes** are not granted to `anon` yet; use the **service role** key from server-side code or add policies when you build an admin UI.

## Environment variables (Next.js)

Set in `.env.local` (never commit):

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key (safe for browser)  

Optional for server-only features (e.g. `persistence.ts` uploads):

- `SUPABASE_SERVICE_ROLE_KEY` — **secret**; only on the server / CI; never expose to the client.

The app reads openings and countries via `src/lib/data/openings.ts` and `src/lib/data/countries.ts` using the **anon** client (RLS applies). If env vars are missing, it falls back to `src/lib/unimondo-data.ts`.

## Next steps (app integration)

1. Optionally generate TypeScript types: `supabase gen types typescript --linked > src/types/database.gen.ts`.
2. Tune `revalidate` on pages in `src/app/` if you need fresher or more cached data.
