import type { AgreementFormInput } from "@/types/agreement";

/** Strip server-owned properties and tolerate omitted optional strings in direct API requests. */
export function agreementInput(body: AgreementFormInput): AgreementFormInput {
  const textFields = ["referenceNumber", "agreementDate", "consultantEntityName", "consultantRegNumber", "consultantAddress",
    "studentFullName", "studentParentGuardian", "studentCnicPassport", "studentAddress", "studentEmail", "studentPhone",
    "degreeLevel", "fieldOfStudy", "preferredDestination", "academicYearIntake", "repName", "repDesignation", "repDate", "studentSignatureDate"] as const;
  const input = { ...body };
  for (const field of textFields) input[field] = typeof body[field] === "string" ? body[field] : "";
  return input;
}
