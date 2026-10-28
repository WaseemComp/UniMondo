# Phase 07 verification evidence

All write-based tests use isolated fixtures and in-memory PostgreSQL. Automated checks did not apply SQL or activation to production. The owner subsequently reported successful manual installation of the Phase 07 footer extension; it was not rerun during release preparation. Real production requests during this phase were GET-only availability checks for the four existing anonymous Contact sources used by the footer; all four returned 200 with the expected column projections, and no row values were printed.

## Checks passed

- TypeScript: `npx tsc --noEmit`.
- ESLint: all changed/new application `.ts`/`.tsx` sources, plus the final package CTA style change; zero errors/warnings.
- Production build: Next.js production build, 50 static pages and protected dynamic CMS routes, including `/admin/content/footer`.
- Footer SQL/action suite: `npm run test:footer`.
- Footer rendered editor: `npm run test:footer:dom`. Covers Branding, Navigation, Contact, Social links, Bottom notices and section visibility/order, Media Library selection, private/live previews, device switching, focusable preview frame, inert links and controlled publication.
- Public footer/palette/overlay preservation: `npm run test:public:refinement`.
- Existing homepage content: `npm run test:homepage`, `npm run test:homepage:defaults`.
- Phase 06 server/SQL/rendered-editor regressions: `npm run test:publishing`, `npm run test:publishing:dom`.
- Academic SQL compatibility: `npm run test:academic:sql`.
- CMS authorization/navigation/overview/Application guards: `npm run test:cms`.
- Media upload/decode/selection/usage/archive safeguards: `npm run test:media`.
- Staff creation/permissions/password interface compatibility: `npm run test:staff`.
- Agreement calculations, seven currencies, immutable snapshots and DOCX/PDF exports: `npm run test:agreements`.
- Git whitespace and secret-pattern checks. Existing runtime/development dependency versions are unchanged. Protected account/authentication/Application/Agreement/notification implementation sources are unchanged.

The footer migration was installed twice in isolated PostgreSQL. Its snapshot function differs from the reviewed Phase 06 function only by adding `footer` to the supported-document allowlist; existing function grants remain service-only. It does not change the activation flag or existing published rows.

## Read-only local HTTP smoke

The locally built production server on port 3117 returned:

- 200: `/`, `/destinations`, `/destinations/italy`, `/courses`, `/packages`, `/about`, `/contact`, `/blog`, `/apply`, `/admin/login`.
- Existing 308 redirects to `/destinations`: `/programs`, `/current-openings`.
- Login redirects for anonymous requests: `/admin/home`, `/admin/content/footer`, `/admin/publishing`, `/admin/media`, `/admin/universities`, `/admin/programs`, `/admin/settings`, `/admin/applications`, `/admin/agreements`.
- 401: `/api/admin/media`, `/api/admin/agreements`, `/api/applications`.

Every checked public content page rendered the shared footer, no isolated test markers appeared, and the homepage canonical URL remained `https://www.unimondo.uk`. No forms, authenticated saves or operational mutations were exercised. The owned local server was stopped after checking.

## Visual QA limits

One Safari inventory attempt timed out before any window state could be read. It was not repeatedly retried. No browser screenshot or Safari console/layout validation is claimed. JSDOM exercises real React components, iframe content and isolated SQL-backed actions, but does not establish actual responsive pixel layout, overflow, photographs' perceived brightness, all focus behavior or full accessibility conformance.

The core neutral/teal/light palette pairs pass calculated WCAG AA contrast. This is not a blanket claim that every image, translucent panel or decorative accent has been visually verified. Owner desktop/tablet/mobile inspection is still required after separate Vercel Preview authorization. Phase 07 Preview preparation is separately authorized; production deployment and activation remain prohibited until further owner approval.
