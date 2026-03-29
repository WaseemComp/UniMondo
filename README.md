## UniMondo

Modern student-focused education consultancy platform for Europe admissions.

### Features

- Homepage with hero, trust badges, and current openings preview
- Destinations explorer grouped by region
- Filterable current openings with direct apply links
- 5-step application wizard with drag-and-drop document uploads
- Basic AI screening tags:
	- Eligible
	- Review Needed
	- Not Eligible
- Admin dashboard to review applications and update status
- Supabase-ready persistence and secure file storage (with in-memory fallback for local dev)

### Run Locally

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Create a `.env.local` file with the following variables.

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=application-documents
EMAIL_WEBHOOK_URL=
```

If Supabase variables are not provided, the app falls back to an in-memory store for local testing.

### Supabase Schema (Recommended)

```sql
create table if not exists applications (
	id bigint generated always as identity primary key,
	tracking_id text unique not null,
	submitted_at timestamptz not null,
	screening_tag text not null,
	review_status text not null,
	payload jsonb not null,
	documents jsonb not null default '[]'::jsonb
);
```

Create a public or private storage bucket named `application-documents`.

### Routes

- `/`
- `/destinations`
- `/current-openings`
- `/apply`
- `/about`
- `/contact`
- `/admin`

### API Endpoints

- `POST /api/applications` submit application and files
- `GET /api/applications` list applications (`?status=` optional)
- `PATCH /api/applications/:trackingId/status` update review status
