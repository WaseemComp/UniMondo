"use client";

import { calendarDate } from "@/lib/agreements/dates";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { calculateAgreementFinancials, agreementPricingUnchanged, validateAgreementPricing, formatForeignAmount } from "@/lib/agreements/financials";
import type { AgreementFormInput, AgreementRecord, DiscountType, PaymentCurrency } from "@/types/agreement";
import { CURRENCY_OPTIONS, CURRENCY_DECIMALS } from "@/types/agreement";
import { buildAgreementDocument } from "@/lib/agreements/document-content";
import { validateClauseEdits, restrictedClausesChanged, type ClauseEdits } from "@/lib/agreements/clauses";
import { AgreementDocumentView } from "./agreement-document-view";
import { AgreementClauseEditor } from "./agreement-clause-editor";
import { Save, ArrowLeft, AlertCircle } from "lucide-react";

type Props = {
  initialData?: AgreementRecord | null;
  applicationId?: string | null;
  prefill?: Partial<AgreementFormInput> | null;
  canEditDiscount: boolean;
  canEditProtectedClauses?: boolean;
  representativeName: string;
  representativeDesignation: string;
};

export function AgreementForm(props: Props) {
  const [saved, setSaved] = useState(props.initialData);
  const [generation, setGeneration] = useState(0);
  return <AgreementFormContents {...props} initialData={saved} key={generation} onSaved={record=>{setSaved(record);setGeneration(n=>n+1);}} onDiscard={()=>setGeneration(n=>n+1)}/>;
}
function AgreementFormContents({ initialData, applicationId, prefill, canEditDiscount, canEditProtectedClauses = false, representativeName, representativeDesignation, onSaved, onDiscard }: Props & {onSaved:(record:AgreementRecord)=>void;onDiscard:()=>void}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [referenceNumber] = useState(
    initialData?.referenceNumber || prefill?.referenceNumber || `UM/${new Date().getFullYear()}/${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  );
  const [agreementDate, setAgreementDate] = useState(
    calendarDate(initialData?.agreementDate || prefill?.agreementDate || new Date().toLocaleDateString("en-GB"))
  );
  const [tab,setTab]=useState("details");
  const [templateVersion,setTemplateVersion]=useState(initialData?.templateVersion??"4.0");
  const [clauseEdits,setClauseEdits]=useState<ClauseEdits>(initialData?.clauseEdits??{});
  const [clausesConfirmed,setClausesConfirmed]=useState(false);
  const [version, setVersion] = useState(initialData?.version);

  // Consultant
  const [consultantEntityName, setConsultantEntityName] = useState(
    initialData?.consultantEntityName ?? prefill?.consultantEntityName ?? "UniMondo Ltd"
  );
  const [consultantRegNumber, setConsultantRegNumber] = useState(
    initialData?.consultantRegNumber ?? prefill?.consultantRegNumber ?? "14829023"
  );
  const [consultantAddress, setConsultantAddress] = useState(
    initialData?.consultantAddress ?? prefill?.consultantAddress ?? "Tripoli Tower, Suit 22, Block A, Floor 47, Tripoli, Libya"
  );

  const [studentTitle, setStudentTitle] = useState<NonNullable<AgreementFormInput["studentTitle"]>>(initialData?.studentTitle || "Mr.");
  const [studentRelationship, setStudentRelationship] = useState<NonNullable<AgreementFormInput["studentRelationship"]>>(initialData?.studentRelationship || "son of");
  const [studentIdType, setStudentIdType] = useState<NonNullable<AgreementFormInput["studentIdType"]>>(initialData?.studentIdType || "Passport");

  // Student
  const [studentFullName, setStudentFullName] = useState(initialData?.studentFullName || prefill?.studentFullName || "");
  const [studentParentGuardian, setStudentParentGuardian] = useState(initialData?.studentParentGuardian || prefill?.studentParentGuardian || "");
  const [studentCnicPassport, setStudentCnicPassport] = useState(initialData?.studentCnicPassport || prefill?.studentCnicPassport || "");
  const [studentAddress, setStudentAddress] = useState(initialData?.studentAddress || prefill?.studentAddress || "");
  const [studentEmail] = useState(initialData?.studentEmail || prefill?.studentEmail || "");
  const [studentPhone] = useState(initialData?.studentPhone || prefill?.studentPhone || "");

  // Engagement
  const [degreeLevel, setDegreeLevel] = useState(initialData?.degreeLevel || prefill?.degreeLevel || "Master's Degree");
  const [fieldOfStudy, setFieldOfStudy] = useState(initialData?.fieldOfStudy || prefill?.fieldOfStudy || "");
  const [preferredDestination, setPreferredDestination] = useState(initialData?.preferredDestination || prefill?.preferredDestination || "Germany");
  const [academicYearIntake, setAcademicYearIntake] = useState(initialData?.academicYearIntake || prefill?.academicYearIntake || `Fall ${new Date().getFullYear()}`);

  const [pricingMode, setPricingMode] = useState<"reference" | "custom">(initialData?.financials.pricingMode || "reference");
  const [customGrossFee, setCustomGrossFee] = useState(String(initialData?.financials.customGrossFee || ""));

  // Financials
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>(
    initialData?.financials.paymentCurrency || prefill?.paymentCurrency || "EUR"
  );
  const [agreedExchangeRate, setAgreedExchangeRate] = useState<string>(
    initialData?.financials.agreedExchangeRate != null 
      ? String(initialData.financials.agreedExchangeRate) 
      : (prefill?.agreedExchangeRate != null ? String(prefill.agreedExchangeRate) : "")
  );
  const [exchangeRateDate, setExchangeRateDate] = useState<string>(
    calendarDate(initialData?.financials.exchangeRateDate || prefill?.exchangeRateDate || agreementDate)
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
  const [repName, setRepName] = useState(initialData?.repName || prefill?.repName || representativeName);
  const [repDesignation, setRepDesignation] = useState(initialData?.repDesignation ?? prefill?.repDesignation ?? representativeDesignation);
  const [repDate, setRepDate] = useState(calendarDate(initialData?.repDate || prefill?.repDate || agreementDate));
  const [studentSignatureDate, setStudentSignatureDate] = useState(calendarDate(initialData?.studentSignatureDate || prefill?.studentSignatureDate || agreementDate));

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live calculation
  const calculatedFinancials = calculateAgreementFinancials({
    pricingMode,
    customGrossFee,
    paymentCurrency,
    agreedExchangeRate: agreedExchangeRate ? parseFloat(agreedExchangeRate) : null,
    exchangeRateDate,
    discountType,
    discountValue: discountValue ? parseFloat(discountValue) : 0,
  });

  const financials = initialData && agreementPricingUnchanged({ pricingMode, customGrossFee, paymentCurrency,
    agreedExchangeRate, exchangeRateDate, discountType, discountValue } as AgreementFormInput, initialData.financials)
    ? initialData.financials : calculatedFinancials;

  const getFormData = (): AgreementFormInput => ({
    referenceNumber,
    templateVersion: templateVersion as "3.0" | "4.0", clauseEdits, clausesConfirmed,
    agreementDate,
    applicationId: initialData?.applicationId || applicationId || null,
    version,
    consultantEntityName,
    consultantRegNumber,
    consultantAddress,
    studentTitle,
    studentRelationship,
    studentIdType,
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
    pricingMode,
    customGrossFee,
    paymentCurrency,
    agreedExchangeRate: paymentCurrency !== "EUR" ? parseFloat(agreedExchangeRate) || null : null,
    exchangeRateDate: paymentCurrency !== "EUR" ? exchangeRateDate : null,
    discountType,
    discountValue: parseFloat(discountValue) || 0,
    repName,
    repDesignation,
    repDate,
    studentSignatureDate,
  });

  const serialize=()=>JSON.stringify({...getFormData(),version:undefined,clausesConfirmed:undefined});
  const baseline=useRef(serialize());
  const dirty=serialize()!==baseline.current;
  useEffect(()=>{
    if(!dirty)return;
    let restoring=false;
    const pop=(event:PopStateEvent)=>{if(restoring){restoring=false;event.stopImmediatePropagation();return;}if(!window.confirm("Discard unsaved agreement changes?")){event.stopImmediatePropagation();restoring=true;history.go(1);}};
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigate=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.("a[href]");if(link&&!window.confirm("Discard unsaved agreement changes?")){event.preventDefault();event.stopPropagation();}};
    window.addEventListener("popstate",pop,true);window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener("popstate",pop,true);window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
  },[dirty]);
  const protectedChange=restrictedClausesChanged(clauseEdits,initialData?.clauseEdits);
  const preview=buildAgreementDocument({...initialData,...getFormData(),id:initialData?.id??"unsaved",status:"draft",templateVersion,financials,createdAt:initialData?.createdAt??"",updatedAt:initialData?.updatedAt??""} as AgreementRecord);
  const restore=()=>{if(window.confirm("Use the approved Appendix A wording for this draft? Custom clause edits will be discarded. Finalized history remains unchanged.")){setTemplateVersion("4.0");setClauseEdits({});setClausesConfirmed(false);}};
  const handleSave = async () => {
    const data = getFormData();
    try { data.clauseEdits=validateClauseEdits(data.clauseEdits); }
    catch(error){toast.error(error instanceof Error?error.message:"Invalid clauses.");return null;}
    if(protectedChange&&!clausesConfirmed){toast.error("Confirm the protected clause changes before saving.");return null;}
    const validationErrors = validateAgreementPricing(data);
    setErrors(Object.fromEntries(validationErrors.map(error => [error.field, error.message])));
    if (validationErrors.length) { toast.error(validationErrors[0].message); return null; }
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

      setVersion(json.agreement?.version);
      baseline.current=serialize();
      onSaved(json.agreement);
      toast.success("Agreement saved successfully.");

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
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {initialData ? `Edit Agreement (${initialData.referenceNumber})` : "Create Retainer Agreement"}
            </h1>
            <p className="text-xs text-zinc-500">
              Drafts may be incomplete. Student name, identification, agreement date, engagement and representative name are required before finalization.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={isPending||!dirty} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={()=>{if(window.confirm("Discard unsaved changes and restore the last saved draft?"))onDiscard();}}>Discard Changes</button>
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
            Save Agreement Draft
          </button>
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

      {(initialData?.revisionNumber || 0) > 0 && <p role="status">Saving changes creates a draft revision. Downloads and Print continue to use the finalized version until Superadmin finalizes the new revision. Earlier finalized versions remain in revision history.</p>}
      <div role="tablist" aria-label="Agreement workspace" className="flex flex-wrap gap-2 border-b pb-3">{[["details","Agreement Details"],["clauses","Edit Clauses"],["preview","Live Preview"]].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} aria-controls={`agreement-${id}`} onClick={()=>setTab(id)} className={`rounded-lg border px-4 py-2 text-sm ${tab===id?"bg-teal-50 font-semibold":"bg-white"}`}>{label}</button>)}</div>
      <p role="status" className="text-sm text-zinc-600">{dirty?"Unsaved changes — save explicitly to retain this draft.":"No unsaved changes."} {templateVersion==="4.0"?"Appendix A wording.":"Existing wording retained. Use Appendix A explicitly to update this draft."}</p>
      <div id="agreement-clauses" hidden={tab!=="clauses"} className="space-y-4">
        <button type="button" disabled={isPending} onClick={restore} className="rounded-lg border px-3 py-2 text-sm">{templateVersion==="4.0"?"Restore Standard Wording":"Use Appendix A"}</button>
        {templateVersion==="4.0"?<fieldset disabled={isPending}><AgreementClauseEditor edits={clauseEdits} mayEditProtected={canEditProtectedClauses} onChange={value=>{setClauseEdits(value);setClausesConfirmed(false);}}/></fieldset>:<p>Historical wording is preserved. Select Use Appendix A to enable the eight-section clause editor for this draft.</p>}
      </div>
      {protectedChange&&<label className="flex items-start gap-2 rounded-lg border border-zinc-300 p-3 text-sm"><input type="checkbox" disabled={!canEditProtectedClauses||isPending} checked={clausesConfirmed} onChange={e=>setClausesConfirmed(e.target.checked)}/>I confirm the fee, payment or refund wording changes for this draft. Calculated amounts and finalized history remain protected.</label>}
      <div id="agreement-preview" hidden={tab!=="preview"} className="overflow-x-auto rounded-xl border bg-zinc-100 p-2 sm:p-4"><p className="mb-3 text-sm text-zinc-600">Unsaved draft preview. Downloaded Word and PDF use A4 pagination and Page X of Y footers after saving.</p><AgreementDocumentView content={preview}/></div>
      <fieldset id="agreement-details" disabled={isPending} hidden={tab!=="details"} className={`${tab!=="details"?"!hidden ":""}grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3`}>
        {/* Left Column: Form Fields */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Agreement Meta */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Agreement Reference &amp; Date</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="agreement-field-1" className="block text-xs font-semibold text-zinc-700 mb-1">Agreement Reference</label>
                <input id="agreement-field-1"
                  type="text"
                  value={referenceNumber}
                  readOnly
                  aria-label="Agreement reference"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="UM/2026/001"
                />
                {errors.referenceNumber ? <p className="text-xs text-red-600 mt-1">{errors.referenceNumber}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-2" className="block text-xs font-semibold text-zinc-700 mb-1">Agreement Date</label>
                <input id="agreement-field-2"
                  type="date"
                  value={agreementDate}
                  onChange={(e) => { setAgreementDate(e.target.value); setRepDate(e.target.value); setStudentSignatureDate(e.target.value); }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="25 October 2026"
                />
                {errors.agreementDate ? <p className="text-xs text-red-600 mt-1">{errors.agreementDate}</p> : null}
              </div>

            </div>
          </section>

          {/* Card 2: Consultant Party */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Consultant (UniMondo Entity)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="agreement-field-4" className="block text-xs font-semibold text-zinc-700 mb-1">Registered Legal Entity (optional)</label>
                <input id="agreement-field-4"
                  type="text"
                  value={consultantEntityName}
                  onChange={(e) => setConsultantEntityName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.consultantEntityName ? <p className="text-xs text-red-600 mt-1">{errors.consultantEntityName}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-5" className="block text-xs font-semibold text-zinc-700 mb-1">Registration Number (optional)</label>
                <input id="agreement-field-5"
                  type="text"
                  value={consultantRegNumber}
                  onChange={(e) => setConsultantRegNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.consultantRegNumber ? <p className="text-xs text-red-600 mt-1">{errors.consultantRegNumber}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="agreement-field-6" className="block text-xs font-semibold text-zinc-700 mb-1">Registered Address (optional)</label>
                <input id="agreement-field-6"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="text-xs font-semibold">Title<select aria-label="Student title" value={studentTitle} onChange={e => setStudentTitle(e.target.value as typeof studentTitle)} className="mt-1 w-full rounded-lg border border-zinc-300 p-2">{["Mr.", "Ms.", "Mx."].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-semibold">Relationship<select aria-label="Relationship" value={studentRelationship} onChange={e => setStudentRelationship(e.target.value as typeof studentRelationship)} className="mt-1 w-full rounded-lg border border-zinc-300 p-2">{["son of", "daughter of", "spouse of"].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-semibold">Identification type<select aria-label="Identification type" value={studentIdType} onChange={e => setStudentIdType(e.target.value as typeof studentIdType)} className="mt-1 w-full rounded-lg border border-zinc-300 p-2">{["CNIC", "Passport", "Other ID"].map(value => <option key={value}>{value}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="agreement-field-7" className="block text-xs font-semibold text-zinc-700 mb-1">Full Legal Name</label>
                <input id="agreement-field-7"
                  type="text"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="Muhammad Ahmad Khan"
                />
                {errors.studentFullName ? <p className="text-xs text-red-600 mt-1">{errors.studentFullName}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-8" className="block text-xs font-semibold text-zinc-700 mb-1">Relative Full Name</label>
                <input id="agreement-field-8"
                  type="text"
                  value={studentParentGuardian}
                  onChange={(e) => setStudentParentGuardian(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="Parent or Guardian Legal Name"
                />
                {errors.studentParentGuardian ? <p className="text-xs text-red-600 mt-1">{errors.studentParentGuardian}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-9" className="block text-xs font-semibold text-zinc-700 mb-1">Identification Number</label>
                <input id="agreement-field-9"
                  type="text"
                  value={studentCnicPassport}
                  onChange={(e) => setStudentCnicPassport(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  placeholder="e.g. 42101-1234567-1 or AB1234567"
                />
                {errors.studentCnicPassport ? <p className="text-xs text-red-600 mt-1">{errors.studentCnicPassport}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="agreement-field-12" className="block text-xs font-semibold text-zinc-700 mb-1">Residential Address (optional)</label>
                <textarea id="agreement-field-12"
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
                <label htmlFor="agreement-field-13" className="block text-xs font-semibold text-zinc-700 mb-1">Degree Level</label>
                <select id="agreement-field-13" aria-label="degreeLevel" value={degreeLevel} onChange={e => setDegreeLevel(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  {Array.from(new Set([degreeLevel, "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Diploma'])).map(value => <option key={value} value={value}>{value || "Select an option"}</option>)}
                </select>
                {errors.degreeLevel ? <p className="text-xs text-red-600 mt-1">{errors.degreeLevel}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-14" className="block text-xs font-semibold text-zinc-700 mb-1">Field of Study</label>
                <input id="agreement-field-14" type="text" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                {errors.fieldOfStudy ? <p className="text-xs text-red-600 mt-1">{errors.fieldOfStudy}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-15" className="block text-xs font-semibold text-zinc-700 mb-1">Preferred Destination</label>
                <input id="agreement-field-15" type="text" value={preferredDestination} onChange={e => setPreferredDestination(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                {errors.preferredDestination ? <p className="text-xs text-red-600 mt-1">{errors.preferredDestination}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-16" className="block text-xs font-semibold text-zinc-700 mb-1">Academic Year / Intake (optional)</label>
                <select id="agreement-field-16" aria-label="academicYearIntake" value={academicYearIntake} onChange={e => setAcademicYearIntake(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  {Array.from(new Set([academicYearIntake, 'Spring 2026', 'Fall 2026', 'Spring 2027', 'Fall 2027', 'Spring 2028', 'Fall 2028', 'Spring 2029', 'Fall 2029', 'Spring 2030', 'Fall 2030'])).map(value => <option key={value} value={value}>{value || "Select an option"}</option>)}
                </select>
                {errors.academicYearIntake ? <p className="text-xs text-red-600 mt-1">{errors.academicYearIntake}</p> : null}
              </div>
            </div>
          </section>

          {/* Card 5: Financials & Discounts */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">Financial Terms &amp; Exchange Rate</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                Internal reference: EUR 1,000
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="agreement-field-17" className="block text-xs font-semibold text-zinc-700 mb-1">Payment Currency</label>
                <select id="agreement-field-17"
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
                    <label htmlFor="agreement-field-18" className="block text-xs font-semibold text-zinc-700 mb-1">
                      {rateLabel}
                    </label>
                    <input id="agreement-field-18"
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
                    <label htmlFor="agreement-field-19" className="block text-xs font-semibold text-zinc-700 mb-1">
                      Exchange Rate Agreed Date
                    </label>
                    <input id="agreement-field-19"
                      type="date"
                      value={exchangeRateDate}
                      onChange={(e) => setExchangeRateDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      placeholder="25 / 10 / 2026"
                    />
                    {errors.exchangeRateDate ? <p className="text-xs text-red-600 mt-1">{errors.exchangeRateDate}</p> : null}
                  </div>
                </>
              ) : null}

              <div>
                <label htmlFor="custom-gross" className="block text-xs font-semibold mb-1">Gross consultancy fee ({paymentCurrency})</label>
                <input id="custom-gross" type="number" min="0" step={10 ** -CURRENCY_DECIMALS[paymentCurrency]} disabled={!canEditDiscount}
                  value={pricingMode === "custom" ? customGrossFee : financials.grossFee || ""}
                  onChange={e => { setPricingMode("custom"); setCustomGrossFee(e.target.value); }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100" />
                {errors.customGrossFee && <p role="alert">{errors.customGrossFee}</p>}
              </div>
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
                    <label htmlFor="agreement-field-20" className="block text-xs text-zinc-500 mb-1">Discount Mode</label>
                    <select id="agreement-field-20"
                      disabled={!canEditDiscount}
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount ({paymentCurrency})</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="agreement-field-21" className="block text-xs text-zinc-500 mb-1">
                      {discountType === "percentage" ? "Discount Percentage (0 - 100%)" : `Discount Amount in ${paymentCurrency}`}
                    </label>
                    <input id="agreement-field-21"
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "0.01" : 10 ** -CURRENCY_DECIMALS[paymentCurrency]}
                      max={discountType === "percentage" ? 100 : financials.grossFee}
                      disabled={!canEditDiscount}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                      placeholder="0"
                    />
                    {errors.discountValue && <p role="alert" className="mt-1 text-xs text-red-600">{errors.discountValue}</p>}
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
                <label htmlFor="agreement-field-22" className="block text-xs font-semibold text-zinc-700 mb-1">Representative Name</label>
                <input id="agreement-field-22" type="text" value={repName} onChange={e => setRepName(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                {errors.repName ? <p className="text-xs text-red-600 mt-1">{errors.repName}</p> : null}
              </div>
              <div>
                <label htmlFor="agreement-field-23" className="block text-xs font-semibold text-zinc-700 mb-1">Designation (optional)</label>
                <input id="agreement-field-23"
                  type="text"
                  value={repDesignation}
                  onChange={e => setRepDesignation(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                {errors.repDesignation ? <p className="text-xs text-red-600 mt-1">{errors.repDesignation}</p> : null}
              </div>
              <div>
                <label htmlFor="rep-date" className="block text-xs font-semibold mb-1">Representative date (optional)</label>
                <input id="rep-date" type="date" value={repDate} onChange={e => setRepDate(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="student-signature-date" className="block text-xs font-semibold mb-1">Student signature date (optional)</label>
                <input id="student-signature-date" type="date" value={studentSignatureDate} onChange={e => setStudentSignatureDate(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
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
                    <td className="py-2 px-2 text-right font-medium underline">{formatForeignAmount(financials.grossFeeEUR ?? 1000, "EUR")}/-</td>
                    {isNonEur ? (
                      <td className="py-2 px-3 text-right font-medium underline">
                        {financials.agreedExchangeRate ? `${fmtF(financials.grossFee ?? financials.baseFeeEUR * financials.agreedExchangeRate)}/-` : "—"}
                      </td>
                    ) : null}
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Discount:</td>
                    <td className="py-2 px-2 text-center">{financials.discountType === "amount" ? "n/a" : `${financials.discountPercent}%`}</td>
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
                <strong>Page Size:</strong> A4 Portrait (210 × 297 mm)
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
      </fieldset>
    </div>
  );
}
