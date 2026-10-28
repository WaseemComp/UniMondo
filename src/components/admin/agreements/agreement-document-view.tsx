import type { AgreementDocument } from "@/lib/agreements/document-content";

/** One flowing document view for unsaved edits and the browser print fallback. */
export function AgreementDocumentView({
  content,
}: {
  content: AgreementDocument;
}) {
  return (
    <article className="agreement-document">
      <h1>{content.brand}</h1>
      <h1>{content.title}</h1>
      <p className="agreement-meta">Agreement Reference: {content.reference}</p>
      <p className="agreement-meta">Date: {content.date}</p>
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i}>
              {p.runs.map((run, j) => (
                <span
                  key={j}
                  style={{
                    fontWeight: run.bold ? 700 : 400,
                    fontStyle: run.italic ? "italic" : "normal",
                  }}
                >
                  {run.text}
                </span>
              ))}
            </p>
          ))}
          {section.financialTable && (
            <table>
              <thead>
                <tr>
                  {section.financialTable.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.financialTable.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
      <div className="agreement-signing-group">
        <div className="agreement-signatures">
          {content.signatures.map((s) => (
            <div key={s.heading}>
              <p>
                <strong>{s.heading}</strong>
              </p>
              <div className="agreement-signature-line" />
              <p>Signature</p>
              <p>Name: {s.name}</p>
              <p>
                {s.designation
                  ? `Designation: ${s.designation}`
                  : (s.identity ?? "")}
              </p>
              <p>Date: {s.date}</p>
            </div>
          ))}
        </div>
        <div className="agreement-stamp">
          <div className="agreement-signature-line" />
          <p>Official Stamp of UniMondo</p>
        </div>
      </div>
      <style>{`
      .agreement-document { box-sizing:border-box; width:210mm; max-width:100%; padding:.7in; background:#fff; color:#000; font-family:"Times New Roman",Times,serif; font-size:11pt; line-height:1.15; overflow-wrap:anywhere; }
      .agreement-document h1 { font-size:14pt; font-weight:700; text-align:center; margin:0 0 5pt; }
      .agreement-document h2 { font-size:11pt; font-weight:700; margin:5pt 0; break-after:avoid; }
      .agreement-document p { margin:0 0 5pt; text-align:justify; orphans:2; widows:2; }
      .agreement-document .agreement-meta {text-align:left;}
      .agreement-document table {width:100%;border-collapse:collapse;margin:0 0 5pt;table-layout:fixed;}
      .agreement-document td,.agreement-document th {border:.5pt solid #000;padding:4pt 5pt;text-align:left;font-weight:400;}
      .agreement-document th,.agreement-document tbody tr:last-child {font-weight:700;}
      .agreement-document th:first-child {width:56%;}.agreement-document td:nth-child(2),.agreement-document th:nth-child(2){text-align:center;}
      .agreement-document td:last-child,.agreement-document th:last-child{text-align:right;}
      .agreement-signing-group {break-inside:avoid;}
      .agreement-document .agreement-signatures {display:grid;grid-template-columns:1fr 1fr;gap:0 18pt;margin-top:6pt;}
      .agreement-document .agreement-signatures > div {display:grid;grid-template-rows:subgrid;grid-row:span 6;}
      .agreement-document .agreement-signatures > div > p {min-height:1.15em;}
      .agreement-document .agreement-signatures p {text-align:left;}
      .agreement-signature-line {width:3.5cm;max-width:100%;border-bottom:.5pt solid #000;margin-top:24pt;margin-bottom:3pt;}
      .agreement-stamp {text-align:center;margin-top:24pt;}.agreement-stamp .agreement-signature-line {margin:0 auto 3pt;}
      .agreement-document .agreement-stamp p {text-align:center;font-size:6pt;}
      @media(max-width:640px){.agreement-document{padding:20px;}.agreement-document .agreement-signatures{gap:12pt;}}
      @media print {.agreement-document{width:auto;max-width:none;padding:0;}.agreement-document .agreement-signatures{gap:18pt;}}
    `}</style>
    </article>
  );
}
