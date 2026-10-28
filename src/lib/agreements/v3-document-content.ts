import type { AgreementRecord } from "../../types/agreement";
import master from "./standard-contract.json";
import { formatForeignAmount } from "./financials";

export type ContractRun = { text: string; bold?: boolean; italic?: boolean };
export type ContractParagraph = { runs: ContractRun[] };
export type AgreementDocument = {
  version: "3.0";
  sourceSha256: string;
  brand: string;
  title: string;
  reference: string;
  date: string;
  sections: { heading: string; paragraphs: ContractParagraph[] }[];
  signatures: { heading: string; name: string; date: string }[];
};

export const AGREEMENT_LAYOUT = {
  width: 595.3, height: 841.9, margin: 50.4, fontSize: 11,
  titleSize: 14, lineSpacing: 1.15, paragraphAfter: 5,
} as const;

/** Legacy finalized snapshots must never pick up a later contract by default. */
export function usesStandardAgreement(record: AgreementRecord): boolean {
  return record.status === "draft" || Boolean(record.documentSnapshot) || record.templateVersion === "3.0";
}

export function agreementDocument(record: AgreementRecord): AgreementDocument {
  if (record.status === "finalized") {
    if (!record.documentSnapshot) throw new Error("Finalized agreement is missing its contractual snapshot.");
    return record.documentSnapshot as AgreementDocument;
  }
  return buildAgreementDocument(record);
}

/** Executed only for drafts. The expanded paragraphs are saved with the existing JSON snapshot. */
export function buildAgreementDocument(r: AgreementRecord): AgreementDocument {
  const fin = r.financials;
  const currency = fin.paymentCurrency;
  const amount = (eur: number, foreign: number | null | undefined) =>
    `${currency} ${formatForeignAmount(currency === "EUR" ? eur : foreign ?? 0, currency)}`;
  const bold = (text: string): ContractRun => ({ text, bold: true });
  const text = (text: string): ContractRun => ({ text });
  const consultant = [r.consultantEntityName || "UniMondo",
    r.consultantRegNumber ? `registration number ${r.consultantRegNumber}` : "",
    r.consultantAddress ? `having its business address at ${r.consultantAddress}` : "",
  ].filter(Boolean).join(", ");
  const student = [
    `${r.studentTitle ? `${r.studentTitle} ` : ""}${r.studentFullName}`,
    r.studentParentGuardian ? `${r.studentRelationship || "child of"} ${r.studentParentGuardian}` : "",
    r.studentCnicPassport ? `holding ${r.studentIdType || "CNIC/Passport"} number ${r.studentCnicPassport}` : "",
    r.studentAddress ? `residing in ${r.studentAddress}` : "",
  ].filter(Boolean).join(", ");
  const degree = r.degreeLevel ? ` for ${/^(a|an|the)\s/i.test(r.degreeLevel) ? "" : /^[aeiou]/i.test(r.degreeLevel) ? "an " : "a "}${r.degreeLevel}${/degree|doctorate|ph\.?d/i.test(r.degreeLevel) ? "" : " degree"}` : "";
  const engagement = `${degree}${r.fieldOfStudy ? ` in ${r.fieldOfStudy}` : ""}${r.preferredDestination ? ` in ${r.preferredDestination}` : ""}${r.academicYearIntake ? ` for the ${r.academicYearIntake}${/intake$/i.test(r.academicYearIntake) ? "" : " intake"}` : ""}`;
  const slots: Record<string, ContractRun[]> = {
    consultant: [text(`(1) ${consultant}, and acting through its duly authorized representative, `), bold(r.repName),
      ...(r.repDesignation ? [text(", "), bold(r.repDesignation)] : []),
      text(" hereinafter to be referred as the “"), bold("Consultant"), text("”; and")],
    student: [text(`(2) ${student} hereinafter to be referred as the “`), bold("Student"), text("”.")],
    engagement: [text(`The Consultant and the Student are each a “Party” and together the “Parties”. Following preliminary assessment, the Student engages the Consultant to provide educational consultancy and university admission assistance${engagement}, on the terms below.`)],
    gross: [bold("Gross Consultancy Fee:"), text(` ${amount(fin.grossFeeEUR ?? fin.baseFeeEUR, fin.grossFee ?? (fin.agreedExchangeRate ? fin.baseFeeEUR * fin.agreedExchangeRate : null))}`)],
    discount: [bold("Authorized Discount:"), text(` ${fin.discountType === "percentage" ? `${fin.discountPercent}% — ` : ""}${amount(fin.discountEUR, fin.discountForeign)}`)],
    net: [bold("Final Agreed Consultancy Fee:"), text(` ${amount(fin.netFeeEUR, fin.netFeeForeign)}`)],
    first: [bold(`First Instalment — 30% (${amount(fin.firstInstalmentEUR, fin.firstInstalmentForeign)}):`), text(" payable upon signing this Agreement and commencement of the engagement.")],
    second: [bold(`Second Instalment — 40% (${amount(fin.secondInstalmentEUR, fin.secondInstalmentForeign)}):`), text(" payable upon submission of the first agreed university admission application.")],
    third: [bold(`Third Instalment — 30% (${amount(fin.thirdInstalmentEUR, fin.thirdInstalmentForeign)}):`), text(" payable upon the Student’s receipt of an embassy or consulate visa appointment date.")],
  };
  return {
    version: "3.0", sourceSha256: master.sourceSha256, brand: master.brand, title: master.title,
    reference: r.referenceNumber.startsWith("UM/") ? r.referenceNumber : `UM/${r.referenceNumber}`,
    date: r.agreementDate,
    sections: master.sections.map(section => ({ heading: section.heading, paragraphs: section.paragraphs.map(p => ({
      runs: "slot" in p ? slots[p.slot!] : p.runs!,
    })) })),
    signatures: [
      { heading: "FOR UNIMONDO", name: r.repName, date: r.repDate || r.agreementDate },
      { heading: "FOR THE STUDENT", name: r.studentFullName, date: r.studentSignatureDate || r.agreementDate },
    ],
  };
}
