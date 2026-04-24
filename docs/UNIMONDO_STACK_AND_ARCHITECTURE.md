# UniMondo — Full Stack, Architecture, and Tooling (Detailed)

This document explains **what UniMondo is built with**, how the **frontend + backend + database** fit together, and what **tools** are used across development, build, deployment, authentication, storage, and content management.

> Repo type: **single Next.js codebase** (frontend + server/API in one project), with **Supabase/Postgres** as the recommended backend database and storage.

## 1) High-level architecture (what talks to what)

### Runtime building blocks
- **Frontend UI**: Next.js App Router pages under `src/app/` rendered with React.
- **Backend/API**: Next.js Route Handlers under `src/app/api/**` (runs server-side).
- **Database**: Postgres (typically **Supabase Postgres**) with schema defined by SQL migrations in `supabase/migrations/`.
- **File storage**: Supabase Storage bucket (`documents`) for uploaded application documents.
- **Auth (Admin)**: Supabase Auth + cookie session middleware (via `@supabase/ssr`) for `/admin`.
- **Email notifications**: Optional webhook (`EMAIL_WEBHOOK_URL`) called from the server after application submission.

### Key “flows”
#### Public website content/data
- Public pages load content from Supabase tables using an **anon key** (RLS policies apply).
- If Supabase env vars are not set, some data falls back to a local in-repo dataset (`src/lib/unimondo-data.ts` as referenced by the Supabase README).

#### Applications (/apply) submission + document upload
1. User completes the multi-step form in the UI.
2. Browser submits a `multipart/form-data` POST to `POST /api/applications`.
3. Server validates input with Zod schemas.
4. Server writes an application row to Postgres (Supabase REST).
5. Server uploads files to Supabase Storage (`documents` bucket) and saves per-file metadata rows in `public.documents`.
6. Server optionally triggers a webhook email (if configured).

#### Admin panel (/admin/*)
- Admin routes require Supabase Auth session cookies.
- The session is managed with `@supabase/ssr` middleware patterns.
- Access is restricted by:
  - `ADMIN_EMAILS` environment variable allowlist, and/or
  - a row in `public.admin_profiles` in the database (CMS-style admin).

## 2) Frontend (UI) — framework, structure, and libraries

### Framework
- **Next.js**: `next` (v16.x in `package.json`)
  - Uses the **App Router** (folders under `src/app/`)
  - Supports **Server Components** + Route Handlers
  - Uses **Turbopack** configuration (`next.config.ts` sets `turbopack.root`)
- **React**: `react` + `react-dom` (v19.x)
- **TypeScript**: `typescript` with strict typing enabled (`tsconfig.json`)

### Routing / Pages (high-level)
Public pages live under `src/app/(public)/...` (examples from repo routes):
- `/` (home)
- `/destinations`
- `/current-openings`
- `/programs`
- `/packages`
- `/apply`
- `/blog` and `/blog/[slug]`
- `/about`
- `/contact`

Admin pages live under `src/app/admin/...`:
- `/admin/login`
- `/admin/dashboard`
- data and content management sections (programs, countries, regions, blogs, content pages, settings, submissions, etc.)

### UI + UX libraries
From `package.json` dependencies:
- **Tailwind CSS v4**: styling system; `src/app/globals.css` imports Tailwind via `@import "tailwindcss";`
  - PostCSS plugin: `@tailwindcss/postcss` (`postcss.config.mjs`)
- **shadcn**: component scaffolding/tooling (`shadcn` dependency) plus a `components.json` config file
- **@base-ui/react**: UI primitives library
- **class-variance-authority**, **clsx**, **tailwind-merge**: conditional styling + class merging
- **tw-animate-css**: animation utilities
- **framer-motion**: animations and transitions
- **lucide-react**: icon set
- **sonner**: toast notifications (Toaster mounted in `src/app/layout.tsx`)
- **react-hook-form** + **@hookform/resolvers** + **zod**: forms + schema validation (client + server)
- **swr**: client-side data fetching/caching pattern where used
- **react-easy-crop**: cropping UI (used for media like team photos)

### Fonts and static assets
- Google fonts via `next/font/google` (e.g. Manrope, Playfair Display).
- Static assets live in `public/`.

### Images configuration
`next.config.ts` allows:
- Unsplash (`images.unsplash.com`)
- Optionally Supabase storage public objects (based on `NEXT_PUBLIC_SUPABASE_URL` hostname)

## 3) Backend (server/API) — what exists and how it works

UniMondo uses **Next.js Route Handlers** as its backend API. These are TypeScript modules that export HTTP methods (GET/POST/PATCH/etc.) and run on the server.

### API endpoints in this repo
From `README.md` and the code under `src/app/api/`:
- **`POST /api/applications`**: submit an application + uploaded documents
- **`GET /api/applications`**: list applications; optional `?status=` filter
- **`PATCH /api/applications/:trackingId/status`**: update an application review status

#### `POST /api/applications` (application submission)
Location: `src/app/api/applications/route.ts`

What it does:
- Reads a `multipart/form-data` body:
  - `application` (JSON string)
  - `documentMeta` (JSON string; optional)
  - `documents` (file list)
- Validates:
  - Application payload with Zod (`serverSubmitPayloadSchema`)
  - Document metadata list with Zod (`documentMetaListSchema`)
- Generates:
  - A **tracking id** (`generateTrackingId()` in `src/lib/tracking.ts`)
  - A **screening tag** (`evaluateApplication()` in `src/lib/screening.ts`)
  - A “payload snapshot” for compatibility/reporting (`buildPayloadSnapshot()`)
- Persists the application + uploads documents via `createApplicationWithDocuments()` in `src/lib/persistence.ts`
- Triggers optional email webhook via `triggerStudentEmail()` (`src/lib/notifications.ts`)

#### `GET /api/applications` (admin listing)
Location: `src/app/api/applications/route.ts`

What it does:
- Reads optional query `status`
- Calls `getApplications(status?)` from `src/lib/persistence.ts`
- Returns `{ applications }` JSON

#### `PATCH /api/applications/:trackingId/status`
Location: `src/app/api/applications/[trackingId]/status/route.ts`

What it does:
- Reads JSON `{ reviewStatus }`
- Validates against allowed statuses:
  - `Pending`, `Approved`, `Need More Info`, `Rejected`
- Calls `updateApplicationStatus(trackingId, reviewStatus)` from `src/lib/persistence.ts`

### Persistence layer (DB + Storage abstraction)
Location: `src/lib/persistence.ts`

This module abstracts “save and fetch applications” and supports two modes:
- **Supabase mode** (recommended): enabled when both are present:
  - `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
  - `SUPABASE_SERVICE_ROLE_KEY`
- **In-memory fallback** (local dev/testing): when the service role key is missing

In Supabase mode it uses:
- **Supabase REST API** (PostgREST) for database writes/reads:
  - `POST /rest/v1/applications` (insert)
  - `GET /rest/v1/applications?...` (select with embedded `documents`)
  - `PATCH /rest/v1/applications?tracking_id=eq...` (update)
- **Supabase Storage HTTP API** for file uploads:
  - `POST /storage/v1/object/<bucket>/<path>`
- The **service role key** is sent as `apikey` and `Authorization: Bearer ...` (server-side only).

## 4) Database (Supabase/Postgres) — schema, tables, RLS, and storage

The database is designed to run on **Supabase Postgres** (but is valid Postgres in general). The source of truth lives under:
- `supabase/migrations/*.sql`

### Core content schema (destinations + openings)
Migration: `supabase/migrations/20260331120000_initial_content_schema.sql`

Tables:
- **`public.region_groups`**: region buckets used by filters
- **`public.countries`**: destination pages (copy + region mapping)
- **`public.program_openings`**: legacy “openings board” rows (later migrated into `public.programs`)

RLS highlights:
- Public read (anon/authenticated) is allowed for:
  - `region_groups`
  - `countries`
  - `program_openings` but only where `is_published = true`

### CMS v2 schema (programs, blogs, settings, admin function)
Migration: `supabase/migrations/20260411130000_cms_programs_blogs_settings.sql`

Adds/defines:
- **`public.is_cms_admin()`**: helper function (security definer) that checks whether `auth.uid()` exists in `public.admin_profiles`
- **`public.programs`**: current openings/programs table used by CMS/public listing
- **`public.blogs`**: blog posts with `published` flag
- **`public.site_settings`**: singleton settings row (e.g. ticker)
- Extra CMS columns to `public.countries` (`slug`, `flag_emoji`, etc.)
- Adds some tables to **Supabase Realtime** publication (best-effort)

RLS highlights:
- Public read allowed for published content; admins can read draft content too:
  - `programs`: `is_published = true OR is_cms_admin()`
  - `blogs`: `published = true OR is_cms_admin()`
  - `site_settings`: public read allowed
- Admin writes allowed for authenticated users where `is_cms_admin() = true`

### Admin/CMS base tables
Migration: `supabase/migrations/20260331200000_admin_cms.sql`

Defines:
- **`public.admin_profiles`**: admin allowlist table (links to `auth.users`)
- **`public.site_content`**: key/value editable copy (labels, page/section, sort order)
- **`public.news_ticker_items`**: optional ticker messages (published/unpublished)

RLS highlights:
- Public can read `site_content`
- Public can read published `news_ticker_items`
- Authenticated users can read their own `admin_profiles` row

### Applications + documents + storage bucket
Migration: `supabase/migrations/20260420120000_documents_bucket_applications.sql`

Defines:
- **Supabase Storage bucket `documents`**
  - public = true
  - size limit ~50MB
  - allowed MIME types include PDF + images + doc/docx
- **`public.applications`**: normalized jsonb columns + payload snapshot
- **`public.documents`**: metadata for each uploaded file, linked to an application

RLS highlights:
- `applications` and `documents` are admin-only via `is_cms_admin()` (for authenticated users)
- The Next.js API uses the **service role** key for inserts (bypasses RLS)

## 5) Authentication & authorization (Admin)

### Supabase Auth
- Admin users are **Supabase Auth users**.
- A one-time helper script exists to create an admin user via Supabase Admin API:
  - `npm run seed:admin`
  - Runs `scripts/create-admin-user.mjs` (needs `SUPABASE_SERVICE_ROLE_KEY`)

### Admin access rules in app code
Location: `src/lib/auth/admin.ts`

An authenticated user is considered “admin” if:
- Their email appears in `ADMIN_EMAILS` (comma-separated env var), OR
- They have a row in `public.admin_profiles` (checked using the service role client)

### Session/cookies integration for Admin routes
UniMondo uses `@supabase/ssr` to keep sessions in cookies so middleware and server components can see the same session.

Key modules:
- `src/lib/supabase/browser.ts`: browser client (cookie-based session)
- `src/lib/supabase/server-auth.ts`: server client (cookie-based session)
- `src/lib/supabase/middleware.ts`: session refresh + `/admin` route guarding
- `src/app/admin/(panel)/layout.tsx`: server-side guard (redirects non-admins)

## 6) Notifications (Email webhook)

Location: `src/lib/notifications.ts`

- If `EMAIL_WEBHOOK_URL` is set, the server will POST a JSON payload when an application is received.
- If it is not set, UniMondo simply skips sending email (no error thrown).

## 7) Build, lint, and developer tooling

### Package manager and runtime
- **Node.js** project (see `package.json`), using:
  - `npm run dev` → `next dev`
  - `npm run build` → `next build`
  - `npm run start` → `next start`
  - `npm run lint` → `eslint`

### TypeScript config
File: `tsconfig.json`
- `strict: true`
- Path alias: `@/*` → `./src/*`

### ESLint
File: `eslint.config.mjs`
- Uses `eslint-config-next` presets:
  - `core-web-vitals`
  - TypeScript ruleset

### Tailwind / PostCSS
File: `postcss.config.mjs`
- Uses Tailwind’s PostCSS plugin (`@tailwindcss/postcss`)

### Supabase tooling
- Recommended to use **Supabase CLI** for pushing migrations (per `supabase/README.md`)
- Alternatively run SQL in Supabase dashboard SQL editor, or via `psql` against any Postgres.

## 8) Environment variables (what they do)

From `README.md` and `.env.example`:

### Required for Supabase-backed mode
- **`NEXT_PUBLIC_SUPABASE_URL`**: Supabase project URL (used by browser + server anon client)
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Supabase anon/public key (safe for browser)
- **`SUPABASE_SERVICE_ROLE_KEY`**: Supabase service role key (server-only secret; used for admin inserts/uploads)

### Storage
- **`SUPABASE_STORAGE_BUCKET`**: bucket name (defaults to `documents` in code)

### Admin
- **`ADMIN_EMAILS`**: comma-separated allowlist for `/admin`
- **`ADMIN_SEED_PASSWORD`**: one-time seed password (never commit) for `npm run seed:admin`
- Optional: `ADMIN_SEED_EMAIL`

### Email
- **`EMAIL_WEBHOOK_URL`**: optional webhook endpoint to send “application received” emails

## 9) Where to look for “everything” (map of important folders/files)

### App Router pages and API
- `src/app/(public)/**`: public pages + public layout
- `src/app/admin/**`: admin login + panel pages/layout
- `src/app/api/**`: backend API endpoints (Route Handlers)
- `src/app/globals.css`: Tailwind import + global styles

### Domain logic
- `src/lib/persistence.ts`: DB + storage abstraction (Supabase vs in-memory)
- `src/lib/supabase/**`: Supabase clients (browser/server/service role) + middleware helpers
- `src/lib/auth/admin.ts`: admin allowlist checks
- `src/lib/apply/**`: application wizard schema and payload mapping
- `src/lib/data/**`: read models for content (settings, countries, programs, blogs, etc.)
- `supabase/migrations/**`: database schema and policies

### Repo-level configs
- `package.json`: dependencies + scripts
- `next.config.ts`: Next config (images, turbopack)
- `tsconfig.json`: TypeScript compiler settings
- `eslint.config.mjs`: linting
- `postcss.config.mjs`: Tailwind/PostCSS
- `.env.example`: environment variable template

## 10) “What is frontend vs backend vs database” in this repo (clear separation)

- **Frontend**: everything React-rendered in `src/app/**` and UI components in `src/components/**`.
- **Backend**: Next.js server runtime:
  - Route handlers in `src/app/api/**`
  - Server-side data loading in Server Components / server actions that call `src/lib/**` modules
- **Database**: Postgres schema in `supabase/migrations/**` and Supabase storage bucket definition/policies.

## 11) Notes / security essentials

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (it bypasses RLS).
- `NEXT_PUBLIC_*` variables are embedded into the client bundle; only put safe values there (URL + anon key).
- Uploaded files are stored in a **public** bucket in the migrations shown; if you need private documents, you’d switch bucket public=false and use signed URLs.
