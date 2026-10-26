import { calculateAgreementFinancials } from "./financials";
import { createSupabaseServiceClient } from "../supabase/admin";
import type { AgreementFormInput, AgreementRecord, AgreementStatus, PaymentCurrency } from "../../types/agreement";

const SITE_CONTENT_PAGE = "admin";
const SITE_CONTENT_SECTION = "agreements";

function mapRowToRecord(row: Record<string, unknown>): AgreementRecord {
  // If row has payload JSON, we can restore from it or from individual columns
  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const fin = (payload.financials && typeof payload.financials === "object" ? payload.financials : {}) as Record<string, unknown>;

  const paymentCurrency = (row.payment_currency || fin.paymentCurrency || "EUR") as PaymentCurrency;
  const agreedExchangeRate = row.agreed_exchange_rate != null ? Number(row.agreed_exchange_rate) : (fin.agreedExchangeRate != null ? Number(fin.agreedExchangeRate) : null);
  const exchangeRateDate = (row.exchange_rate_date || fin.exchangeRateDate || null) as string | null;
  const discountType = (row.discount_type || fin.discountType || "percentage") as "percentage" | "amount";
  const discountValue = row.discount_value != null ? Number(row.discount_value) : (fin.discountValue != null ? Number(fin.discountValue) : 0);

  const calculatedFin = calculateAgreementFinancials({
    paymentCurrency,
    agreedExchangeRate,
    exchangeRateDate,
    discountType,
    discountValue,
  });

  return {
    id: String(row.id),
    referenceNumber: String(row.reference_number || payload.referenceNumber || ""),
    templateVersion: String(row.template_version || payload.templateVersion || "1.0"),
    applicationId: (row.application_id as string | null) || (payload.applicationId as string | null) || null,
    status: (row.status || payload.status || "draft") as AgreementStatus,

    consultantEntityName: String(row.consultant_entity_name || payload.consultantEntityName || "UniMondo Ltd"),
    consultantRegNumber: String(row.consultant_reg_number || payload.consultantRegNumber || ""),
    consultantAddress: String(row.consultant_address || payload.consultantAddress || ""),

    studentFullName: String(row.student_full_name || payload.studentFullName || ""),
    studentParentGuardian: String(row.student_parent_guardian || payload.studentParentGuardian || ""),
    studentCnicPassport: String(row.student_cnic_passport || payload.studentCnicPassport || ""),
    studentAddress: String(row.student_address || payload.studentAddress || ""),
    studentEmail: String(row.student_email || payload.studentEmail || ""),
    studentPhone: String(row.student_phone || payload.studentPhone || ""),

    degreeLevel: String(row.degree_level || payload.degreeLevel || ""),
    fieldOfStudy: String(row.field_of_study || payload.fieldOfStudy || ""),
    preferredDestination: String(row.preferred_destination || payload.preferredDestination || ""),
    academicYearIntake: String(row.academic_year_intake || payload.academicYearIntake || ""),

    financials: calculatedFin,

    repName: String(row.rep_name || payload.repName || ""),
    repDesignation: String(row.rep_designation || payload.repDesignation || ""),
    repDate: String(row.rep_date || payload.repDate || ""),
    studentSignatureDate: String(row.student_signature_date || payload.studentSignatureDate || ""),
    agreementDate: String(row.agreement_date || payload.agreementDate || ""),

    createdBy: (row.created_by as string | undefined) || (payload.createdBy as string | undefined),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

// Fallback in-memory storage if database is completely offline
const memoryAgreements = new Map<string, AgreementRecord>();

export async function getAgreementsList(): Promise<AgreementRecord[]> {
  const svc = createSupabaseServiceClient();
  if (svc) {
    // 1. Try public.agreements table
    const { data, error } = await svc
      .from("agreements")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((r) => mapRowToRecord(r as Record<string, unknown>));
    }

    // 2. Fallback to site_content key storage if table not yet migrated
    const { data: contentData, error: contentError } = await svc
      .from("site_content")
      .select("key, value, updated_at")
      .eq("page", SITE_CONTENT_PAGE)
      .eq("section", SITE_CONTENT_SECTION);

    if (!contentError && Array.isArray(contentData) && contentData.length > 0) {
      const records: AgreementRecord[] = [];
      for (const item of contentData) {
        try {
          const parsed = JSON.parse(String(item.value));
          records.push(parsed);
        } catch {
          // ignore corrupted JSON
        }
      }
      records.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      return records;
    }
  }

  return Array.from(memoryAgreements.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getAgreementById(id: string): Promise<AgreementRecord | null> {
  const svc = createSupabaseServiceClient();
  if (svc) {
    const { data, error } = await svc
      .from("agreements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return mapRowToRecord(data as Record<string, unknown>);
    }

    // Check site_content fallback
    const { data: contentData } = await svc
      .from("site_content")
      .select("value")
      .eq("key", `agreement:${id}`)
      .maybeSingle();

    if (contentData?.value) {
      try {
        return JSON.parse(String(contentData.value)) as AgreementRecord;
      } catch {
        // ignore
      }
    }
  }

  return memoryAgreements.get(id) || null;
}

export async function saveAgreement(
  input: AgreementFormInput & { id?: string },
  userEmail?: string,
): Promise<AgreementRecord> {
  const svc = createSupabaseServiceClient();
  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const financials = calculateAgreementFinancials({
    paymentCurrency: input.paymentCurrency,
    agreedExchangeRate: input.agreedExchangeRate,
    exchangeRateDate: input.exchangeRateDate,
    discountType: input.discountType,
    discountValue: input.discountValue,
  });

  const existing = await getAgreementById(id);

  const record: AgreementRecord = {
    id,
    referenceNumber: input.referenceNumber.trim(),
    templateVersion: "1.0",
    applicationId: input.applicationId?.trim() || null,
    status: input.status || "draft",

    consultantEntityName: input.consultantEntityName.trim(),
    consultantRegNumber: input.consultantRegNumber.trim(),
    consultantAddress: input.consultantAddress.trim(),

    studentFullName: input.studentFullName.trim(),
    studentParentGuardian: input.studentParentGuardian.trim(),
    studentCnicPassport: input.studentCnicPassport.trim(),
    studentAddress: input.studentAddress.trim(),
    studentEmail: input.studentEmail.trim(),
    studentPhone: input.studentPhone.trim(),

    degreeLevel: input.degreeLevel.trim(),
    fieldOfStudy: input.fieldOfStudy.trim(),
    preferredDestination: input.preferredDestination.trim(),
    academicYearIntake: input.academicYearIntake.trim(),

    financials,

    repName: input.repName.trim(),
    repDesignation: input.repDesignation.trim(),
    repDate: input.repDate.trim(),
    studentSignatureDate: input.studentSignatureDate.trim(),
    agreementDate: input.agreementDate.trim(),

    createdBy: existing?.createdBy || userEmail || "staff",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  memoryAgreements.set(id, record);

  if (svc) {
    // 1. Attempt insert / update on public.agreements
    const dbPayload = {
      id: record.id,
      reference_number: record.referenceNumber,
      template_version: record.templateVersion,
      application_id: record.applicationId,
      status: record.status,
      consultant_entity_name: record.consultantEntityName,
      consultant_reg_number: record.consultantRegNumber,
      consultant_address: record.consultantAddress,
      student_full_name: record.studentFullName,
      student_parent_guardian: record.studentParentGuardian,
      student_cnic_passport: record.studentCnicPassport,
      student_address: record.studentAddress,
      student_email: record.studentEmail,
      student_phone: record.studentPhone,
      degree_level: record.degreeLevel,
      field_of_study: record.fieldOfStudy,
      preferred_destination: record.preferredDestination,
      academic_year_intake: record.academicYearIntake,
      base_fee_eur: financials.baseFeeEUR,
      payment_currency: financials.paymentCurrency,
      agreed_exchange_rate: financials.agreedExchangeRate,
      exchange_rate_date: financials.exchangeRateDate,
      discount_type: financials.discountType,
      discount_value: financials.discountValue,
      rep_name: record.repName,
      rep_designation: record.repDesignation,
      rep_date: record.repDate,
      student_signature_date: record.studentSignatureDate,
      agreement_date: record.agreementDate,
      payload: record,
      created_by: record.createdBy,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };

    const { error } = await svc
      .from("agreements")
      .upsert(dbPayload, { onConflict: "id" });

    // 2. Also ensure resilient fallback in site_content
    await svc.from("site_content").upsert({
      key: `agreement:${id}`,
      value: JSON.stringify(record),
      label: `Agreement ${record.referenceNumber}`,
      page: SITE_CONTENT_PAGE,
      section: SITE_CONTENT_SECTION,
      sort_order: 0,
      updated_at: now,
    }, { onConflict: "key" });

    // 3. If linked to an application, link agreement reference
    if (record.applicationId) {
      try {
        const { data: appData } = await svc
          .from("applications")
          .select("payload")
          .eq("tracking_id", record.applicationId)
          .maybeSingle();

        if (appData) {
          const appPayload = (appData.payload && typeof appData.payload === "object" ? appData.payload : {}) as Record<string, unknown>;
          appPayload.agreementReference = record.referenceNumber;
          appPayload.agreementId = record.id;
          await svc
            .from("applications")
            .update({ payload: appPayload })
            .eq("tracking_id", record.applicationId);
        }
      } catch (err) {
        console.warn("[saveAgreement] Failed to link agreement to application:", err);
      }
    }
  }

  return record;
}

export async function deleteAgreement(id: string): Promise<boolean> {
  memoryAgreements.delete(id);
  const svc = createSupabaseServiceClient();
  if (svc) {
    await svc.from("agreements").delete().eq("id", id);
    await svc.from("site_content").delete().eq("key", `agreement:${id}`);
  }
  return true;
}
