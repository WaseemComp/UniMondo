# Phase 06 changed files

All paths are repository-relative. No Agreement, application, staff-account or authentication implementation files are changed.

## Workflow backend and authorization

- `src/app/admin/cms/publishing-actions.ts`
- `src/lib/auth/permission-definitions.ts`
- `src/lib/publishing/access.ts`
- `src/lib/publishing/baseline.ts`
- `src/lib/publishing/comparison.ts`
- `src/lib/publishing/model.ts`
- `src/lib/publishing/planning.ts`
- `src/lib/publishing/preview.ts`
- `src/lib/publishing/store.ts`
- `src/lib/publishing/validation.ts`

## Editors, navigation and existing persistence integration

- `src/app/admin/(panel)/content/success-stories/page.tsx`
- `src/app/admin/(panel)/content/ticker/page.tsx`
- `src/app/admin/(panel)/destinations/countries/page.tsx`
- `src/app/admin/(panel)/featured-universities/page.tsx`
- `src/app/admin/(panel)/home/page.tsx`
- `src/app/admin/(panel)/programs/page.tsx`
- `src/app/admin/(panel)/publishing/page.tsx`
- `src/app/admin/(panel)/universities/page.tsx`
- `src/app/admin/actions.ts`
- `src/app/admin/cms/academic-actions.ts`
- `src/app/admin/cms/cms-block-actions.ts`
- `src/app/admin/cms/home-page-blocks-actions.ts`
- `src/app/admin/cms/homepage-editor-actions.ts`
- `src/app/admin/cms/homepage-items-actions.ts`
- `src/app/admin/cms/homepage-story-actions.ts`
- `src/app/admin/cms/site-settings-actions.ts`
- `src/app/admin/cms/success-stories-actions.ts`
- `src/components/admin/academic/catalogue-manager.tsx`
- `src/components/admin/academic/catalogue-page.tsx`
- `src/components/admin/homepage/homepage-editor.tsx`
- `src/components/admin/homepage/homepage-items-editor.tsx`
- `src/components/admin/homepage/homepage-stories-editor.tsx`
- `src/components/admin/publishing/academic-preview.tsx`
- `src/components/admin/publishing/stories-workspace.tsx`
- `src/components/admin/publishing/ticker-workspace.tsx`
- `src/components/admin/publishing/workflow-panel.tsx`
- `src/components/admin/ticker-admin.tsx`
- `src/components/admin/ticker-site-strip-form.tsx`
- `src/components/destinations/destinations-unified.tsx`
- `src/lib/admin/homepage-catalogue.ts`
- `src/lib/admin/homepage-editor.ts`
- `src/lib/admin/navigation-access.ts`
- `src/lib/admin/navigation.ts`
- `src/lib/media/catalogue.ts`

## SQL and release documentation

- `docs/cms-phase-06/FILES.md`
- `docs/cms-phase-06/README.md`
- `docs/cms-phase-06/PREVIEW.md`
- `docs/cms-phase-06/verify-installation.sql`
- `docs/cms-phase-06/activate-publishing.sql`
- `supabase/migrations/20261030090000_content_publishing.sql`

## Isolated tests and development dependencies

- `package-lock.json`
- `package.json`
- `scripts/fixtures/media-fixture.mjs`
- `scripts/fixtures/publishing-dom-services.mjs`
- `scripts/fixtures/publishing-fixture.mjs`
- `scripts/run-academic-dom-tests.mjs`
- `scripts/run-academic-tests.mjs`
- `scripts/run-homepage-items-dom-tests.mjs`
- `scripts/run-homepage-items-tests.mjs`
- `scripts/run-publishing-dom-tests.mjs`
- `scripts/run-publishing-tests.mjs`
- `scripts/test-cms-foundation.mjs`
- `scripts/test-content-publishing.mjs`
- `scripts/test-homepage-editor.mjs`
- `scripts/test-media-library.mjs`
- `scripts/test-publishing-dom.mjs`
