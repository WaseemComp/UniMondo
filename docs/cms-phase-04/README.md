# Phase 04 — complete homepage content management

Branch: `codex/cms-phase-04-homepage-management`  
Baseline: `0f17ac6facb0087a6d512aa1f5ddd015657147bb`

Implementation is complete and feature-branch commit/push/PR/Vercel Preview preparation is authorized. Production merge/deployment remain unapproved. No production data write, schema change, credential change or permission-assignment change was performed. Phase 05 has not started. See [Preview preparation](PREVIEW.md).

## Implemented controls

| Section | Management supplied |
| --- | --- |
| Hero & Main Banner | Add slides; edit image, caption, title, description, introductory label, primary/secondary text and destinations; independent global inheritance for every supported copy field; visibility; numeric display positions; immediate preview and explicit Save. First addition retains the five built-in slides in the same atomic insert. |
| Why UniMondo | All six existing cards are populated with their exact original wording. Edit title, description and icon; add cards, move earlier/later, hide, archive and restore. Optional explicitly configured statistics have value/suffix/label controls; no new promotional figures are invented. |
| Marketing Announcement | Existing section text, highlight and button controls, plus editable supporting statement and section visibility. |
| Popular Destinations | Select existing countries; search choices; add featured selections, reorder, hide/archive/restore; edit homepage descriptions and images through the shared Media Library. Country records are never changed by this selection editor. |
| Featured Universities & Programs | Search and select existing published universities and programs, deselect via hide/archive, reorder and preview. Existing program-card layout is retained; university promotions use the same layout with applicable canonical fields. Card button wording/destinations are configurable. Master records and relationships are untouched. |
| Success Stories | Existing canonical testimonial records, editable approved public name/text/country/program/university/image, create, feature/hide, display positions and non-destructive archive/hide. Images use the Phase 03 chooser/upload flow. Public-use approval is required before featuring through the homepage editor. |
| How It Works | All five existing stages retain their wording and icons. Add/edit/reorder/hide/archive/restore individual titles, descriptions and icons. Stage numbers follow visible display order. |
| Why Study in Europe | Individual quick facts and benefit rows, labels/text/icons, add/reorder/hide/archive/restore, background selection/description and existing explanatory section copy. Legacy fact values seed the effective collection on its first explicit save. |
| Final Call to Action | Existing heading/description/button text, destination, supporting statement, GPA/IELTS labels and input hints, input visibility and section visibility. `/apply` destinations retain the existing GPA/IELTS query handling and preserve existing query parameters/fragments. This section has no existing supporting image; none is invented. |

The existing three-panel editor remains: section navigation, editing controls and actual public-component preview. Editing-tool tabs expose each section’s text, item collections and presentation settings. Preview items select the corresponding editor, including cross-selection between Europe facts and benefit rows. Item lists provide a keyboard alternative. Preview public links and forms remain noninteractive; selected items receive an outline. Desktop/mobile viewport modes remain 1120 × 800 and 390 × 844.

Unsaved values are applied only to in-memory preview data. Explicit Save persists changes; Discard restores saved/default values. Navigation warns before discarding edits. Hidden sections and hidden testimonials have clear editing notices.

## Storage and compatibility

**No new migration or SQL execution is required.** Existing `cms_content_blocks` supports the necessary JSON collections, unique singleton keys and update timestamps. Canonical stories already have the public fields and `updated_at` needed for safe editing.

- Collections use one row per section/group at `sort_order = 0`, `block_key = collection_<group>`, with ordered `content.items`. An explicit empty or fully hidden collection never silently restores defaults.
- Presentation settings use a section’s `presentation` block, also at position 0. Existing section-copy records are retained separately; unknown content/media properties are preserved on updates.
- First collection save materializes the effective current defaults rather than seeding or resetting the database. Six benefit cards and five process steps remain visible before any save, and on first save every retained item receives the existing content.
- Countries use the existing public country identity. University/program selections store references to the existing canonical records, not duplicate academic data. The reference catalogue is read-only. Failed master reads disable saving selections instead of allowing fallback replacement.
- Testimonials stay in `success_stories`. Hiding updates `is_published` only; there is no destructive story deletion in either the new editor or the related legacy delete action. The existing public limit of six featured stories is retained and explained in the UI. Reordering is by the existing numeric display-position field.
- Existing hero records remain canonical. A new slide’s first save preserves built-in fallbacks atomically when saved slides do not yet exist. Reordering uses unique numeric positions; gaps are supported, and an occupied position is rejected safely.
- Existing public stylesheet files are unchanged. Public components receive structured content and retain their default classes/layout. A single shared section renderer supplies both public and preview rendering.
- Existing Media Library storage, categories, objects and URLs are reused. Choosing an image does not save the homepage. The existing uploader remains the only upload implementation.

The original fallback-to-built-in-carousel behavior when no saved slide is active remains intact. A whole hero section can now be deliberately hidden through section settings. Previously ignored legacy statistics are not automatically activated; adding statistics is an explicit operator action. Existing Europe fact fields remain API-compatible, while normal staff editing uses the individual Quick facts controls to avoid competing copy fields.

## Authorization and persistence

New collection and presentation actions enforce current authentication, Content area access and the existing fine permissions. Normal collections use `home.edit`; statistics use `home.stats.edit`; final-section settings use `home.cta.edit`. Feature selection additionally requires the corresponding country/university view permission and Academic area access. No new permission key or assignment is introduced.

Testimonial actions use the existing Blog view/create/edit/publish/delete keys in the Content area. Existing published records are preserved; newly created testimonials start hidden in the UI. Featuring requires publish permission and a public-use confirmation. Archive/hide requires delete permission, retains the record and never removes its image. Related legacy story actions now also enforce the existing granular keys and use hiding rather than permanent deletion. Generic CMS deletion refuses the new retained collection/presentation blocks.

All writes validate a bounded, allowlisted schema server-side, including icon choices, safe image/button destinations, unique item/reference identities, mandatory fields and numeric ranges. Existing items must be retained or archived rather than dropped from replacement arrays. Collection/story updates compare the client’s expected update timestamp and perform a conditional update. The existing unique constraint prevents duplicate singleton initialization. Save success is shown only after read-back verification. Uncertain confirmation asks the user to reload before retrying.

## Verification completed

- `npm run test:homepage:items`: isolated real Supabase SDK/action checks for defaults, all collection groups, individual updates, add/reorder/archive, first-save uniqueness, empty state, preserved unknown fields, stale edits, nine section visibility settings, canonical references, invalid links, failed reference loads, approved public testimonials, hidden rows retained, legacy endpoint guards, new hero slides, label/link inheritance and existing permission/area/auth gates.
- `npm run test:homepage:defaults`: server-rendered comparison with the accepted Phase 03 commit. All nine default sections match original text, heading sequence, links, images, form hints and structural CSS classes.
- `npm run test:homepage:dom`: actual React components and actual server actions in a simulated DOM, backed by the isolated SDK fixture. Checks preview-to-item selection, per-card live updates, explicit Save, reorder/add/archive/discard, process/Europe content, announcement support text, final button/input settings and inert links/forms, hero creation/label inheritance, desktop/mobile iframe dimensions, Media Library selection and hidden-by-default testimonial creation.
- Existing `test:homepage`, `test:media`, `test:cms`, `test:staff` and `test:agreements` suites pass. Agreement calculations/exports, staff operations and authentication sources remain unchanged.
- TypeScript, focused ESLint and production build pass.
- Read-only HTTP checks against the local production build confirm the relevant admin routes require authentication and the Media/Agreement APIs reject anonymous requests.

All write tests use synthetic records/files and an isolated SDK transport. No production uploads, archives, content saves, student queries or destructive tests are run. The existing destructive live-data test script is not used.

The optional DOM/default comparison tests use JSDOM. It was installed outside the repository at `/tmp/unimondo-phase04-qa/node_modules/jsdom`; application dependencies and lockfiles were not changed. To reproduce, install JSDOM 27.0.1 in a temporary directory and set `JSDOM_MODULE` to that module path when invoking the tests. Test fixture modules are not imported by application routes.

## Remaining verification and screenshots

**Safari visual/layout verification remains pending.** The owner confirmed Safari’s “live Github profile” is available, but the computer-control tool repeatedly times out before returning a Safari window. No other browser was substituted. Simulated DOM tests verify interaction/state behavior and viewport configuration, but do not prove real CSS layout, Safari iframe behavior, image decoding or visual clipping.

No Phase 04 desktop/mobile screenshots are supplied: existing Phase 03 screenshots are not relabelled as this phase. Before release, inspect the new controls and real previews in Safari at desktop/tablet/mobile widths, including live item clicking, image choice, form disabling, keyboard access, dialogs and unsaved navigation. Use isolated test data for any saves.

## Manual release prerequisites and rollback

1. The owner will perform the Safari visual pass on Preview. No further automated Safari control attempts are part of Preview preparation. A staging database or isolated transport is needed for write verification; Vercel Preview must not be assumed to use a separate database.
2. No additional SQL, bucket policy, RLS change, credential or profile change is requested. The original CMS block schema and already-applied Phase 03 catalogue remain prerequisites.
3. Feature-branch commit/push/PR/Preview preparation is authorized. Obtain separate production release approval before merge/deployment.
4. Rollback should revert the frontend/actions while retaining the new CMS block rows, testimonial rows and media. Older code ignores collection/presentation blocks and uses its existing defaults; do not drop tables, reset content or delete storage objects. Newly configured collection values would stop being rendered by the old code, so assess that visible fallback effect before rollback. Older story code should not be used for destructive deletions.

[Changed-file inventory](FILES.md). [Original mandatory item-editing reference](../cms-phase-04-requirements.md).
