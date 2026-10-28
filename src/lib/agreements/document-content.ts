import type { AgreementRecord } from "../../types/agreement";
import master from "./appendix-contract.json";
import { formatForeignAmount } from "./financials";
import { formatAgreementDate } from "./dates";
import { clauseText } from "./clauses";
import { buildAgreementDocument as buildV3Document } from "./v3-document-content";
export type ContractRun = { text: string; bold?: boolean; italic?: boolean };
export type ContractParagraph = { runs: ContractRun[] };
export type AgreementDocument = {
  version: "3.0" | "4.0";
  sourceSha256: string;
  brand: string;
  title: string;
  reference: string;
  date: string;
  sections: {
    heading: string;
    paragraphs: ContractParagraph[];
    financialTable?: { headers: string[]; rows: string[][] };
  }[];
  signatures: {
    heading: string;
    name: string;
    date: string;
    designation?: string;
    identity?: string;
  }[];
};
export const AGREEMENT_LAYOUT = {
  width: 595.3,
  height: 841.9,
  margin: 50.4,
  fontSize: 11,
  titleSize: 14,
  lineSpacing: 1.15,
  paragraphAfter: 5,
} as const;
export function usesStandardAgreement(record: AgreementRecord) {
  return (
    record.status === "draft" ||
    Boolean(record.documentSnapshot) ||
    ["3.0", "4.0"].includes(record.templateVersion)
  );
}
export function agreementDocument(record: AgreementRecord): AgreementDocument {
  if (record.status === "finalized") {
    if (!record.documentSnapshot)
      throw new Error(
        "Finalized agreement is missing its contractual snapshot.",
      );
    return record.documentSnapshot;
  }
  return buildAgreementDocument(record);
}
export function buildAgreementDocument(r: AgreementRecord): AgreementDocument {
  if (r.templateVersion !== "4.0") return buildV3Document(r);
  const edits = r.clauseEdits ?? {},
    fin = r.financials,
    currency = fin.paymentCurrency;
  const amount = (eur: number, foreign: number | null | undefined) =>
    formatForeignAmount(currency === "EUR" ? eur : (foreign ?? 0), currency);
  const values: Record<string, string> = {
    "Consultant details": [
      r.consultantEntityName || "UniMondo",
      r.consultantRegNumber
        ? `registration number ${r.consultantRegNumber}`
        : "",
      r.consultantAddress ? `with its address at ${r.consultantAddress}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    "Representative name": r.repName,
    "Representative designation": r.repDesignation
      ? `, ${r.repDesignation}`
      : "",
    "Student details": [
      `${r.studentTitle ? `${r.studentTitle} ` : ""}${r.studentFullName}`,
      r.studentParentGuardian
        ? `${r.studentRelationship || "child of"} ${r.studentParentGuardian}`
        : "",
      r.studentCnicPassport
        ? `holding ${r.studentIdType || "CNIC/Passport"} No. ${r.studentCnicPassport}`
        : "",
      r.studentAddress ? `residing at ${r.studentAddress}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    "Engagement details": [
      r.degreeLevel,
      r.fieldOfStudy,
      r.preferredDestination,
      r.academicYearIntake,
    ].filter(Boolean).length
      ? ` concerning ${[r.degreeLevel, r.fieldOfStudy, r.preferredDestination, r.academicYearIntake].filter(Boolean).join(", ")}`
      : "",
  };
  const expand = (text: string): ContractRun[] =>
    text
      .split(/(«[^»]+»)/g)
      .filter(Boolean)
      .map((part) =>
        part.startsWith("«")
          ? { text: values[part.slice(1, -1)] ?? "", bold: true }
          : { text: part },
      );
  const payments = {
    first: amount(fin.firstInstalmentEUR, fin.firstInstalmentForeign),
    second: amount(fin.secondInstalmentEUR, fin.secondInstalmentForeign),
    third: amount(fin.thirdInstalmentEUR, fin.thirdInstalmentForeign),
  };
  return {
    version: "4.0",
    sourceSha256: master.sourceSha256,
    brand: master.brand,
    title: master.title,
    reference: r.referenceNumber.startsWith("UM/")
      ? r.referenceNumber
      : `UM/${r.referenceNumber}`,
    date: formatAgreementDate(r.agreementDate),
    sections: master.sections.map((section) => ({
      heading: `${section.id}. ${edits.headings?.[section.id] ?? section.heading}`,
      paragraphs: section.paragraphs.flatMap((p) => {
        const value = clauseText(edits, p),
          parts = value.text.split(/\n\s*\n/);
        const payment =
          "payment" in p ? (String(p.payment) as keyof typeof payments) : null;
        return parts.map((part, index) => ({
          runs: [
            ...(index === 0 && payment
              ? [
                  {
                    text: `${payment === "first" ? "a) First Instalment — 30%" : payment === "second" ? "b) Second Instalment — 40%" : "c) Third Instalment — 30%"}: ${currency} ${payments[payment]} `,
                    bold: true,
                  },
                ]
              : []),
            ...(index === 0 && value.label
              ? [{ text: value.label + " ", bold: true }]
              : []),
            ...expand(part.replace(/\s+/g, " ")),
          ],
        }));
      }),
      ...(section.id === "3"
        ? {
            financialTable: {
              headers: ["Particulars", "Discount %", currency],
              rows: [
                [
                  "Gross consultancy fee",
                  "—",
                  amount(
                    fin.grossFeeEUR ?? fin.baseFeeEUR,
                    fin.grossFee ??
                      (fin.agreedExchangeRate
                        ? fin.baseFeeEUR * fin.agreedExchangeRate
                        : null),
                  ),
                ],
                [
                  "Authorised discount",
                  `${fin.discountPercent}%`,
                  amount(fin.discountEUR, fin.discountForeign),
                ],
                [
                  "Net consultancy fee",
                  "—",
                  amount(fin.netFeeEUR, fin.netFeeForeign),
                ],
              ],
            },
          }
        : {}),
    })),
    signatures: [
      {
        heading: "FOR UNIMONDO",
        name: r.repName,
        designation: r.repDesignation,
        date: formatAgreementDate(r.repDate || r.agreementDate),
      },
      {
        heading: "FOR THE STUDENT",
        name: r.studentFullName,
        identity: r.studentCnicPassport
          ? `${r.studentIdType || "CNIC/Passport"}: ${r.studentCnicPassport}`
          : "",
        date: formatAgreementDate(r.studentSignatureDate || r.agreementDate),
      },
    ],
  };
}
