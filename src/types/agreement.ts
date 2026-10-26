export type PaymentCurrency = "EUR" | "PKR" | "LYD" | "TND" | "TRY" | "USD" | "BDT";
export type DiscountType = "percentage" | "amount";
export type AgreementStatus = "draft" | "finalized";

export const CURRENCY_LABELS: Record<PaymentCurrency, string> = {
  EUR: "Euro",
  PKR: "Pakistani Rupee",
  LYD: "Libyan Dinar",
  TND: "Tunisian Dinar",
  TRY: "Turkish Lira",
  USD: "US Dollar",
  BDT: "Bangladeshi Taka",
};

/** Decimal places used for rounding and display in each currency. */
export const CURRENCY_DECIMALS: Record<PaymentCurrency, number> = {
  EUR: 2,
  PKR: 2,
  LYD: 3,
  TND: 3,
  TRY: 2,
  USD: 2,
  BDT: 2,
};

export const CURRENCY_OPTIONS: { value: PaymentCurrency; label: string }[] = [
  { value: "EUR", label: "EUR — Euro" },
  { value: "PKR", label: "PKR — Pakistani Rupee" },
  { value: "LYD", label: "LYD — Libyan Dinar" },
  { value: "TND", label: "TND — Tunisian Dinar" },
  { value: "TRY", label: "TRY — Turkish Lira" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "BDT", label: "BDT — Bangladeshi Taka" },
];

export type AgreementFinancials = {
  pricingVersion?: 2;
  currencyDecimals?: number;
  exchangeRatePair?: string;
  pricingApprovedBy?: string;
  pricingApprovedAt?: string;
  pricingMode?: "reference" | "custom";
  grossFee?: number; // Agreed amount in paymentCurrency
  grossFeeEUR?: number; // Equivalent, not the internal reference
  customGrossFee?: number | null;
  baseFeeEUR: number; // Internal reference: 1,000
  paymentCurrency: PaymentCurrency;
  agreedExchangeRate: number | null;
  exchangeRateDate: string | null;

  discountType: DiscountType;
  discountValue: number;
  discountPercent: number;
  discountEUR: number;
  /** Discount in paymentCurrency; null when paymentCurrency === "EUR". */
  discountForeign: number | null;

  netFeeEUR: number;
  /** Net fee in paymentCurrency; null when paymentCurrency === "EUR". */
  netFeeForeign: number | null;

  firstInstalmentEUR: number;
  firstInstalmentForeign: number | null;
  secondInstalmentEUR: number;
  secondInstalmentForeign: number | null;
  thirdInstalmentEUR: number;
  thirdInstalmentForeign: number | null;
};

export type AgreementRecord = {
  id: string;
  version?: number;
  revisionNumber?: number;
  hasDraftRevision?: boolean;
  referenceNumber: string;
  templateVersion: string;
  applicationId?: string | null;
  status: AgreementStatus;

  // Consultant
  consultantEntityName: string;
  consultantRegNumber: string;
  consultantAddress: string;

  // Student
  studentTitle?: "Mr." | "Ms." | "Mx.";
  studentRelationship?: "son of" | "daughter of" | "spouse of";
  studentIdType?: "CNIC" | "Passport" | "Other ID";
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
  version?: number;
  referenceNumber: string;
  agreementDate: string;
  applicationId?: string | null;
  status?: AgreementStatus;

  consultantEntityName: string;
  consultantRegNumber: string;
  consultantAddress: string;

  studentTitle?: "Mr." | "Ms." | "Mx.";
  studentRelationship?: "son of" | "daughter of" | "spouse of";
  studentIdType?: "CNIC" | "Passport" | "Other ID";
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

  pricingMode?: "reference" | "custom";
  customGrossFee?: number | string | null;
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
