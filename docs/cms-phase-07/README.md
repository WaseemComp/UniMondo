# Phase 07 — final public refinement and editable footer

Branch: `codex/cms-phase-07-final-refinement`.
Baseline: deployed Phase 06 production `main`, `11d82cf9de6d0cc299dfebd04d15b75fc04f2da1` (PR #7 merged; production Vercel status successful at preflight).

The owner has authorized Phase 07 feature-branch commit, push, PR and Vercel Preview preparation and reports successful manual execution of the footer extension. The migration must not be rerun. Merge, production deployment, publishing activation and production/Preview write tests remain outside this authorization. Existing work is preserved.

## Public refinement

The public site and real-component previews use Pearl White `#F4F3EF`, Powder Sky `#E4F1F7`, deep neutral `#2F3E46`, academic teal `#244B50` and soft borders `#D9E2E8`. Existing fonts, structure, branding, content and destinations are retained. The CMS theme stays isolated.

Hero, Why Study in Europe, About and Contact retain their original photographs. Broad dark overlays were replaced with 10–15% tints and light text panels. Destination/university image cards retain localized lower caption gradients rather than full-image masks. Text-only destination/course/package headers, Contact cards/dialogs and the footer use light surfaces. Gold remains a small brand/decorative accent. Public focus outlines and reduced-motion styles are provided; the mobile menu announces the current page and supports Escape with focus returned to its toggle.

No application, Agreement, submission, account, pricing or notification handlers are changed. Contact form changes are button colors only. Existing public URLs and SEO metadata are preserved.

## Footer management

Open **Content Studio → Website Pages / Footer** (`/admin/content/footer`), also linked from the homepage editor. This reuses the existing CMS shell, workflow panel, Media Library and inert desktop/mobile iframe preview. The preview renders the same `FooterView` as the public site, not a screenshot or mock component.

Editable:

- Company name, description, optional branding image and image description.
- Explore/Company link names, destinations, visibility and order.
- Multiple email addresses, phone numbers, head/branch addresses and supporting contact details.
- Social links, accessible names and icon selection.
- Copyright line with automatic `{year}`, notices/disclaimers and their inline/additional links.
- Section headings, section order/visibility and whole-footer visibility.

Before the first explicit save, the editor loads the exact existing footer wording, navigation and effective inherited Contact summary. No defaults are written to the database. Blank optional information is omitted as before. Existing footer text, emails, phones, addresses and link destinations are covered by preservation tests against the deployed source. Contact records remain the existing source until an explicit footer override is published; footer edits never change Contact records.

The UI identifies saved versus default/inherited values. It supports explicit Save Draft, discard unsaved changes, unsaved navigation warnings and restoration to current website defaults as an unsaved proposal. Existing saved items can be hidden; newly added unsaved items can be removed. New footer drafts verify inherited contact defaults have not changed while the form was open. Source-read failures disable saving instead of silently replacing contact details with empty values.

## Workflow, permissions and media

Footer uses the existing Phase 06 `home` resource with key `footer`. Its single configuration block is stored in existing `cms_content_blocks` (`page_slug=home`, `section_key=footer`, `block_key=configuration`). No parallel footer table or separate authorization system was introduced.

Existing `home.view` and `home.edit` control viewing/editing; existing explicit `publishing.review`/`publishing.publish` control review/publication, with Superadmin rules unchanged. No new permission keys, assignments, accounts or credentials are changed. Author, owner, modification time, independent staff approval, optimistic versions, locked reviews, exact approved publication, comparison/history and discard/restoration reuse Phase 06. Restoring history creates a private draft and retains newer footer items hidden. Publication invalidates the public layout across all pages.

Public pages read only published footer blocks with the existing anonymous/RLS client. Private drafts/review data remain in the existing private workflow tables and have no public route. The new admin route is authenticated and noindex. Before the footer extension is installed, footer saves fail closed while public defaults and other Phase 06 documents remain available.

Branding images are chosen/uploaded through the existing Media Library. Image references are validated at save/review/publication and retained in private/history usage protection. No files are moved, renamed or deleted. The shared image chooser now describes saving/publication accurately for both immediate-save and workflow-based editors.

## Manual SQL prerequisite

The owner reports successfully applying `supabase/migrations/20261031090000_footer_publishing.sql` manually. It was not rerun by the assistant. It adds `footer` to the existing private snapshot function's allowed homepage documents. It changes no published rows, defaults, table schemas, relationships, policies or activation settings. Existing function grants remain service-only. Idempotent application and compatibility are tested in isolated PostgreSQL.

Do not rerun Phase 06 installation or activation. The new migration is not applied automatically by build, tests or deployment. All migration/write tests use in-memory PostgreSQL and synthetic transports that reject external requests.

Current release boundary:

1. Installation is complete per the owner. Focused read-only checks confirm the footer snapshot is available and publishing is still disabled. Do not rerun either migration or activate publishing.
2. Prepare the authorized feature commit/push/PR and Vercel Preview. Treat Preview as production-connected; authenticated inspection must remain read-only unless a separate isolated environment is established.
3. Owner reviews desktop, tablet and mobile layouts and the actual footer preview in Safari. No production test saves, uploads, archiving, approval/publication or deletion.
4. Only after separate production approval, merge/deploy and perform read-only checks. Publishing activation remains a separate owner decision.

Rollback: retain all footer blocks, private drafts, immutable history and media. Roll application code back only under separate authorization if necessary; older code will display its existing footer defaults without deleting the saved footer. Do not drop workflow history or rerun an older migration to remove footer support. Freeze footer publication while running older code. No destructive down migration is supplied.

## Verification

Passed implementation checks (see final completion report for final build/smoke status):

- `npm run test:footer`: actual isolated PostgreSQL migration/RPCs and Supabase SDK; inherited values; additive/idempotent migration; unchanged activation flag/content; private save; stale defaults/version rejection; invalid/blank/unsafe input; view-only denial; independent staff approval; request changes; activation gate; publication; comparison/baseline restoration retaining newer hidden items; Contact preservation; layout invalidation; media retained by drafts/history; direct SQL bypass refusal.
- `npm run test:footer:dom`: actual rendered footer editor, real isolated actions and public renderer, effective values, unsaved preview/discard/warnings, link edits, Media Library selection, saved draft versus live comparison, 1120/390 viewport modes, inert links, review locks, publication and view-only controls. Simulated DOM, not real-browser visual verification.
- `npm run test:public:refinement`: exact existing footer wording and link destinations compared with production source, WCAG AA for the core text/action palette pairs, and targeted overlay checks.
- `npm run test:homepage:defaults`: all nine public sections retain baseline text, headings, images, link destinations and form hints; approved Phase 07 CSS changes are deliberately excluded from equality.
- `npm run test:publishing`, `npm run test:publishing:dom`, `npm run test:homepage`, `npm run test:academic:sql`, `npm run test:cms`, `npm run test:media`, `npm run test:staff`, `npm run test:agreements`.
- TypeScript and focused ESLint over all changed/new application source files. Production build and read-only local HTTP smoke are recorded in the completion report.

All data-changing tests use isolated synthetic fixtures; no real student records or credentials are used. Existing dependency versions are unchanged and no new dependency is required.

## Limitations / inspection pending

Safari inventory/control timed out once before reading a window. It was not repeatedly retried. No browser screenshots or real Safari layout pass are claimed. Desktop/mobile DOM/markup and palette contrast checks do not establish actual pixel layout, every possible overlay/photo combination or all accessibility behavior. Owner inspection on a separately authorized Preview is required.

Published footer overrides intentionally become independent of later Contact edits. The editor explains this and can restore current inherited values into a new private draft. New drafts do not automatically publish. Existing Phase 06 limits (one shared active draft per document, no scheduling, document-size limit) remain.

See `PREVIEW.md` for focused release-preparation evidence and limitations. Stop after the authorized Preview is Ready for owner review; merge, production deployment and activation require separate authorization.
