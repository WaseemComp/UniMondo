import { z } from "zod";
import source from "./appendix-contract.json";
export const STANDARD_CLAUSES = source.sections;
export type ClauseEdits = {
  headings?: Record<string, string>;
  paragraphs?: Record<string, { text: string; label?: string }>;
};
const override = z
  .object({
    text: z.string().trim().min(1).max(12000),
    label: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
const schema = z
  .object({
    headings: z
      .record(z.string(), z.string().trim().min(1).max(180))
      .optional(),
    paragraphs: z.record(z.string(), override).optional(),
  })
  .strict();
const normalize = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0 ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
export function validateClauseEdits(input: unknown): ClauseEdits {
  const parsed = schema.parse(input ?? {}),
    result: ClauseEdits = { headings: {}, paragraphs: {} };
  if (JSON.stringify(parsed).length > 80000)
    throw new Error("Clause edits exceed the safe document size.");
  for (const [id, heading] of Object.entries(parsed.headings ?? {})) {
    const section = STANDARD_CLAUSES.find((item) => item.id === id);
    if (!section)
      throw new Error("All eight agreement sections must be retained.");
    const value = normalize(heading);
    if (/[\n<>\[\]«»]/.test(value) || /^\d+[.)]\s/.test(value))
      throw new Error(
        "Use a plain section heading without numbering or placeholders.",
      );
    if (value !== section.heading) result.headings![id] = value;
  }
  for (const [id, value] of Object.entries(parsed.paragraphs ?? {})) {
    const section = STANDARD_CLAUSES.find((item) =>
        item.paragraphs.some((p) => p.id === id),
      ),
      base = section?.paragraphs.find((p) => p.id === id);
    if (!base)
      throw new Error("A required agreement clause is not recognised.");
    const text = normalize(value.text),
      label = value.label === undefined ? undefined : normalize(value.label);
    const tokens = (text: string) => (text.match(/«[^»]+»/g) ?? []).sort();
    if (
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) ||
      JSON.stringify(tokens(text)) !== JSON.stringify(tokens(base.text)) ||
      /[<>\[\]{}]|_{3,}/.test(text) ||
      text.replace(/«[^»]+»/g, "").match(/[«»]/)
    )
      throw new Error(
        "Keep every labelled agreement field once and remove incomplete brackets or placeholders.",
      );
    if (
      Boolean("label" in base) !== Boolean(label) ||
      (label && /[<>\[\]{}«»\n]/.test(label))
    )
      throw new Error("Retain the subsection label and its text.");
    if (
      ["3", "4"].includes(section!.id) &&
      /(?:\b(?:EUR|PKR|LYD|TND|TRY|USD|BDT)\s*[\d.,]|[€$£]\s*\d|\d\s*%)/i.test(
        text,
      )
    )
      throw new Error(
        "Financial amounts and instalment percentages are calculated fields. Change financial details, not clause text.",
      );
    if (
      text !== base.text ||
      label !== ("label" in base ? base.label : undefined)
    )
      result.paragraphs![id] = { text, ...(label ? { label } : {}) };
  }
  if (!Object.keys(result.headings!).length) delete result.headings;
  if (!Object.keys(result.paragraphs!).length) delete result.paragraphs;
  return result;
}
export function restrictedClausesChanged(
  next: ClauseEdits,
  previous: ClauseEdits = {},
) {
  const restricted = (edits: ClauseEdits) =>
    ["3", "4", "5"].map((id) => ({
      heading: edits.headings?.[id] ?? null,
      paragraphs: STANDARD_CLAUSES.find((s) => s.id === id)!.paragraphs.map(
        (p) => edits.paragraphs?.[p.id] ?? null,
      ),
    }));
  return (
    JSON.stringify(restricted(next)) !== JSON.stringify(restricted(previous))
  );
}
export function clauseText(
  edits: ClauseEdits,
  paragraph: { id: string; text: string; label?: string },
) {
  return (
    edits.paragraphs?.[paragraph.id] ?? {
      text: paragraph.text,
      ...(paragraph.label ? { label: paragraph.label } : {}),
    }
  );
}
