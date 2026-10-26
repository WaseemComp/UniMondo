"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { calculateAgreementFinancials, validateAgreementForExport, formatForeignAmount } from "@/lib/agreements/financials";
import type { AgreementFormInput, AgreementRecord, DiscountType, PaymentCurrency } from "@/types/agreement";
import { CURRENCY_OPTIONS, CURRENCY_DECIMALS } from "@/types/agreement";
import { FileDown, Printer, Save, ArrowLeft, AlertCircle } from "lucide-react";

type Props = {
  initialData?: AgreementRecord | null;
  applicationId?: string | null;
  prefill?: Partial<AgreementFormInput> | null;
  canEditDiscount: boolean;
};

export function AgreementForm({ initialData, applicationId, prefill, canEditDiscount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [referenceNumber, setReferenceNumber] = useState(
    initialData?.referenceNumber || prefill?.referenceNumber || `UM/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [agreementDate, setAgreementDate] = useState(
    initialData?.agreementDate || prefill?.agreementDate || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  );
  const [status, setStatus] = useState<"draft" | "finalized">(initialData?.status || "draft");

  // Consultant
  const [consultantEntityName, setConsultantEntityName] = useState(
    initialData?.consultantEntityName || prefill?.consultantEntityName || "UniMondo Ltd"
  );
  const [consultantRegNumber, setConsultantRegNumber] = useState(
    initialData?.consultantRegNumber || prefill?.consultantRegNumber || "14829023"
  );
  const [consultantAddress, setConsultantAddress] = useState(
    initialData?.consultantAddress || prefill?.consultantAddress || "Tripoli Tower, Suit 22, Block A, Floor 47, Tripoli, Libya"
  );

  // Student
  const [studentFullName, setStudentFullName] = useState(initialData?.studentFullName || prefill?.studentFullName || "");
  const [studentParentGuardian, setStudentParentGuardian] = useState(initialData?.studentParentGuardian || prefill?.studentParentGuardian || "");
  const [studentCnicPassport, setStudentCnicPassport] = useState(initialData?.studentCnicPassport || prefill?.studentCnicPassport || "");
  const [studentAddress, setStudentAddress] = useState(initialData?.studentAddress || prefill?.studentAddress || "");
  const [studentEmail, setStudentEmail] = useState(initialData?.studentEmail || prefill?.studentEmail || "");
  const [studentPhone, setStudentPhone] = useState(initialData?.studentPhone || prefill?.studentPhone || "");

  // Engagement
  const [degreeLevel, setDegreeLevel] = useState(initialData?.degreeLevel || prefill?.degreeLevel || "Master's Degree");
  const [fieldOfStudy, setFieldOfStudy] = useState(initialData?.fieldOfStudy || prefill?.fieldOfStudy || "");
  const [preferredDestination, setPreferredDestination] = useState(initialData?.preferredDestination || prefill?.preferredDestination || "Germany");
  const [academicYearIntake, setAcademicYearIntake] = useState(initialData?.academicYearIntake || prefill?.academicYearIntake || "Fall 2026");

  // Financials
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>(
    initialData?.financials.paymentCurrency || prefill?.paymentCurrency || "EUR"
  );
  const [agreedExchangeRate, setAgreedExchangeRate] = useState<string>(
    initialData?.financials.agreedExchangeRate != null 
      ? String(initialData.financials.agreedExchangeRate) 
      : (prefill?.agreedExchangeRate != null ? String(prefill.agreedExchangeRate) : "300")
  );
  const [exchangeRateDate, setExchangeRateDate] = useState<string>(
    initialData?.financials.exchangeRateDate || prefill?.exchangeRateDate || agreementDate
  );

  const [discountType, setDiscountType] = useState<DiscountType>(
    initialData?.financials.discountType || prefill?.discountType || "percentage"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initialData?.financials.discountValue != null 
      ? String(initialData.financials.discountValue) 
      : (prefill?.discountValue != null ? String(prefill.discountValue) : "0")
  );

  // Signatures
  const [repName, setRepName] = useState(initialData?.repName || prefill?.repName || "UniMondo Admissions Team");
  const [repDesignation, setRepDesignation] = useState(initialData?.repDesignation || prefill?.repDesignation || "Admissions Director");
  const [repDate, setRepDate] = useState(initialData?.repDate || prefill?.repDate || agreementDate);
  const [studentSignatureDate, setStudentSignatureDate] = useState(initialData?.studentSignatureDate || prefill?.studentSignatureDate || agreementDate);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live calculation
  const financials = calculateAgreementFinancials({
    paymentCurrency,
    agreedExchangeRate: agreedExchangeRate ? parseFloat(agreedExchangeRate) : null,
    exchangeRateDate,
    discountType,
    discountValue: discountValue ? parseFloat(discountValue) : 0,
  });

  const getFormData = (): AgreementFormInput => ({
    referenceNumber,
    agreementDate,
    applicationId: initialData?.applicationId || applicationId || null,
    status,
    consultantEntityName,
    consultantRegNumber,
    consultantAddress,
    studentFullName,
    studentParentGuardian,
    studentCnicPassport,
    studentAddress,
    studentEmail,
    studentPhone,
    degreeLevel,
    fieldOfStudy,
    preferredDestination,
    academicYearIntake,
    paymentCurrency,
    agreedExchangeRate: paymentCurrency === "PKR" ? parseFloat(agreedExchangeRate) || null : null,
    exchangeRateDate: paymentCurrency === "PKR" ? exchangeRateDate : null,
    discountType,
    discountValue: parseFloat(discountValue) || 0,
    repName,
    repDesignation,
    repDate,
    studentSignatureDate,
  });

  const handleSave = async (silent = false) => {
    const data = getFormData();
    try {
      const url = initialData?.id ? `/api/admin/agreements/${initialData.id}` : "/api/admin/agreements";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to save agreement draft.");
      }

      if (!silent) {
        toast.success("Agreement draft saved successfully.");
      }

      if (!initialData?.id && json.agreement?.id) {
        router.push(`/admin/agreements/${json.agreement.id}`);
      } else {
        router.refresh();
      }
      return json.agreement as AgreementRecord;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving agreement.");
      return null;
    }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    const data = getFormData();
    const validationErrors = validateAgreementForExport(data);

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((e) => {
        errorMap[e.field] = e.message;
      });
      setErrors(errorMap);
      toast.error("Please fill in all required fields before export.");
      return;
    }
    setErrors({});

    // First ensure draft is saved
    const saved = await handleSave(true);
    const agreementId = saved?.id || initialData?.id;
    if (!agreementId) return;

    window.open(`/api/admin/agreements/${agreementId}/export?format=${format}`, "_blank");
  };

  const isNonEur = paymentCurrency !== "EUR";
  const fmtF = (v: number) => formatForeignAmount(v, paymentCurrency);
  const rateLabel = `1 EUR = ${paymentCurrency} ...`;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/agreements"
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {initialData ? `Edit Agreement (${initialData.referenceNumber})` : "Create Retainer Agreement"}
            </h1>
            <p className="text-xs text-zinc-500">
              Authoritative Retainer Agreement · 0.7″ Margins · Times New Roman · €1,000 Base Fee
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await handleSave();
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleExport("docx")}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition"
          >
            <FileDown className="h-4 w-4" />
            Download Word (.docx)
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center gap-2 rounded-lg bg-[#244B50] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1a383c] transition shadow-sm"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </button>
          {initialData?.id ? (
            <Link
              href={`/admin/agreements/${initialData.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </Link>
          ) : null}
        </div>
      </div>

      {applicationId ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-950 flex items-center justify-between">
          <span>
            Prefilled from application tracking ID: <strong>{applicationId}</strong>
          </span>
          <Link
            href={`/admin/applications/${encodeURIComponent(applicationId)}`}
            className="text-xs font-semibold underline hover:text-teal-800"
          >
            View Application
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Form Fields */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Agreement Meta */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Agreement Reference &amp; Status</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Agreement Reference *</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="UM/2026/001"
                />
                {errors.referenceNumber ? <p className="text-xs text-red-600 mt-1">{errors.referenceNumber}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Agreement Date *</label>
                <input
                  type="text"
                  value={agreementDate}
                  onChange={(e) => setAgreementDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="25 October 2026"
                />
                {errors.agreementDate ? <p className="text-xs text-red-600 mt-1">{errors.agreementDate}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "finalized")}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="draft">Draft (Incomplete allowed)</option>
                  <option value="finalized">Finalized (Ready for signing)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Card 2: Consultant Party */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Consultant (UniMondo Entity)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Registered Legal Entity *</label>
                <input
                  type="text"
                  value={consultantEntityName}
                  onChange={(e) => setConsultantEntityName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.consultantEntityName ? <p className="text-xs text-red-600 mt-1">{errors.consultantEntityName}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  value={consultantRegNumber}
                  onChange={(e) => setConsultantRegNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.consultantRegNumber ? <p className="text-xs text-red-600 mt-1">{errors.consultantRegNumber}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Registered Address *</label>
                <input
                  type="text"
                  value={consultantAddress}
                  onChange={(e) => setConsultantAddress(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.consultantAddress ? <p className="text-xs text-red-600 mt-1">{errors.consultantAddress}</p> : null}
              </div>
            </div>
          </section>

          {/* Card 3: Student Party Details */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Student Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="Muhammad Ahmad Khan"
                />
                {errors.studentFullName ? <p className="text-xs text-red-600 mt-1">{errors.studentFullName}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Son/Daughter of (Parent/Guardian) *</label>
                <input
                  type="text"
                  value={studentParentGuardian}
                  onChange={(e) => setStudentParentGuardian(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="Parent or Guardian Legal Name"
                />
                {errors.studentParentGuardian ? <p className="text-xs text-red-600 mt-1">{errors.studentParentGuardian}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">CNIC / Passport Number *</label>
                <input
                  type="text"
                  value={studentCnicPassport}
                  onChange={(e) => setStudentCnicPassport(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. 42101-1234567-1 or AB1234567"
                />
                {errors.studentCnicPassport ? <p className="text-xs text-red-600 mt-1">{errors.studentCnicPassport}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="+92 300 1234567"
                />
                {errors.studentPhone ? <p className="text-xs text-red-600 mt-1">{errors.studentPhone}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="student@example.com"
                />
                {errors.studentEmail ? <p className="text-xs text-red-600 mt-1">{errors.studentEmail}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Residential Address *</label>
                <textarea
                  rows={2}
                  value={studentAddress}
                  onChange={(e) => setStudentAddress(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="Full street address, city, country"
                />
                {errors.studentAddress ? <p className="text-xs text-red-600 mt-1">{errors.studentAddress}</p> : null}
              </div>
            </div>
          </section>

          {/* Card 4: Educational Engagement */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Educational Engagement (Clause 1)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Degree Level *</label>
                <input
                  type="text"
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. Master's Degree or Bachelor's Degree"
                />
                {errors.degreeLevel ? <p className="text-xs text-red-600 mt-1">{errors.degreeLevel}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Field of Study *</label>
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. Computer Science & AI"
                />
                {errors.fieldOfStudy ? <p className="text-xs text-red-600 mt-1">{errors.fieldOfStudy}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Preferred Destination *</label>
                <input
                  type="text"
                  value={preferredDestination}
                  onChange={(e) => setPreferredDestination(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. Germany"
                />
                {errors.preferredDestination ? <p className="text-xs text-red-600 mt-1">{errors.preferredDestination}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Academic Year / Intake *</label>
                <input
                  type="text"
                  value={academicYearIntake}
                  onChange={(e) => setAcademicYearIntake(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. Fall 2026"
                />
                {errors.academicYearIntake ? <p className="text-xs text-red-600 mt-1">{errors.academicYearIntake}</p> : null}
              </div>
            </div>
          </section>

          {/* Card 5: Financials & Discounts */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Financial Terms &amp; Exchange Rate</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                Base Fee: €1,000 (Fixed)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Payment Currency</label>
                <select
                  value={paymentCurrency}
                  onChange={(e) => {
                    const next = e.target.value as PaymentCurrency;
                    if (next !== paymentCurrency) {
                      // Clear rate to prevent reusing a rate agreed for a different currency
                      setAgreedExchangeRate("");
                      setExchangeRateDate("");
                    }
                    setPaymentCurrency(next);
                  }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                >
                  {CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {isNonEur ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      {rateLabel} *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.000001"
                      value={agreedExchangeRate}
                      onChange={(e) => setAgreedExchangeRate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      placeholder={paymentCurrency === "PKR" ? "e.g. 305" : paymentCurrency === "LYD" ? "e.g. 5.234" : "e.g. 1.08"}
                    />
                    {errors.agreedExchangeRate ? <p className="text-xs text-red-600 mt-1">{errors.agreedExchangeRate}</p> : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Exchange Rate Agreed Date *
                    </label>
                    <input
                      type="text"
                      value={exchangeRateDate}
                      onChange={(e) => setExchangeRateDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      placeholder="25 / 10 / 2026"
                    />
                    {errors.exchangeRateDate ? <p className="text-xs text-red-600 mt-1">{errors.exchangeRateDate}</p> : null}
                  </div>
                </>
              ) : null}

              {/* Discount Section */}
              <div className="sm:col-span-2 border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-zinc-800">
                    Authorised Discount
                  </label>
                  {!canEditDiscount ? (
                    <span className="flex items-center gap-1 text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                      <AlertCircle className="h-3 w-3" />
                      Admin privilege required
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Discount Mode</label>
                    <select
                      disabled={!canEditDiscount}
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      {discountType === "percentage" ? "Discount Percentage (0 - 100%)" : "Discount Amount in EUR (0 - 1000)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === "percentage" ? 100 : 1000}
                      disabled={!canEditDiscount}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Card 6: UniMondo Representative Details */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">UniMondo Representative (Signatures)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Representative Name *</label>
                <input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.repName ? <p className="text-xs text-red-600 mt-1">{errors.repName}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Designation *</label>
                <input
                  type="text"
                  value={repDesignation}
                  onChange={(e) => setRepDesignation(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.repDesignation ? <p className="text-xs text-red-600 mt-1">{errors.repDesignation}</p> : null}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Live Calculated Breakdown & Document Preview */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Live Calculation Breakdown
            </h2>

            {/* Table 2 Preview */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-100 text-zinc-800 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-2 px-3">Particulars</th>
                    <th className="py-2 px-2 text-center">%</th>
                    <th className="py-2 px-2 text-right">EUR</th>
                    {isNonEur ? <th className="py-2 px-3 text-right">{paymentCurrency}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  <tr>
                    <td className="py-2 px-3">Consultancy Fee:</td>
                    <td className="py-2 px-2 text-center">n/a</td>
                    <td className="py-2 px-2 text-right font-medium underline">1,000/-</td>
                    {isNonEur ? (
                      <td className="py-2 px-3 text-right font-medium underline">
                        {financials.agreedExchangeRate ? `${fmtF(financials.baseFeeEUR * financials.agreedExchangeRate)}/-` : "—"}
                      </td>
                    ) : null}
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Discount:</td>
                    <td className="py-2 px-2 text-center">{financials.discountPercent}%</td>
                    <td className="py-2 px-2 text-right underline">{financials.discountEUR.toLocaleString()}/-</td>
                    {isNonEur ? (
                      <td className="py-2 px-3 text-right underline">
                        {financials.discountForeign != null ? `${fmtF(financials.discountForeign)}/-` : "—"}
                      </td>
                    ) : null}
                  </tr>
                  <tr className="bg-amber-50/60 font-semibold text-zinc-900">
                    <td className="py-2.5 px-3">Net Consultancy Fee:</td>
                    <td className="py-2.5 px-2 text-center">n/a</td>
                    <td className="py-2.5 px-2 text-right underline">{financials.netFeeEUR.toLocaleString()}/-</td>
                    {isNonEur ? (
                      <td className="py-2.5 px-3 text-right underline">
                        {financials.netFeeForeign != null ? `${fmtF(financials.netFeeForeign)}/-` : "—"}
                      </td>
                    ) : null}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fixed 30 / 40 / 30 Instalment Schedule */}
            <div className="space-y-2 border-t border-zinc-200 pt-4 text-xs">
              <h3 className="font-bold text-zinc-900 uppercase tracking-wide">
                Fixed 30% / 40% / 30% Instalments
              </h3>
              <div className="space-y-1.5 text-zinc-600">
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span>1st Instalment (30% on signing):</span>
                  <span className="font-semibold text-zinc-900">
                    EUR {financials.firstInstalmentEUR.toLocaleString()}
                    {isNonEur && financials.firstInstalmentForeign != null ? ` / ${paymentCurrency} ${fmtF(financials.firstInstalmentForeign)}` : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span>2nd Instalment (40% on submission):</span>
                  <span className="font-semibold text-zinc-900">
                    EUR {financials.secondInstalmentEUR.toLocaleString()}
                    {isNonEur && financials.secondInstalmentForeign != null ? ` / ${paymentCurrency} ${fmtF(financials.secondInstalmentForeign)}` : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span>3rd Instalment (30% on appointment date):</span>
                  <span className="font-semibold text-zinc-900">
                    EUR {financials.thirdInstalmentEUR.toLocaleString()}
                    {isNonEur && financials.thirdInstalmentForeign != null ? ` / ${paymentCurrency} ${fmtF(financials.thirdInstalmentForeign)}` : ""}
                  </span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-teal-900">
                  <span>Total Scheduled:</span>
                  <span>
                    EUR {(financials.firstInstalmentEUR + financials.secondInstalmentEUR + financials.thirdInstalmentEUR).toLocaleString()}
                    {isNonEur && financials.netFeeForeign != null ? ` / ${paymentCurrency} ${fmtF(financials.netFeeForeign)}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Details Summary */}
            <div className="rounded-xl bg-zinc-50 p-3 text-xs space-y-1.5 text-zinc-600">
              <p>
                <strong>Typography:</strong> Times New Roman
              </p>
              <p>
                <strong>Margins:</strong> 0.7″ on all 4 sides (1008 dxa)
              </p>
              <p>
                <strong>Page Size:</strong> US Letter Portrait (8.5 × 11″)
              </p>
              <p>
                <strong>Signature Lines:</strong> Preserved blank for handwritten signing
              </p>
              <p>
                <strong>Stamp Area:</strong> Preserved blank for physical UniMondo stamp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
