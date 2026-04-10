# Admin guide: regions, countries, universities & program openings

This document explains **how content flows** from the database to the website (Programs / Current Openings, Destinations) and **how an admin can update it** today and in the future.

---

## Where the data lives

| What you manage | Database table | Where it appears on the site |
|-----------------|----------------|------------------------------|
| **Region groups** (filters / grouping) | `region_groups` | Destinations page (group headers), indirectly in filters on Current Openings |
| **Countries** (destination copy) | `countries` | `/destinations` — country tabs, “why study there”, popular universities list, visa, costs |
| **Program openings** (each degree row) | `program_openings` | `/current-openings`, homepage “Featured programs”, Programs nav |

**Important:** Program rows store **text** for `country`, `region`, and `university`. They are **not** foreign keys to a separate “universities” table. So:

- Adding a **country** in `countries` does **not** automatically create programs; you still add rows in `program_openings`.
- The **university name** on a card is the `university` field on each program row (plus `logo_text` for the badge).

---

## How an admin can do this **today** (no custom admin UI yet)

### Option A — Supabase Dashboard (recommended for now)

1. Open your project: [Supabase Dashboard](https://supabase.com/dashboard) → **Table Editor**.
2. Use the tables below. The **anon** key only allows **read**; to **insert/update/delete** you need either:
   - **Dashboard Table Editor** (uses your owner account — full access), or  
   - **Service role** in a secure server environment (see “Later” below).

#### Add or edit **regions** (`region_groups`)

- Columns: `label` (e.g. `Western Europe`), `sort_order` (display order).
- Used when linking **countries** to a region (`countries.region_group_id`).

#### Add or edit **countries** (`countries`)

- Set `name` (e.g. `Italy`), `region_group_id` (pick the right region row), `highlighted`, `why_study_there`, `popular_universities` (array of strings), `living_cost_approx`, `visa_info`, `sort_order`.
- After saving, wait up to **~1 minute** (site uses 60s revalidation) or refresh; `/destinations` updates.

#### Add or edit **programs / current openings** (`program_openings`)

Each row is one card on **Current Openings**.

| Column | Purpose |
|--------|--------|
| `id` | Stable slug, e.g. `it-bologna-data-fall-2026` (no spaces; unique). |
| `continent` | Usually `Europe`. |
| `country` | Must match filter labels (e.g. `Italy`) — same spelling as in filters. |
| `region` | Must match **region group label** used elsewhere (e.g. `Southern Europe`). |
| `intake` | e.g. `Fall 2026`, `Spring 2027` — must match filter options if you add new intakes later. |
| `university` | Full school name shown on the card. |
| `logo_text` | Short badge (e.g. `UB`). |
| `program_name` | Degree title (e.g. `MSc Data Science`). |
| `deadline` | Date (`YYYY-MM-DD`). |
| `tuition_range` | Free text (e.g. `EUR 2,500 - 4,200`). |
| `is_published` | `true` = visible to public; `false` = hidden. |
| `sort_order` | Lower numbers appear first (within your query ordering). |

After publishing, **Current Openings** and the **homepage featured block** refresh on the same ~60s cadence (or on redeploy).

### Option B — SQL Editor

Run `INSERT` / `UPDATE` statements in **SQL Editor** if you prefer. Keep the same column names as in `supabase/migrations/`.

---

## How this should work **later** (suggested plan)

Goal: associates never touch raw tables unless they want to.

1. **Admin area** in the app (e.g. `/admin/content` or extend existing `/admin`), protected by **Supabase Auth** (email login) with a role flag (e.g. `admin` / `editor` in `profiles` or JWT claims).

2. **Server-only API routes or Server Actions** that use the **service role** key **only on the server** to insert/update rows. Never expose service role to the browser.

3. **Forms** aligned with the tables:
   - **Programs:** create/edit `program_openings` with validation (dates, required fields).
   - **Countries:** create/edit `countries` + pick `region_group` from a dropdown fed by `region_groups`.
   - **Regions:** rarely changed; small CRUD on `region_groups` for owners only.

4. **Optional improvements**
   - **Foreign keys:** link `program_openings.country` to `countries.name` or a `country_id` for consistency.
   - **Universities table:** only if you need reuse across many programs; otherwise keeping `university` on each program is fine for v1.
   - **Cache:** call `revalidatePath('/')` / `revalidatePath('/current-openings')` after saves so updates appear immediately instead of waiting for the 60s window.

---

## Checklist: “New program in Italy”

1. Confirm `region_groups` has the right region (e.g. `Southern Europe`).
2. Confirm `countries` has **Italy** (for `/destinations`); optional for programs but recommended.
3. Insert a row in `program_openings` with matching `country`, `region`, `intake`, `university`, dates, `is_published = true`.
4. Verify **Table Editor → program_openings** row looks correct.
5. Open `/current-openings` and homepage after a short wait or trigger redeploy/revalidate.

---

## In-app admin (this repo)

After configuring `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — required to **save** homepage/ticker from the UI)
- `ADMIN_EMAILS` — comma-separated addresses allowed into `/admin`

1. Create a user in **Supabase → Authentication → Users** (email/password).
2. Add that email to `ADMIN_EMAILS`.
3. Run SQL migrations (including `20260331200000_admin_cms.sql` for `site_content` + `news_ticker_items`).
4. Open **`/admin/login`**, then use the sidebar: **Homepage**, **News ticker**, **Programs**, **Countries**, **Regions**, **Applications**.

Programs/countries/regions tables are **view + link to Supabase** for full edits; homepage copy and ticker are **editable in-app**.

---

## Summary

| Role | Today | Suggested next step |
|------|--------|---------------------|
| Owner / associate | **Admin UI** at `/admin` for hero + ticker; Supabase Table Editor for detailed program rows | Add inline program edit forms when needed. |
| Future | Same | Stricter roles in `admin_profiles`, audit log, preview drafts. |

For schema details and RLS notes, see `supabase/README.md`. For local env vars, see `.env.example`.
