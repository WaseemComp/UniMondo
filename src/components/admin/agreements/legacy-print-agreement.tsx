"use client";

import { useEffect } from "react";
import type { AgreementRecord } from "@/types/agreement";
import { consultantWording, studentWording, engagementWording } from "@/lib/agreements/wording";
import { formatForeignAmount } from "@/lib/agreements/financials";
import { Printer, X } from "lucide-react";

type Props = {
  agreement: AgreementRecord;
};

export function LegacyPrintAgreementClient({ agreement }: Props) {
  useEffect(() => {
    // Auto-focus window for keyboard shortcut discoverability
  }, []);

  const fin = agreement.financials;
  const isNonEur = fin.paymentCurrency !== "EUR";
  const currency = fin.paymentCurrency;
  const fmtF = (v: number) => formatForeignAmount(v, currency);
  const refText = agreement.referenceNumber.startsWith("UM/")
    ? agreement.referenceNumber
    : `UM/${agreement.referenceNumber}`;

  const consultantLine = consultantWording(agreement);
  const studentLine = studentWording(agreement);

  const instalment1 = fin.pricingVersion === 2 ? `${currency} ${fmtF(isNonEur ? fin.firstInstalmentForeign ?? 0 : fin.firstInstalmentEUR)}` : isNonEur && fin.firstInstalmentForeign != null
    ? `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.firstInstalmentEUR, "EUR") : fin.firstInstalmentEUR.toLocaleString())} / ${currency} ${fmtF(fin.firstInstalmentForeign)}`
    : `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.firstInstalmentEUR, "EUR") : fin.firstInstalmentEUR.toLocaleString())}`;
  const instalment2 = fin.pricingVersion === 2 ? `${currency} ${fmtF(isNonEur ? fin.secondInstalmentForeign ?? 0 : fin.secondInstalmentEUR)}` : isNonEur && fin.secondInstalmentForeign != null
    ? `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.secondInstalmentEUR, "EUR") : fin.secondInstalmentEUR.toLocaleString())} / ${currency} ${fmtF(fin.secondInstalmentForeign)}`
    : `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.secondInstalmentEUR, "EUR") : fin.secondInstalmentEUR.toLocaleString())}`;
  const instalment3 = fin.pricingVersion === 2 ? `${currency} ${fmtF(isNonEur ? fin.thirdInstalmentForeign ?? 0 : fin.thirdInstalmentEUR)}` : isNonEur && fin.thirdInstalmentForeign != null
    ? `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.thirdInstalmentEUR, "EUR") : fin.thirdInstalmentEUR.toLocaleString())} / ${currency} ${fmtF(fin.thirdInstalmentForeign)}`
    : `EUR ${(fin.pricingVersion === 2 ? formatForeignAmount(fin.thirdInstalmentEUR, "EUR") : fin.thirdInstalmentEUR.toLocaleString())}`;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 print:bg-white print:p-0 print:m-0">
      {/* Floating control bar — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#244B50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a383c] transition shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Print Document
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100 transition"
          title="Close window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Printable sheet — Letter Portrait, 0.7 in margins, Times New Roman */}
      <div
        className="mx-auto w-[8.5in] bg-white shadow-xl print:shadow-none print:w-full"
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          padding: "0.7in",
          boxSizing: "border-box",
          color: "#000",
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: letter portrait;
              margin: 0.7in;
            }
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              .page-break-before { page-break-before: always; break-before: page; }
            }
          `
        }} />

        {/* ================= PAGE 1 ================= */}
        <div>
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold tracking-tight uppercase">UNIMONDO</h1>
            <h2 className="text-sm font-bold uppercase mt-1">
              STUDENT EDUCATIONAL CONSULTANCY &amp; SERVICE RETAINER AGREEMENT
            </h2>
          </div>

          {/* Reference / Date — plain unboxed text */}
          <div className="flex justify-between mb-5 text-sm font-bold">
            <span>Reference: {refText}</span>
            <span>Date: {agreement.agreementDate || "_________________"}</span>
          </div>

          {/* 1. PARTIES AND ENGAGEMENT */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">1. PARTIES AND ENGAGEMENT</h3>
            <p className="mb-2">This Agreement is entered into between:</p>
            <p className="mb-2">(1) {consultantLine}</p>
            <p className="mb-2">(2) {studentLine}</p>
            <p className="mb-2">
              The Consultant and the Student are each referred to individually as a &ldquo;Party&rdquo; and
              collectively as the &ldquo;Parties&rdquo;.
            </p>
            <p>{engagementWording(agreement)}</p>
          </div>

          {/* 2. SCOPE OF EDUCATIONAL SERVICES */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">2. SCOPE OF EDUCATIONAL SERVICES</h3>
            <p>
              UniMondo will provide reasonable professional assistance with academic profile assessment; selection
              and shortlisting of suitable universities and programmes; eligibility and admission requirements;
              preparation and submission of agreed university applications; supporting academic documentation,
              statements and motivation letters; scholarship information and application guidance where relevant;
              correspondence and application status follow-up; and general post-admission educational and enrolment
              guidance. Any university, destination or intake not agreed under this engagement may require a
              separate written arrangement.
            </p>
          </div>

          {/* 3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT</h3>
            <p className="mb-2">
              The Parties agree that UniMondo&apos;s educational consultancy services shall be provided against a
              professional service fee. {fin.pricingVersion === 2 ? "The agreed gross consultancy fee, authorised discount and net consultancy fee are set out below in the selected payment currency." : "The base consultancy fee is EUR 1,000, or an agreed equivalent in the selected payment currency."} The authorised UniMondo administrator may approve a discount within
              delegated authority. The discounted net amount entered below shall be the final agreed fee upon
              signature.
            </p>
            {/* Table 2: Fees */}
            {fin.pricingVersion === 2 ? <table className="w-full border-collapse border border-black text-[12.5px] mb-2">
              <thead><tr>{["Particulars", "Discount %", currency].map(label => <th key={label} className="border border-black p-1.5 text-left">{label}</th>)}</tr></thead>
              <tbody>{[
                ["Gross consultancy fee", "—", fmtF(fin.grossFee ?? 0)],
                ["Authorised discount", fin.discountType === "amount" ? "n/a" : `${fin.discountPercent}%`, fmtF(isNonEur ? fin.discountForeign ?? 0 : fin.discountEUR)],
                ["Net consultancy fee", "—", fmtF(isNonEur ? fin.netFeeForeign ?? 0 : fin.netFeeEUR)],
              ].map(row => <tr key={row[0]}>{row.map((value, index) => <td key={index} className="border border-black p-1.5">{value}</td>)}</tr>)}</tbody>
            </table> : (            <table className="w-full border-collapse border border-black text-[12.5px] mb-2">
              <thead>
                <tr className="bg-zinc-100 font-bold">
                  <th className="border border-black p-1.5 text-left w-[40%]">Particulars</th>
                  <th className="border border-black p-1.5 text-center w-[15%]">%</th>
                  <th className="border border-black p-1.5 text-right w-[22%]">EUR</th>
                  <th className="border border-black p-1.5 text-right w-[23%]">{currency}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1.5">Consultancy Fee:</td>
                  <td className="border border-black p-1.5 text-center">n/a</td>
                  <td className="border border-black p-1.5 text-right underline">{fin.pricingVersion === 2 ? formatForeignAmount(fin.grossFeeEUR ?? 1000, "EUR") : "1,000"}/-</td>
                  <td className="border border-black p-1.5 text-right underline">
                    {isNonEur && fin.agreedExchangeRate
                      ? `${fmtF(fin.grossFee ?? fin.baseFeeEUR * fin.agreedExchangeRate)}/-`
                      : "\u2014"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Discount:</td>
                  <td className="border border-black p-1.5 text-center underline">{fin.pricingVersion === 2 && fin.discountType === "amount" ? "n/a" : `${fin.discountPercent}%`}</td>
                  <td className="border border-black p-1.5 text-right underline">{(fin.pricingVersion === 2 ? formatForeignAmount(fin.discountEUR, "EUR") : fin.discountEUR.toLocaleString())}/-</td>
                  <td className="border border-black p-1.5 text-right underline">
                    {isNonEur && fin.discountForeign != null ? `${fmtF(fin.discountForeign)}/-` : "\u2014"}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black p-1.5">Net Consultancy Fee:</td>
                  <td className="border border-black p-1.5 text-center">n/a</td>
                  <td className="border border-black p-1.5 text-right underline">{(fin.pricingVersion === 2 ? formatForeignAmount(fin.netFeeEUR, "EUR") : fin.netFeeEUR.toLocaleString())}/-</td>
                  <td className="border border-black p-1.5 text-right underline">
                    {isNonEur && fin.netFeeForeign != null ? `${fmtF(fin.netFeeForeign)}/-` : "\u2014"}
                  </td>
                </tr>
              </tbody>
            </table>)}

          </div>

          {/* 4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE</h3>
            <p className="mb-1">
              <strong>First Instalment &mdash; 30%</strong> ({instalment1}) payable upon signing this Agreement
              and commencement of the engagement.
            </p>
            <p className="mb-1">
              <strong>Second Instalment &mdash; 40%</strong> ({instalment2}) payable upon submission of the
              first agreed university admission application.
            </p>
            <p className="mb-1.5">
              <strong>Third Instalment &mdash; 30%</strong> ({instalment3}) (payable upon the Student&apos;s
              receipt of an embassy/consulate visa appointment date).
            </p>
            <p className="italic text-[12px]">
              The third instalment is an agreed payment timing milestone only: UniMondo does not arrange or
              guarantee appointments, undertake visa applications, or provide immigration services under this
              Agreement.
            </p>
          </div>

          {/* 5. CANCELLATION AND REFUND */}
          <div className="text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">5. CANCELLATION AND REFUND</h3>
            <p className="mb-1.5">
              <strong>No admission:</strong> If no admission offer is obtained following completion of the
              agreed application cycle despite the Student&apos;s compliance with this Agreement, UniMondo
              shall refund 70% of the consultancy fees actually paid, subject to mandatory law.
            </p>
            <p className="mb-1.5">
              <strong>Student cancellation before admission:</strong> If the Student voluntarily cancels before
              receiving an admission offer, UniMondo shall refund 50% of the first instalment received. Payments
              relating to completed later milestones, if any, shall be settled according to services performed
              and applicable law.
            </p>
            <p>
              <strong>Student cancellation after admission:</strong> If the Student cancels after receiving an
              admission offer, UniMondo shall retain the first instalment (30% of the final agreed fee) and
              refund all additional consultancy fees actually paid, subject to mandatory law. Statutory
              withdrawal and refund rights prevail over any inconsistent term.
            </p>
          </div>
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="page-break-before pt-6 print:pt-0">
          {/* 6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS</h3>
            <p className="mb-1.5">
              <strong>Educational outcomes:</strong> University admission, academic recognition, scholarships
              and funding decisions are determined independently by the relevant institutions. UniMondo undertakes
              reasonable care and diligence, but does not guarantee admission, scholarships, an acceptance date
              or any particular result.
            </p>
            <p className="mb-1.5">
              <strong>Visa and immigration:</strong> UniMondo is an educational consultancy, not a visa or
              immigration consultancy or legal representative under this Agreement. Visa applications,
              appointments, evidence, submissions and immigration compliance are the Student&apos;s
              responsibility, assisted by appropriately authorised professionals if needed. Any general public
              information shared by UniMondo is incidental orientation, not individual immigration advice.
              UniMondo does not promise or guarantee visa or residence approval. Visa refusal or delay alone
              does not establish non-performance of educational services.
            </p>
            <p className="mb-1.5">
              <strong>Official payments and additional charges:</strong> Payments shall be made only through
              officially designated UniMondo channels and acknowledged by receipt. Additional consultancy
              charges require prior written agreement.
            </p>
            <p className="mb-1.5">
              <strong>Student obligations:</strong> The Student shall provide complete, accurate and authentic
              documents; disclose relevant academic circumstances; review and approve applications; cooperate
              promptly; meet examinations, interviews and deadlines; share important university correspondence;
              and pay the agreed fees. UniMondo may suspend or end the engagement on reasonable written notice
              for material non-cooperation, fraudulent documents or non-payment of an amount properly due,
              subject to applicable law.
            </p>
            <p className="mb-1.5">
              <strong>Excluded third-party charges:</strong> University application and tuition fees, tests,
              translations, attestations, legalisation, visa-related charges, insurance, travel and
              accommodation are not included unless expressly stated otherwise in writing. The Student must be
              informed of material known third-party costs before agreeing to incur them.
            </p>
            <p>
              <strong>Liability:</strong> Nothing in this Agreement excludes liability for negligence,
              misrepresentation, failure to perform agreed services, or other liability that cannot lawfully
              be excluded.
            </p>
          </div>

          {/* 7. CONFIDENTIALITY, DURATION AND GENERAL TERMS */}
          <div className="mb-4 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">7. CONFIDENTIALITY, DURATION AND GENERAL TERMS</h3>
            <p>
              Both Parties shall treat personal and academic information confidentially. UniMondo may process
              and share necessary information with relevant educational institutions in accordance with
              applicable data-protection law and its privacy notice. This Agreement takes effect on signature
              and continues for the agreed application cycle, unless completed or lawfully terminated sooner.
              Amendments must be recorded in writing and accepted by both Parties. Concerns shall first be
              raised and discussed in good faith, without limiting available legal rights.
            </p>
          </div>

          {/* 8. ACCEPTANCE AND SIGNATURES */}
          <div className="mb-5 text-justify text-[13px] leading-[1.35]">
            <h3 className="font-bold text-[13.5px] uppercase mb-1.5">8. ACCEPTANCE AND SIGNATURES</h3>
            <p>
              By signing, the Student acknowledges the agreed services, total fee and discount, fixed
              three-instalment schedule, refund terms and the express exclusion of visa and immigration
              consultancy services.
            </p>
          </div>

          {/* Signature blocks */}
          <table className="w-full text-[13px] mb-8">
            <thead>
              <tr className="font-bold">
                <td className="w-1/2 pb-3">FOR UNIMONDO</td>
                <td className="w-1/2 pb-3">FOR THE STUDENT</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2.5">Signature: ____________________________________</td>
                <td className="py-2.5">Signature: ____________________________________</td>
              </tr>
              <tr>
                <td className="py-2.5">Name: {agreement.repName || "_______________________________________"}</td>
                <td className="py-2.5">Name: {agreement.studentFullName || "_______________________________________"}</td>
              </tr>
              <tr>
                <td className="py-2.5">{agreement.repDesignation ? `Designation: ${agreement.repDesignation}` : ""}</td>
                <td className="py-2.5">{fin.pricingVersion === 2 ? agreement.studentIdType || "CNIC/Passport" : "CNIC/Passport"}: {agreement.studentCnicPassport || "_______________________________"}</td>
              </tr>
              <tr>
                <td className="py-2.5">Date: {agreement.repDate || agreement.agreementDate || "________________________________________"}</td>
                <td className="py-2.5">Date: {agreement.studentSignatureDate || agreement.agreementDate || "_______________________________________"}</td>
              </tr>
            </tbody>
          </table>

          {/* Stamp area — blank space + rule + small label */}
          <div>
            <div style={{ height: "3rem" }} /> {/* blank space for physical stamp */}
            <hr style={{ width: "7.5rem", borderTop: "0.6px solid #000", margin: "0" }} />
            <p className="text-[10px] italic text-zinc-500 mt-0.5">Official Stamp of UniMondo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
