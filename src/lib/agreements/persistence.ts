import { calculateAgreementFinancials, calculateLegacyAgreementFinancials, agreementPricingUnchanged } from "./financials";
import { validateClauseEdits, restrictedClausesChanged } from "./clauses";
import { buildAgreementDocument } from "./document-content";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { AgreementFormInput, AgreementRecord, AgreementStatus, PaymentCurrency } from "../../types/agreement";


export function mapRowToRecord(row: Record<string, unknown>): AgreementRecord {
  // If row has payload JSON, we can restore from it or from individual columns
  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const fin = (payload.financials && typeof payload.financials === "object" ? payload.financials : {}) as Record<string, unknown>;

  const paymentCurrency = (row.payment_currency || fin.paymentCurrency || "EUR") as PaymentCurrency;
  const agreedExchangeRate = row.agreed_exchange_rate != null ? Number(row.agreed_exchange_rate) : (fin.agreedExchangeRate != null ? Number(fin.agreedExchangeRate) : null);
  const exchangeRateDate = (row.exchange_rate_date || fin.exchangeRateDate || null) as string | null;
  const discountType = (row.discount_type || fin.discountType || "percentage") as "percentage" | "amount";
  const discountValue = row.discount_value != null ? Number(row.discount_value) : (fin.discountValue != null ? Number(fin.discountValue) : 0);

  const restoredFinancials = Object.keys(fin).length ? fin as AgreementRecord["financials"] : calculateLegacyAgreementFinancials({
    paymentCurrency,
    agreedExchangeRate,
    exchangeRateDate,
    discountType,
    discountValue,
  });

  return {
    documentSnapshot: payload.documentSnapshot as AgreementRecord["documentSnapshot"],
    clauseEdits: payload.clauseEdits as AgreementRecord["clauseEdits"],
    clauseApproval: payload.clauseApproval as AgreementRecord["clauseApproval"],
    id: String(row.id),
    referenceNumber: String(row.reference_number || payload.referenceNumber || ""),
    templateVersion: String(row.template_version || payload.templateVersion || "1.0"),
    applicationId: (row.application_id as string | null) || (payload.applicationId as string | null) || null,
    status: (row.status || payload.status || "draft") as AgreementStatus,

    consultantEntityName: String(row.consultant_entity_name ?? payload.consultantEntityName ?? "UniMondo"),
    consultantRegNumber: String(row.consultant_reg_number || payload.consultantRegNumber || ""),
    consultantAddress: String(row.consultant_address || payload.consultantAddress || ""),

    studentTitle: payload.studentTitle as AgreementRecord["studentTitle"],
    studentRelationship: payload.studentRelationship as AgreementRecord["studentRelationship"],
    studentIdType: payload.studentIdType as AgreementRecord["studentIdType"],
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

    financials: restoredFinancials,

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

export class AgreementPersistenceError extends Error {
  constructor(message: string, public readonly status: number = 503) { super(message); }
}

const unavailable = () => new AgreementPersistenceError("Agreement storage is unavailable. Please try again.");
const conflict = () => new AgreementPersistenceError("Agreement changed or was finalized. Reload before trying again.", 409);

function requireStorage() {
  const svc = createSupabaseServiceClient();
  if (!svc) throw unavailable();
  return svc;
}

type AgreementState = {
  agreement_id: string; source_snapshot: Record<string, unknown>; source_kind: "row" | "record";
  draft: AgreementRecord | null; status: AgreementStatus; version: number; revision_no: number;
  updated_at: string; deleted_at: string | null;
};

function fromSnapshot(snapshot: Record<string, unknown>, kind: string): AgreementRecord {
  return kind === "row" ? mapRowToRecord(snapshot) : snapshot as AgreementRecord;
}
function fromState(state: AgreementState, editing = false): AgreementRecord {
  const record = editing && state.draft ? state.draft : fromSnapshot(state.source_snapshot, state.source_kind);
  return { ...record, status: editing && state.draft ? "draft" : state.status,
    version: state.version, revisionNumber: state.revision_no, hasDraftRevision: Boolean(state.draft),
    updatedAt: state.updated_at };
}

export async function getAgreementsList(): Promise<AgreementRecord[]> {
  const { data, error } = await requireStorage().from("agreement_state").select("*")
    .is("deleted_at", null).order("updated_at", { ascending: false });
  if (error) throw unavailable();
  return (data || []).map(row => fromState(row as AgreementState, row.status === "draft"));
}

export async function getAgreementById(id: string, editing = false): Promise<AgreementRecord | null> {
  const { data, error } = await requireStorage().from("agreement_state").select("*").eq("agreement_id", id).maybeSingle();
  if (error) throw unavailable();
  return !data || data.deleted_at ? null : fromState(data as AgreementState, editing || data.status === "draft");
}

export type AgreementRevision = { revision_no: number; author: string; finalized_at: string; supersedes: number | null };
export async function getAgreementRevisions(id: string): Promise<AgreementRevision[]> {
  if (!await getAgreementById(id)) return [];
  const { data, error } = await requireStorage().from("agreement_revisions")
    .select("revision_no,author,finalized_at,supersedes").eq("agreement_id", id).order("revision_no", { ascending: false });
  if (error) throw unavailable();
  return data || [];
}
export async function getAgreementRevision(id: string, revision: number): Promise<AgreementRecord | null> {
  if (!await getAgreementById(id)) return null;
  const { data, error } = await requireStorage().from("agreement_revisions").select("*")
    .eq("agreement_id", id).eq("revision_no", revision).maybeSingle();
  if (error) throw unavailable();
  return data ? { ...fromSnapshot(data.snapshot, data.snapshot_kind), status: "finalized", revisionNumber: revision } : null;
}

async function mutate(id: string, action: string, expected: number | undefined, actor: string, isSuper = false,
  record?: AgreementRecord, row?: Record<string, unknown>): Promise<AgreementState> {
  const { data, error } = await requireStorage().rpc("agreement_mutate", {
    p_id: id, p_action: action, p_expected: expected ?? null, p_actor: actor, p_super: isSuper,
    p_record: record ?? null, p_row: row ?? null,
  });
  if (error) {
    if (error.code === "40001") throw conflict();
    if (error.code === "23505") throw new AgreementPersistenceError("Agreement reference already exists.", 409);
    if (error.code === "P0002") throw new AgreementPersistenceError("Agreement not found.", 404);
    if (error.code === "42501") throw new AgreementPersistenceError("Only Superadmin may change status or delete.", 403);
    throw unavailable();
  }
  return data as AgreementState;
}
export async function changeAgreementStatus(id: string, status: AgreementStatus, version: number, actor: string, isSuper: boolean) {
  if (!isSuper) throw new AgreementPersistenceError("Only Superadmin may change status.", 403);
  // Upgrade an untouched older draft before approval, preserving its financials exactly.
  // Both writes use optimistic versions: a concurrent edit aborts finalization.
  if (status === "finalized") {
    const existing = await getAgreementById(id, true);
    if (!existing || existing.version !== version) throw conflict();
    if (existing.status === "draft" && !existing.documentSnapshot) {
      const upgraded = { ...existing, templateVersion: "3.0", documentSnapshot: buildAgreementDocument(existing) };
      const saved = await mutate(id, "save", version, actor, false, upgraded);
      version = saved.version;
    }
  }
  return fromState(await mutate(id, status === "finalized" ? "finalize" : "reopen", version, actor, true), true);
}
export async function deleteAgreement(id: string, version: number, actor: string, isSuper: boolean): Promise<boolean> {
  if (!isSuper) throw new AgreementPersistenceError("Only Superadmin may delete agreements.", 403);
  await mutate(id, "delete", version, actor, true);
  return true;
}

export async function saveAgreement(
  input: AgreementFormInput & { id?: string },
  userEmail?: string,
  expectedVersion?: number,
  mayApproveClauses = false,
): Promise<AgreementRecord> {
  const id = input.id || crypto.randomUUID();
  const existing = input.id ? await getAgreementById(id, true) : null;
  if (input.id && !existing) throw new AgreementPersistenceError("Agreement not found.", 404);
  if (existing && expectedVersion !== existing.version) throw conflict();
  if (existing && input.referenceNumber !== existing.referenceNumber) throw new AgreementPersistenceError("Agreement reference cannot be changed.", 409);
  if (!existing && !/^UM\/[^\s]+$/.test(input.referenceNumber || "")) throw new AgreementPersistenceError("A valid UM/ agreement reference is required.", 400);
  const templateVersion = input.templateVersion ?? existing?.templateVersion ?? "4.0";
  if ((!existing && templateVersion !== "4.0") || (existing?.templateVersion === "4.0" && templateVersion !== "4.0"))
    throw new AgreementPersistenceError("Use the current agreement wording for new drafts; template downgrades are not permitted.", 400);
  if (!["3.0", "4.0"].includes(templateVersion))
    throw new AgreementPersistenceError("Select Use Appendix A before saving a revision of this legacy agreement. Historical exports remain unchanged.", 400);
  let clauseEdits;
  try { clauseEdits = validateClauseEdits(input.clauseEdits ?? existing?.clauseEdits); }
  catch (error) { throw new AgreementPersistenceError(error instanceof Error ? error.message : "Invalid clauses.", 400); }
  if (templateVersion !== "4.0" && Object.keys(clauseEdits).length)
    throw new AgreementPersistenceError("Clause editing requires Appendix A wording.", 400);
  const protectedChange = restrictedClausesChanged(clauseEdits, existing?.clauseEdits);
  if (protectedChange && !mayApproveClauses) throw new AgreementPersistenceError("Only Superadmin may alter fee, payment or refund clauses.", 403);
  if (protectedChange && input.clausesConfirmed !== true) throw new AgreementPersistenceError("Explicitly confirm the fee, payment or refund clause changes before saving.", 400);
  // Advance even when two requests arrive in the same millisecond.
  const previousTime = existing ? Date.parse(existing.updatedAt) : 0;
  const now = new Date(Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  let financials = calculateAgreementFinancials(input);
  // Preserve legacy rounding and previously approved pricing when only agreement details change.
  if (existing && agreementPricingUnchanged(input, existing.financials)) {
    financials = structuredClone(existing.financials);
  }

  const record: AgreementRecord = {
    id,
    referenceNumber: existing?.referenceNumber || input.referenceNumber.trim(),
    templateVersion,
    clauseEdits,
    clauseApproval: protectedChange ? { by: userEmail || "staff", at: now } : existing?.clauseApproval,
    applicationId: input.applicationId?.trim() || null,
    status: "draft",

    consultantEntityName: input.consultantEntityName.trim(),
    consultantRegNumber: input.consultantRegNumber.trim(),
    consultantAddress: input.consultantAddress.trim(),

    studentTitle: input.studentTitle,
    studentRelationship: input.studentRelationship,
    studentIdType: input.studentIdType,
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

  record.documentSnapshot = buildAgreementDocument(record);
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

  const state = await mutate(id, "save", existing ? expectedVersion : undefined, userEmail || "staff", false, record, dbPayload);
  if (record.applicationId) {
    // Existing application linkage is retained; agreement storage is already committed atomically.
    const svc = requireStorage();
    const { data } = await svc.from("applications").select("payload").eq("tracking_id", record.applicationId).maybeSingle();
    if (data) {
      const payload = { ...data.payload, agreementReference: record.referenceNumber, agreementId: record.id };
      await svc.from("applications").update({ payload }).eq("tracking_id", record.applicationId);
    }
  }
  return fromState(state, true);
}
