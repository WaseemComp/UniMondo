# UniMondo application system (`/apply`)

This document describes the multi-step application flow, validation, storage, and database layout for student submissions.

## Overview

- **Route:** `/apply` (public).
- **UI:** Six steps with a progress indicator — Personal Info, Academic Information, Study Preferences, Support Package, Documents, Review & Submit.
- **Forms:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) (`applicationFormSchema` in `src/lib/apply/schema.ts`).
- **Submit:** `POST /api/applications` as `multipart/form-data` (JSON application body + files + parallel metadata array).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by the API to insert rows and upload to Storage (bypasses RLS) |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket id (default: **`documents`**) |
| `EMAIL_WEBHOOK_URL` | Optional outbound webhook after successful submit |

See `.env.example` for placeholders.

## Storage bucket

- Bucket name: **`documents`** (created in `supabase/migrations/20260420120000_documents_bucket_applications.sql`).
- Upload path pattern: `{tracking_id}/{category}/{timestamp}-{safeFileName}`.
- Public URLs: `{SUPABASE_URL}/storage/v1/object/public/documents/...`
- Allowed types (migration): PDF, JPEG, PNG, WebP, DOC/DOCX; max size 50 MB per file (configurable in migration).

If uploads fail with **Bucket not found**, ensure the migration has been applied and `SUPABASE_STORAGE_BUCKET` matches the bucket id (or omit it to use the default `documents`).

## Database tables

### `public.applications`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | Primary key |
| `tracking_id` | `text` | Unique tracking number (generated server-side) |
| `user_id` | `uuid` nullable | Optional link to `auth.users` |
| `personal_info` | `jsonb` | Step 1 |
| `academic_info` | `jsonb` | Step 2 (GPA vs percentage, graduation flags, dates, IELTS) |
| `study_preferences` | `jsonb` | Step 3 (intake, continent, ranked destinations, program, notes) |
| `selected_package` | `text` | Package **slug** from CMS |
| `selected_addons` | `jsonb` | Array of add-on ids (strings/uuids) |
| `screening_tag` | `text` | From `evaluateApplication` |
| `review_status` | `text` | Default `Pending` (admin workflow) |
| `status` | `text` | Default `submitted` |
| `submitted_at` | `timestamptz` | Set on insert |
| `created_at` | `timestamptz` | Default `now()` |
| `payload` | `jsonb` | Normalized snapshot for email, admin, and legacy screening shape |

RLS: admin read/write for authenticated CMS admins; **service role** used by the Next API bypasses RLS for inserts.

### `public.documents`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | Primary key |
| `application_id` | `uuid` | FK → `applications.id` (cascade delete) |
| `file_url` | `text` | Public Storage URL |
| `file_name` | `text` | Original filename |
| `category` | `text` | One of `DOCUMENT_CATEGORIES` in `src/lib/apply/constants.ts` |
| `description` | `text` nullable | Optional per-file note |
| `uploaded_at` | `timestamptz` | Default `now()` |

## API: `POST /api/applications`

**Form fields:**

1. **`application`** — JSON string matching `serverSubmitPayloadSchema`:
   - `personalInfo`, `academicInfo`, `studyPreferences`, `packageSelection`
   - Optional: `sourceCountry`, `sourceProgram` (query/prefill from landing links)

2. **`documentMeta`** — JSON array, same length as files. Each item:
   - `category`: enum matching document categories
   - `description`: optional string (default `""`)

3. **`documents`** — repeated file parts (same order as `documentMeta`)

**Server flow:**

1. Validate JSON with Zod.
2. Build `payload` via `buildPayloadSnapshot` (`src/lib/apply/map-to-legacy.ts`) for screening + compatibility (`academicBackground.gpa` is normalized to a 4.0-scale number).
3. `evaluateApplication(payload.academicBackground)` → `screening_tag`.
4. `createApplicationWithDocuments` (`src/lib/persistence.ts`): insert `applications` row → upload each file to Storage → batch insert `documents` rows.
5. Optional `triggerStudentEmail` using `payload.personalInfo.email`.

**Response:** `{ trackingId, screeningTag }` on success.

## Step-by-step UX rules

1. **Personal:** name, email, phone, DOB, nationality.
2. **Academic:** GPA *or* percentage (conditional fields); IELTS; graduated vs not (graduation date vs expected graduation date).
3. **Preferences:** One ranked destination by default; **+ Add another destination** up to three; countries from a fixed list (no free-text destination); program interest + optional notes.
4. **Support package:** Three main packages from CMS (name + teaser/description only — **no prices** on this step). Add-ons as checkboxes. Free-submission disclaimer text is shown.
5. **Documents:** Six categories; multiple files per category; list shows name, category, optional description; uploads deferred until final submit.
6. **Review:** Summary and submit with loading/error states.

## Screening

`src/lib/screening.ts` uses `payload.academicBackground` (GPA on 4.0 scale + IELTS). GPA for non–4.0 scales or percentage is converted in `toScreeningGpaAndIelts` (`map-to-legacy.ts`).

## Admin

`GET /api/applications` returns applications with embedded `documents` metadata for the admin dashboard. Review status updates use `PATCH /api/applications/[trackingId]/status`.

## Key source files

| Area | File(s) |
|------|---------|
| Wizard UI | `src/components/apply-wizard.tsx` |
| Zod schemas | `src/lib/apply/schema.ts` |
| Categories / destinations | `src/lib/apply/constants.ts` |
| Payload / screening GPA | `src/lib/apply/map-to-legacy.ts` |
| DB + Storage | `src/lib/persistence.ts` |
| API | `src/app/api/applications/route.ts` |
| Types | `src/types/application.ts` |
| Migration | `supabase/migrations/20260420120000_documents_bucket_applications.sql` |
