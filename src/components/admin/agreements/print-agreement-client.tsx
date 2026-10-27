"use client";

import type { AgreementRecord } from "@/types/agreement";
import { agreementDocument, usesStandardAgreement } from "@/lib/agreements/document-content";
import { LegacyPrintAgreementClient } from "./legacy-print-agreement";

export function PrintAgreementClient({ agreement }: { agreement: AgreementRecord }) {
  if (!usesStandardAgreement(agreement)) return <LegacyPrintAgreementClient agreement={agreement} />;
  const content = agreementDocument(agreement);
  const pdfUrl = `/api/admin/agreements/${encodeURIComponent(agreement.id)}/export?format=pdf&inline=1${agreement.revisionNumber && agreement.status === "finalized" ? `&revision=${agreement.revisionNumber}` : ""}`;
  const footer = JSON.stringify(`UniMondo | Agreement Reference ${content.reference} | Page `)
    .replace(/</g, "\\3c ").replace(/>/g, "\\3e ");
  return <div className="agreement-preview">
    <div className="agreement-controls">
      <button type="button" onClick={() => {
        // Print the official PDF so browser margin-box support cannot change pagination or footers.
        const frame = document.getElementById("agreement-print-pdf") as HTMLIFrameElement | null;
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      }}>Print Document</button>
      <a href={pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>
      <button type="button" onClick={() => window.close()}>Close window</button>
    </div>
    <iframe id="agreement-print-pdf" src={pdfUrl} title="Official printable agreement" className="agreement-pdf" />
    <article className="agreement-sheet">
      <h1>{content.brand}</h1><h1>{content.title}</h1>
      <p className="agreement-meta">Reference: {content.reference}{content.date ? `     Date: ${content.date}` : ""}</p>
      {content.sections.map(section => <div key={section.heading}>
        <h2>{section.heading}</h2>
        {section.paragraphs.map((p, index) => <p key={index}>{p.runs.map((run, i) =>
          run.bold ? <strong key={i}>{run.text}</strong> : run.italic ? <em key={i}>{run.text}</em> : <span key={i}>{run.text}</span>)}</p>)}
      </div>)}
      <div className="agreement-signatures">{content.signatures.map(s => <div key={s.heading}>
        <p className="agreement-signature-heading"><strong>{s.heading}</strong></p>
        <p>Signature: _______________________</p><p>Name: {s.name}</p><p>Date: {s.date || "__________________________"}</p>
      </div>)}</div>
    </article>
    <style>{`
      .agreement-preview { background: #fff; color: #000; padding: 20px; }
      .agreement-controls { display: flex; gap: 20px; margin-bottom: 16px; align-items: center; }
      .agreement-controls button, .agreement-controls a { border: 1px solid #000; padding: 8px 12px; background: #fff; color: #000; cursor: pointer; }
      .agreement-pdf { width: 100%; height: 85vh; border: 0; }
      .agreement-sheet { display: none; width: 210mm; box-sizing: border-box; padding: .7in; margin: auto; font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.15; color: #000; }
      .agreement-sheet h1 { font-size: 14pt; font-weight: bold; text-align: center; margin: 0 0 5pt; }
      .agreement-sheet h2 { font-size: 11pt; font-weight: bold; margin: 5pt 0; break-after: avoid; page-break-after: avoid; }
      .agreement-sheet p { margin: 0 0 5pt; text-align: justify; break-inside: avoid; orphans: 2; widows: 2; }
      .agreement-sheet .agreement-meta { text-align: left; white-space: pre-wrap; }
      .agreement-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; break-inside: avoid; margin-top: 6pt; }
      .agreement-signatures p { text-align: left; }
      .agreement-signature-heading { padding-bottom: 24pt; }
      @page { size: A4 portrait; margin: .7in;
        @bottom-center { content: ${footer} counter(page) " of " counter(pages); font-family: "Times New Roman", Times, serif; font-size: 9pt; color: #000; }
      }
      @media print {
        body:has(.agreement-preview) { background: white !important; }
        body:has(.agreement-preview) aside, body:has(.agreement-preview) nav, body:has(.agreement-preview) header { display: none !important; }
        body:has(.agreement-preview) main { padding: 0 !important; min-height: 0; }
        .agreement-preview { padding: 0; }
        .agreement-controls, .agreement-pdf { display: none !important; }
        .agreement-sheet { display: block; width: auto; padding: 0; margin: 0; }
        .agreement-sheet > div:last-of-type h2 { break-after: avoid; }
      }
    `}</style>
  </div>;
}
