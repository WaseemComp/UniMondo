export type PaymentCurrency = "EUR" | "PKR";
export type DiscountType = "percentage" | "amount";
export type AgreementStatus = "draft" | "finalized";

export type AgreementFinancials = {
  baseFeeEUR: number; // 1,000
  paymentCurrency: PaymentCurrency;
  agreedExchangeRate: number | null;
  exchangeRateDate: string | null;
  
  discountType: DiscountType;
  discountValue: number;
  discountPercent: number;
  discountEUR: number;
  discountPKR: number | null;
  
  netFeeEUR: number;
  netFeePKR: number | null;
  
  firstInstalmentEUR: number;
  firstInstalmentPKR: number | null;
  secondInstalmentEUR: number;
  secondInstalmentPKR: number | null;
  thirdInstalmentEUR: number;
  thirdInstalmentPKR: number | null;
};

export type AgreementRecord = {
  id: string;
  referenceNumber: string;
  templateVersion: string;
  applicationId?: string | null;
  status: AgreementStatus;
  
  // Consultant
  consultantEntityName: string;
  consultantRegNumber: string;
  consultantAddress: string;
  
  // Student
  studentFullName: string;
  studentParentGuardian: string;
  studentCnicPassport: string;
  studentAddress: string;
  studentEmail: string;
  studentPhone: string;
  
  // Engagement
  degreeLevel: string;
  fieldOfStudy: string;
  preferredDestination: string;
  academicYearIntake: string;
  
  // Financials
  financials: AgreementFinancials;
  
  // Signatures
  repName: string;
  repDesignation: string;
  repDate: string;
  studentSignatureDate: string;
  agreementDate: string;
  
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgreementFormInput = {
  referenceNumber: string;
  agreementDate: string;
  applicationId?: string | null;
  status?: AgreementStatus;
  
  consultantEntityName: string;
  consultantRegNumber: string;
  consultantAddress: string;
  
  studentFullName: string;
  studentParentGuardian: string;
  studentCnicPassport: string;
  studentAddress: string;
  studentEmail: string;
  studentPhone: string;
  
  degreeLevel: string;
  fieldOfStudy: string;
  preferredDestination: string;
  academicYearIntake: string;
  
  paymentCurrency: PaymentCurrency;
  agreedExchangeRate?: number | string | null;
  exchangeRateDate?: string | null;
  
  discountType: DiscountType;
  discountValue: number | string;
  
  repName: string;
  repDesignation: string;
  repDate: string;
  studentSignatureDate: string;
};
