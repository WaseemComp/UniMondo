# UniMondo Admin Dashboard

This document describes the production-ready CMS built for UniMondo (Next.js 16 + Supabase): authentication, database tables, admin UI, public realtime updates, and operational checklist.

## Authentication and authorization

- **Login:** `/admin/login` uses Supabase Auth with `@supabase/ssr` (cookie session).
- **After login:** Middleware redirects admins to `/admin/dashboard`.
- **Who is an admin?**
  - Emails listed in `ADMIN_EMAILS` (comma-separated, case-insensitive), **or**
  - A row in `public.admin_profiles` linking `user_id` to `auth.users`.
- **Route protection:** `src/middleware.ts` calls `updateSessionAndGuardAdmin` so every `/admin/*` path except `/admin/login` requires a signed-in user that passes `isAdminEmail()` (see `src/lib/auth/admin.ts`).
- **Server actions:** `requireAdminUser()` verifies the session and `isAdminUser()` (env list **or** `admin_profiles`) before mutating data. Writes use the **service role** client (`SUPABASE_SERVICE_ROLE_KEY`) so operations succeed even if RLS write policies are not yet configured for a given user.

### Required environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser + RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — CMS saves, bypasses RLS |
| `ADMIN_EMAILS` | e.g. `adminone@unimondo.com` — must match your Auth user’s email |

Never expose the service role key to the client or commit it to git.

### Linking the first admin in the database

Migration `20260411130000_cms_programs_blogs_settings.sql` attempts:

```sql
insert into public.admin_profiles (user_id, email)
select id, email::text from auth.users
where lower(email::text) = 'adminone@unimondo.com'
on conflict (user_id) do nothing;
```

If that insert does not run (e.g. user created later), add the row manually in the SQL editor:

```sql
insert into public.admin_profiles (user_id, email)
select id, email::text from auth.users where email = 'adminone@unimondo.com'
on conflict (user_id) do nothing;
```

RLS policies for CMS tables use `public.is_cms_admin()`, which checks `admin_profiles`. Env-only admins still work for middleware and service-role server actions.

## Database schema (CMS)

Apply migrations with the Supabase CLI (`supabase db push`) or your hosted migration workflow.

### `public.programs`

Primary source for **Current Openings** and the homepage **Featured programs** block.

| Column | Notes |
|--------|--------|
| `id` | Text primary key (stable slug) |
| `title`, `university`, `country`, `degree` (`bachelor` \| `master`), `intake`, `deadline`, `tuition_range`, `description` | Core listing fields |
| `logo_url`, `logo_text` | Optional image URL; initials fallback |
| `continent`, `region` | Filter dimensions (e.g. Western Europe) |
| `is_published`, `sort_order` | Visibility and ordering |

Legacy rows from `program_openings` are copied into `programs` on migration when present.

### `public.countries` (extended)

Existing destination rows are extended with:

- `slug`, `flag_emoji`, `description`, `why_study`, `living_cost`, `popular_unis` (jsonb)

Legacy columns (`why_study_there`, `living_cost_approx`, `popular_universities`) stay in sync when saving from the admin country form.

### `public.blogs`

| Column | Notes |
|--------|--------|
| `slug` | Unique; used in `/blog/[slug]` |
| `content` | Stored as text (markdown-friendly; rendered with line breaks on the public post page) |
| `published` | Draft vs live |

### `public.site_settings`

Singleton row `id = 1`: `ticker_text`, `ticker_active`. Powers the top marquee under the main navigation.

### RLS summary

- **Public read:** Published programs and blogs; all countries; site settings row; `is_cms_admin()` can read drafts where policies allow.
- **Authenticated CMS admins** (`admin_profiles`): full CRUD on programs, countries, blogs, site settings per migration policies.
- **Service role:** Used in server actions; bypasses RLS.

### Realtime

The migration tries to add `programs`, `countries`, `site_settings`, and `blogs` to the `supabase_realtime` publication. If that step fails in your environment, enable replication for those tables in the Supabase Dashboard (**Database → Replication**).

Public pages subscribe with the **anon** browser client:

- Home featured programs: `FeaturedProgramsLive` → `programs`
- Destinations: `DestinationsLive` → `countries`
- Marquee: `SiteMarquee` → `site_settings` (`id=eq.1`)

## Admin UI routes

| Path | Purpose |
|------|---------|
| `/admin/dashboard` | Stats: program/country/blog counts + ticker status |
| `/admin/programs` | CRUD programs (table + modal form) |
| `/admin/countries` | CRUD countries (region group, slug, emoji, copy, universities) |
| `/admin/blogs` | CRUD blog posts |
| `/admin/settings` | Ticker text + on/off |

Legacy shortcuts:

- `/admin/data/programs` → redirects to `/admin/programs`
- `/admin/data/countries` → redirects to `/admin/countries`

Homepage copy and multi-item news ticker remain under `/admin/content/*` for backward compatibility.

## Public site wiring

- **Marquee:** `src/app/(public)/layout.tsx` loads `getSiteSettings()` and renders `SiteMarquee` below `SiteHeader`.
- **Featured programs:** `HomePage` uses `FeaturedProgramsLive` with server-rendered `getOpenings()` as initial data; client listens for `programs` changes.
- **Destinations:** `DestinationsLive` wraps `DestinationsBrowser` with a `countries` subscription.
- **Blog:** `/blog` lists published posts; `/blog/[slug]` shows a post.
- **Openings data:** `getOpenings()` prefers `programs`, then falls back to `program_openings`, then static seed data.

## Validation and UX

- **Zod** validates payloads in `src/app/admin/cms/*-actions.ts`.
- **Sonner** toasts (`<Toaster />` in root layout) for save/delete feedback.
- Admin tables are responsive (horizontal scroll on small screens); forms use modal dialogs (`<dialog>`).

## Security reminders

1. Rotate any API keys that were ever pasted into chat or committed by mistake.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` only on the server (e.g. Vercel environment variables).
3. Prefer `ADMIN_EMAILS` + strong passwords for Auth users; use `admin_profiles` for RLS-aligned DB access from authenticated clients if you add non–service-role writes later.

## Production: Vercel & Supabase (cannot be done from this repo alone)

The hosting provider and Supabase project are **your** accounts. This codebase cannot push secrets to Vercel or toggle the Supabase UI for you. Do the following once per environment (e.g. **Production** on [Vercel](https://vercel.com/dashboard) and your [Supabase project](https://supabase.com/dashboard)).

### 1. Set environment variables on the server (Vercel)

1. Open **Vercel** → your UniMondo project → **Settings** → **Environment Variables**.
2. Add (at minimum):
   - `NEXT_PUBLIC_SUPABASE_URL` — same as in Supabase → Project Settings → API.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **anon** public key (not the service role).
   - `SUPABASE_SERVICE_ROLE_KEY` — **service_role** secret (server-only; enable for Production, and Preview if you test CMS there).
   - `ADMIN_EMAILS` — e.g. `adminone@unimondo.com` (comma-separated if multiple).
3. **Save**, then trigger a **new deployment** (Deployments → … → Redeploy, or push a commit). Env vars are applied on build/runtime after redeploy.

### 2. Realtime replication (Supabase)

Migrations already run `ALTER PUBLICATION supabase_realtime ADD TABLE …` for `programs`, `countries`, `site_settings`, and `blogs`. If live updates still do not fire in the browser:

1. In **Supabase Dashboard** → **Database** → **Publications** (or **Replication**, depending on dashboard version), open **`supabase_realtime`**.
2. Ensure these tables are enabled for realtime: `programs`, `countries`, `site_settings`, `blogs`.

**Verify in SQL** (Supabase → **SQL Editor**):

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('programs', 'countries', 'site_settings', 'blogs')
order by tablename;
```

You should see four rows after migrations (or after enabling them in the UI).

## Checklist after deploy

1. Run all migrations on the production database.
2. Set `ADMIN_EMAILS` and server keys on the host (e.g. Vercel).
3. Confirm `admin_profiles` contains your admin user (or rely on env-only + service role).
4. In Supabase, confirm **Replication** includes CMS tables if realtime is required.
5. Smoke-test: login → edit ticker → confirm marquee updates without refresh; edit a program → confirm homepage section updates live.

---

*Generated for the UniMondo Next.js 16 project — April 2026.*
