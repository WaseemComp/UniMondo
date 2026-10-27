# Agreement document standard 3.0

New drafts use `templates/UniMondo_Agreement_Standard.docx`, retained byte-for-byte from the supplied improved-layout master (SHA-256 recorded in `standard-contract.json`). The JSON contains the eight section headings and exact static paragraphs; `document-content.ts` fills the illustrative party, engagement and financial slots from saved fields. Only the duplicated parentheses in instalments two and three are corrected. The reference has no numbered subclauses. Sections 5 and 6 retain three and six paragraphs respectively.

The Word exporter keeps the existing JSZip/OOXML workflow and the PDF exporter keeps pdf-lib. Both use A4, 0.7-inch margins, Times New Roman 11pt, a 14pt bold centered title, justified body paragraphs, 1.15 line spacing and 5pt paragraph spacing. Section headings stay with their first paragraphs; signatures stay together. PDFs embed the Times New Roman regular/bold/italic font assets under `templates/fonts` (editable document embedding flag). Word uses the named font. Footers include UniMondo, the saved agreement reference and Page X of Y; Word updates its PAGE/NUMPAGES fields when opened. The print page loads and prints the official PDF, with a semantic HTML fallback for direct browser printing.

`saveAgreement` builds an expanded `documentSnapshot` and saves it inside the existing record JSON, alongside the unchanged financial snapshot. Finalization of an older untouched draft first saves this expanded content using the existing optimistic-version RPC, then finalizes that version. A concurrent change aborts finalization. No database migration is needed. Client input cannot supply or override this snapshot.

Finalized standard 3.0 exports read only the saved document snapshot. Missing snapshots on records explicitly marked 3.0 fail closed. Older finalized agreements without this marker continue through the baseline `legacy-*` implementations and original template, including historical financial calculations and wording. Editing an older agreement creates a new standard draft while its finalized revision remains unchanged. Future contract revisions must retain the saved document model and old renderer dispatch.

Focused validation:

```sh
npm run test:agreements
npm run test:agreements:standardization
npm run test:agreements:regressions
npx tsc --noEmit
npm run build
```

The standardization test verifies the master hash and exact static paragraphs, all seven currencies and both discount types, A4 geometry, typography, footer fields, optional/long/Unicode names, saved content precedence and legacy dispatch. Samples are written under `/tmp/unimondo-standardization/samples` for Word/PDF render inspection. The regression suite uses only the disposable local PostgreSQL container described in `supabase/AGREEMENT_REVISIONS.md`.
