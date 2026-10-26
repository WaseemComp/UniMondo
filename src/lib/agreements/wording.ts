import type { AgreementRecord } from "@/types/agreement";

export function consultantWording(record: AgreementRecord): string {
  const details = [record.consultantEntityName || "UniMondo",
    record.consultantRegNumber ? `registration number ${record.consultantRegNumber}` : "",
    record.consultantAddress ? `with its address at ${record.consultantAddress}` : "",
    `acting through its duly authorised representative, ${record.repName}${record.repDesignation ? `, ${record.repDesignation}` : ""}`,
    'hereinafter referred to as the “Consultant”; and'];
  return details.filter(Boolean).join(", ");
}
export function studentWording(record: AgreementRecord): string {
  return [
    `${record.studentTitle ? `${record.studentTitle} ` : ""}${record.studentFullName}`,
    record.studentParentGuardian ? `${record.studentRelationship || "child of"} ${record.studentParentGuardian}` : "",
    record.studentCnicPassport ? `holding ${record.studentIdType || "CNIC/Passport"} No. ${record.studentCnicPassport}` : "",
    record.studentAddress ? `residing at ${record.studentAddress}` : "",
    record.studentEmail ? `email ${record.studentEmail}` : "",
    record.studentPhone ? `telephone ${record.studentPhone}` : "",
    'hereinafter referred to as the “Student”.',
  ].filter(Boolean).join(", ");
}
export function engagementWording(record: AgreementRecord): string {
  const details = [record.degreeLevel, record.fieldOfStudy, record.preferredDestination,
    record.academicYearIntake].filter(Boolean).join(", ");
  return `Following preliminary assessment, the Student engages UniMondo for educational consultancy and university admission assistance${details ? ` concerning ${details}` : ""}. The Parties agree as follows.`;
}
