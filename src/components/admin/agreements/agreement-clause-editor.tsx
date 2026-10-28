"use client";
import {
  STANDARD_CLAUSES,
  clauseText,
  type ClauseEdits,
} from "@/lib/agreements/clauses";
export function AgreementClauseEditor({
  edits,
  onChange,
  mayEditProtected,
}: {
  edits: ClauseEdits;
  onChange: (value: ClauseEdits) => void;
  mayEditProtected: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        All eight sections are retained. Labelled fields such as «Student
        details» are filled from Agreement Details. Keep these fields intact.
        Blank lines create separate paragraphs. The fee table and 30/40/30
        amounts remain calculated.
      </p>
      {!mayEditProtected && (
        <p className="text-sm text-zinc-600">
          Fee, payment and refund wording can only be changed by Superadmin.
        </p>
      )}
      {STANDARD_CLAUSES.map((section) => {
        const locked =
          ["3", "4", "5"].includes(section.id) && !mayEditProtected;
        return (
          <details
            key={section.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
            open={section.id === "1"}
          >
            <summary className="cursor-pointer font-semibold">
              {section.id}. {edits.headings?.[section.id] ?? section.heading}
              {locked ? " · Restricted" : ""}
            </summary>
            <fieldset
              disabled={locked}
              className="mt-4 space-y-4 disabled:opacity-70"
            >
              <label className="block text-sm">
                Section heading
                <input
                  aria-label={`Section ${section.id} heading`}
                  className="mt-1 w-full rounded border p-2"
                  value={edits.headings?.[section.id] ?? section.heading}
                  onChange={(e) =>
                    onChange({
                      ...edits,
                      headings: {
                        ...edits.headings,
                        [section.id]: e.target.value,
                      },
                    })
                  }
                />
              </label>
              {section.paragraphs.map((paragraph, index) => {
                const value = clauseText(edits, paragraph);
                const change = (next: { text: string; label?: string }) =>
                  onChange({
                    ...edits,
                    paragraphs: { ...edits.paragraphs, [paragraph.id]: next },
                  });
                return (
                  <div key={paragraph.id} className="space-y-2">
                    {"payment" in paragraph && (
                      <p className="text-sm font-semibold">
                        {index === 0
                          ? "First instalment · 30%"
                          : index === 1
                            ? "Second instalment · 40%"
                            : "Third instalment · 30%"}{" "}
                        — calculated amount
                      </p>
                    )}
                    {value.label !== undefined && (
                      <label className="block text-sm">
                        Subsection label
                        <input
                          className="mt-1 w-full rounded border p-2"
                          value={value.label}
                          onChange={(e) =>
                            change({ ...value, label: e.target.value })
                          }
                        />
                      </label>
                    )}
                    <label className="block text-sm">
                      {value.label || `Paragraph ${index + 1}`}
                      <textarea
                        className="mt-1 min-h-28 w-full rounded border p-2 leading-relaxed"
                        value={value.text}
                        onChange={(e) =>
                          change({ ...value, text: e.target.value })
                        }
                      />
                    </label>
                  </div>
                );
              })}
              {section.id === "3" && (
                <p className="text-sm text-zinc-500">
                  The selected currency, discount and fee table are populated
                  from Agreement Details.
                </p>
              )}
            </fieldset>
          </details>
        );
      })}
    </div>
  );
}
