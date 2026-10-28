# Agreement Generator refinement — implementation review

Branch: `codex/agreement-generator-refinement` (based on production `5d07c25e89d00cec3f64f567e748a6c7a4b70f29`). Preview preparation is authorized; merging to main and production deployment require separate owner approval.

## Implemented behavior

- New drafts use Appendix A, template 4.0. Its eight sections, paragraph boundaries, refund provisions and immigration exclusions are shared by Word, PDF, print and the unsaved preview. Illustrative details are populated from existing fields; absent optional details are omitted grammatically.
- Existing template 3.0 drafts retain their wording. **Use Appendix A** explicitly updates only the working draft. Legacy template 1/2 editing requires that explicit selection before saving. Finalized snapshots and prior revisions are not upgraded. The existing v3/legacy rendering paths remain available for historical exports.
- Agreement Details / Edit Clauses / Live Preview tabs, explicit Save Agreement Draft, discard and restore controls, and unsaved navigation warnings. No email or telephone inputs; stored contact data is retained privately and omitted from new documents.
- All eight headings and required paragraphs remain present. Plain-text overrides preserve named dynamic fields and bold subsection labels. Empty text, unknown clauses, HTML, incomplete field markers, unsafe controls and hardcoded financial values in fee/payment prose are rejected.
- Fee/payment/refund overrides require Superadmin, explicit confirmation, and server-owned author/time metadata. Existing discount authority, calculation functions, currency precision, frozen exchange rates and 30/40/30 calculations are unchanged.
- A4 / 0.7 inch margins / Times New Roman 11 pt / 14 pt centered title / 1.15 spacing / 5 pt paragraph spacing; justified flowing paragraphs, financial table, native page fields, paired short signature lines, designation/identity, formatted dates and centered 6 pt official-stamp label.
- Status is separate from the Actions menu. Existing Superadmin-only status/deletion enforcement and optimistic version checks remain; deletion retains finalized revisions and audit records.
- Print uses the official generated PDF for pagination and Page X of Y. Its HTML fallback and live preview share the same contract structure. Live preview is a flowing document, not a promise of browser-independent page breaks.

## Owner-approved wording differences

The owner instructed: **“Use Appendix A exactly for new drafts; record the differences.”** No legal reconciliation was made independently.

The two principal substantive differences from template 3.0 are:

1. Section 5, **No admission**: Appendix A conditions the 70% refund on **“payment of university expenses”**. The previous template instead said **“subject to mandatory law.”** The refund percentage is unchanged. The new condition is retained verbatim as instructed.
2. Section 4: Appendix A omits the previous separate paragraph stating that the third instalment is only a payment-timing milestone and that UniMondo does not arrange/guarantee visa appointments, submit visa applications or provide immigration services. It retains the embassy/consulate appointment-date milestone and Section 6's full immigration exclusion. That separate paragraph was not reintroduced.

Other Appendix wording differences are also retained, including its Party/Parties definition in Section 1; the scope wording in Section 2; administrator/fee language and actual table in Section 3; “Payments relating to completed later milestones” and “all additional consultancy fees” in Section 5; the full Appendix formulations of educational outcomes, visa/immigration responsibilities, student obligations, third-party charges and liability in Section 6; confidentiality/amendment wording in Section 7; and “total fee”, “fixed” schedule and “refund terms” in Section 8. The unchanged official-payment paragraph remains unchanged.

`appendix-contract.json` records the supplied attachment's SHA-256. `standard-contract.json` is unchanged. Sample names, dates, amounts and malformed sample brackets are replaced by dynamic fields; no invented subclauses or extra legal paragraphs are added. The previously removed exchange-rate explanatory sentence stays absent.

## SQL and release prerequisites

**No SQL migration is required.** Clause overrides, approval metadata and the generated document structure fit the existing JSON agreement snapshots. No database, RLS, account or CMS publishing configuration changes were made. No production writes were used for verification.

EUR and long-name TND Word/PDF samples are available in `output/agreement-refinement/` for owner review. Preview preparation has been authorized; the production release remains pending separate approval. These files contain clearly labelled synthetic QA identities only and are local review artifacts; exclude rendered intermediate images and QA binaries from the application commit.

The existing Agreement revision SQL must remain installed; this work neither reruns it nor integrates with CMS content publishing. Release must retain the bundled Times New Roman files and existing DOCX template.

## Verification

Commands:

- `npx tsc --noEmit`
- focused ESLint for changed Agreement source files
- `npm run build`
- `npm run test:agreements`
- `npm run test:agreements:standardization`
- `npm run test:agreements:refinement`
- `npm run test:agreements:dom`

The refinement suite runs the existing Agreement schema/mutation SQL inside ephemeral PGlite, with isolated auth and HTTP transport. It covers creation, custom clauses, protected-clause authority/confirmation, immutable finalization, frozen financials, omitted-override retention, stale writes, template downgrade denial, anonymous denial and safe deletion. It does not claim to exercise independent PostgreSQL sessions or networked Supabase. The separate Docker-based regression suite requires its disposable PostgreSQL container; Docker was unavailable locally.

The old standardization suite covers v3 reference wording, seven currencies × two discount modes, legacy dispatch and stored snapshots. The new suite checks Appendix text, required fields, all seven currencies, precision, dates, financial tables, Word fields and real DOCX/PDF generation.

DOM interaction tests exercise the rendered React form, field-to-preview changes, all eight editors, explicit saves, discard, standard-wording restore, and restricted controls with isolated data. These are not Safari/browser visual tests. No repeated Safari automation was attempted.

Two sample pairs (EUR and TND with long names/designation/address) are rendered with bundled LibreOffice and Poppler. Each export is three A4 pages with all wording present, no blank pages, consistent numbering and an intact signature/stamp group. Every generated page is visually reviewed; minor font/layout differences between Word and PDF are expected.

## Changed files

Contract content and rendering:

- `src/lib/agreements/appendix-contract.json` (new authoritative Appendix A structure)
- `src/lib/agreements/clauses.ts` (new validation and protected-section comparison)
- `src/lib/agreements/document-content.ts`
- `src/lib/agreements/docx-generator.ts`
- `src/lib/agreements/pdf-generator.ts`
- `src/lib/agreements/v3-document-content.ts`, `v3-docx-generator.ts`, `v3-pdf-generator.ts` (frozen previous implementation)
- `src/lib/agreements/dates.ts`
- `src/types/agreement.ts`

Administration and persistence:

- `src/lib/agreements/persistence.ts`
- `src/app/api/admin/agreements/route.ts`
- `src/app/api/admin/agreements/[id]/route.ts`
- `src/app/admin/(panel)/agreements/page.tsx`
- `src/app/admin/(panel)/agreements/new/page.tsx`
- `src/app/admin/(panel)/agreements/[id]/page.tsx`
- `src/components/admin/agreements/agreement-form.tsx`
- `src/components/admin/agreements/agreement-clause-editor.tsx` (new)
- `src/components/admin/agreements/agreement-document-view.tsx` (new)
- `src/components/admin/agreements/agreement-actions.tsx`
- `src/components/admin/agreements/print-agreement-client.tsx`

Checks and review notes:

- `scripts/run-agreement-tests.mjs`
- `scripts/test-agreement-suite.mjs`
- `scripts/test-agreement-regressions.mjs`
- `scripts/test-agreement-refinement.mjs` (new)
- `scripts/test-agreement-refinement-dom.mjs` (new)
- `package.json` (two focused test commands)
- `docs/agreement-refinement/README.md` (this report)
