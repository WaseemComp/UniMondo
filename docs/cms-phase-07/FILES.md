# Phase 07 changed files

All paths are repository-relative. No credentials, account assignments, Agreement, application, submission or notification implementations are changed.

## Footer editor, public rendering and publishing

- `src/app/admin/(panel)/content/footer/page.tsx`
- `src/app/admin/(panel)/publishing/page.tsx`
- `src/app/admin/cms/footer-actions.ts`
- `src/app/admin/cms/publishing-actions.ts`
- `src/components/admin/footer/footer-editor.css`
- `src/components/admin/footer/footer-editor.tsx`
- `src/components/footer-view.tsx`
- `src/components/site-footer.tsx`
- `src/lib/footer/model.ts`
- `src/lib/footer/server.ts`
- `src/lib/publishing/comparison.ts`
- `src/lib/publishing/model.ts`
- `src/lib/publishing/planning.ts`
- `src/lib/publishing/validation.ts`

## Public presentation, shared preview and navigation

- `src/app/(public)/blog/[slug]/page.tsx`
- `src/app/(public)/blog/page.tsx`
- `src/app/(public)/contact/loading.tsx`
- `src/app/(public)/courses/page.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/(public)/packages/page.tsx`
- `src/app/globals.css`
- `src/components/about/about-page-view.tsx`
- `src/components/about/about-partners-showcase.tsx`
- `src/components/about/about-team-showcase.tsx`
- `src/components/admin/homepage/homepage-editor.tsx`
- `src/components/admin/homepage/homepage-preview.tsx`
- `src/components/admin/media/media-picker.tsx`
- `src/components/contact/contact-offices-section.tsx`
- `src/components/contact/contact-page-shell.tsx`
- `src/components/contact/join-us-form.tsx`
- `src/components/contact/work-with-us-form.tsx`
- `src/components/destinations/destinations-unified.tsx`
- `src/components/home/featured-programs.tsx`
- `src/components/home/hero-carousel.tsx`
- `src/components/home/home-marketing-banner.tsx`
- `src/components/home/how-it-works.tsx`
- `src/components/home/journey-cta.tsx`
- `src/components/home/popular-destinations.tsx`
- `src/components/home/success-stories-section.tsx`
- `src/components/home/why-europe.tsx`
- `src/components/home/why-unimondo.tsx`
- `src/components/openings-board.tsx`
- `src/components/packages/study-packages-tables.tsx`
- `src/components/programs/featured-universities-grid.tsx`
- `src/components/site-header.tsx`
- `src/lib/admin/navigation.ts`
- `src/lib/data/contact-page.ts`

## Manual SQL and documentation

- `docs/cms-phase-07/FILES.md`
- `docs/cms-phase-07/README.md`
- `docs/cms-phase-07/PREVIEW.md`
- `docs/cms-phase-07/VERIFICATION.md`
- `supabase/migrations/20261031090000_footer_publishing.sql`

## Isolated tests and scripts

- `package.json`
- `scripts/fixtures/publishing-dom-services.mjs`
- `scripts/fixtures/publishing-fixture.mjs`
- `scripts/run-footer-tests.mjs`
- `scripts/run-homepage-defaults-tests.mjs`
- `scripts/run-publishing-dom-tests.mjs`
- `scripts/test-cms-foundation.mjs`
- `scripts/test-footer-dom.mjs`
- `scripts/test-footer-publishing.mjs`
- `scripts/test-public-refinement.mjs`
