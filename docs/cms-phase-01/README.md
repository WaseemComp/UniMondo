# UniMondo CMS 2.0 — Phase 01

Implemented on `codex/cms-phase-01-foundation`, based on production commit `d2533050158b88acd472487099b72987bcd5dbad`. The feature branch is authorized for commit, pull request and Vercel Preview review only. Merging to main and production deployment require separate authorization. No migration is required or supplied.

## Presentation changes

- A scoped Mediterranean Fresh administration theme, using cloud/white surfaces, mint navigation, teal primary actions, sky informational accents, restrained olive details and neutral text. Public CSS remains unchanged.
- Responsive Content Studio shell with authorized existing routes, page title/breadcrumbs, account name/role, existing sign-out action, public-site links and a working section finder (also Cmd/Ctrl+K).
- Mobile navigation with a scrollable module list, focus containment, Escape dismissal, background interaction/scroll locking and focus restoration. Skip link, labelled icon controls, focus outlines and reduced-motion support.
- Existing Packages, About, Contact and operational routes are retained. Universities & Programs opens the existing Programs route; the old Universities route redirects to Destinations. Team & Permissions and Settings use anchors on the existing Team & account screen. Media Library is a noninteractive later-phase label; no destination was invented.
- Dashboard reads existing tables for authorized counts, pending applications, draft agreements and recently updated content metadata. Missing information shows an unavailable state, never fabricated zeros. It loads neither agreement snapshots nor student identity details.
- Scoped shared-card, input, select, button, table and modal presentation; actual account/permission/action implementations are reused. Wide tables scroll inside their container.
- Loading, error/retry and empty states. Reusable page header, status badges, section/editor workspace slots, optional preview panel and action area, plus saved/inherited/default field-context presentation for future editors. No upload, publishing or new editor workflow was implemented.
- Official agreement print routes render outside the CMS theme. Agreement page implementations, document generation, contractual wording, calculations and revision persistence were not edited.

## Verification

Passed:

- `npx tsc --noEmit`.
- `npm run build` (production compilation, TypeScript and route generation).
- ESLint on all changed/new TypeScript, TSX and test files; `git diff --check`.
- `npm run test:cms`: actual existing authentication guards for synthetic staff/Superadmin/missing sessions; existing fine/area/legacy permission rules; Superadmin-only team visibility; authorized read-only overview queries; real publication flags; unavailable table/service/network states; metadata-only queries; deleted-agreement exclusion; route/anchor and breadcrumb/filter compatibility.
- `npm run test:staff`: existing account provisioning, exact permission assignment, Superadmin enforcement, legacy compatibility, failure handling, shared permission matrix and staff password screen. These tests use an isolated synthetic transport and ephemeral test credentials.
- `npm run test:agreements` and `npm run test:agreements:standardization`: financials, seven currencies, instalments, DOCX/PDF, contractual wording, historic text dispatch, typography, margins, footers and signatures.
- Playwright browser checks against actual shell and existing Applications, Agreements and Settings components, using isolated synthetic records and service stubs: desktop (1440px), tablet (768px), mobile (390px), wide desktop (1920px), narrow mobile (320px), no page-level horizontal overflow, finder filtering/keyboard dismissal, account menu, mobile focus cycle/restoration, Detailed modal presentation, staff-only settings, print/public theme isolation, loading and retry.
- Built Next.js server smoke checks: unauthenticated Overview, Applications, Agreements and Settings requests redirect to the existing login route; existing desktop/mobile login form and autocomplete fields render. No login credentials were submitted.
- Git diff confirms no edits to authentication/permission implementation, API handlers, agreement implementations, Supabase files, migrations, public styles, email configuration or environment files.

The broader CMS-directory lint command also encountered seven pre-existing lint errors in the unchanged `home-hero-slider-manager.tsx` and `simple-section-copy-form.tsx`. The changed-file lint check passes. These unrelated editors were left intact.

No live staff/Superadmin login was attempted, and no production data was written. Existing authenticated flows were verified with isolated synthetic sessions and the unchanged guard functions. No destructive database regression/reset/seed scripts were run.

## Screenshots

These are browser renders of real application components with **synthetic QA records and counts**, not production statistics or user data.

- [Desktop overview](screenshots/desktop-overview.png)
- [Mobile overview](screenshots/mobile-overview.png)
- [Mobile navigation](screenshots/mobile-navigation.png)
- [Tablet overview](screenshots/tablet-overview.png)
- [Agreements desktop](screenshots/agreements-desktop.png) / [mobile](screenshots/agreements-mobile.png)
- [Applications desktop](screenshots/applications-desktop.png)
- [Existing Detailed permission modal](screenshots/settings-dialog-desktop.png)

## Modified files

Existing presentation files:

- `src/app/admin/(panel)/layout.tsx`
- `src/app/admin/(panel)/dashboard/page.tsx`
- `src/components/admin/admin-sidebar.tsx`
- `src/components/admin/admin-portal-navigation.tsx`
- `src/components/admin/admin-settings-content.tsx` (section anchors only)
- `src/components/ui/button.tsx`, `card.tsx`, `centered-modal.tsx` (styling hooks only)
- `src/lib/admin/breadcrumbs.ts`
- `package.json` (`test:cms` command only)

New presentation/foundation files:

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/cms-theme.css`
- `src/components/admin/cms/cms-foundation.tsx`
- `src/components/admin/cms/cms-icons.tsx`
- `src/components/admin/cms/cms-overview.tsx`
- `src/lib/admin/navigation.ts`, `navigation-access.ts`, `overview.ts`
- `src/app/admin/(panel)/loading.tsx`, `error.tsx`

New checks and documentation:

- `scripts/run-cms-tests.mjs`, `scripts/test-cms-foundation.mjs`, `scripts/fixtures/cms-services.mjs`
- This report and `screenshots/`.

## Phase 02 starting point

Start with the Homepage editor and its effective-content resolver. Each editable field must receive exactly what the public page currently displays, then explicitly identify whether that value is saved, inherited or a default. Test parity before adding editing/publishing behavior. Compose the existing editor with the new workspace/section/preview/action slots; integrate existing permission keys and saving contracts. Preserve image-picker hooks for the later media phase. Phase 02 has not been started.
