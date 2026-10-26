import type { AgreementFinancials, AgreementFormInput, DiscountType, PaymentCurrency } from "../../types/agreement";

export const BASE_CONSULTANCY_FEE_EUR = 1000;

export function calculateAgreementFinancials(input: {
  paymentCurrency: PaymentCurrency;
  agreedExchangeRate?: number | string | null;
  exchangeRateDate?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
}): AgreementFinancials {
  const baseFeeEUR = BASE_CONSULTANCY_FEE_EUR;
  const isPkr = input.paymentCurrency === "PKR";
  
  let rate: number | null = null;
  if (isPkr) {
    const parsedRate = typeof input.agreedExchangeRate === "number" 
      ? input.agreedExchangeRate 
      : parseFloat(String(input.agreedExchangeRate || "0"));
    rate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
  }

  const rawVal = typeof input.discountValue === "number" 
    ? input.discountValue 
    : parseFloat(String(input.discountValue || "0"));
  const cleanVal = Number.isFinite(rawVal) && rawVal >= 0 ? rawVal : 0;

  let discountEUR = 0;
  let discountPercent = 0;

  if (input.discountType === "percentage") {
    discountPercent = Math.min(100, Math.max(0, cleanVal));
    discountEUR = Math.round(baseFeeEUR * (discountPercent / 100));
  } else {
    discountEUR = Math.min(baseFeeEUR, Math.max(0, Math.round(cleanVal)));
    discountPercent = Math.round((discountEUR / baseFeeEUR) * 100 * 100) / 100;
  }

  const netFeeEUR = Math.max(0, baseFeeEUR - discountEUR);

  // Fixed 30% / 40% / 30% instalments in EUR
  const firstInstalmentEUR = Math.round(netFeeEUR * 0.30);
  const secondInstalmentEUR = Math.round(netFeeEUR * 0.40);
  // Guarantee exact sum equals netFeeEUR
  const thirdInstalmentEUR = netFeeEUR - firstInstalmentEUR - secondInstalmentEUR;

  let discountPKR: number | null = null;
  let netFeePKR: number | null = null;
  let firstInstalmentPKR: number | null = null;
  let secondInstalmentPKR: number | null = null;
  let thirdInstalmentPKR: number | null = null;

  if (isPkr && rate !== null && rate > 0) {
    const basePKR = Math.round(baseFeeEUR * rate);
    discountPKR = Math.round(discountEUR * rate);
    netFeePKR = Math.max(0, basePKR - discountPKR);

    firstInstalmentPKR = Math.round(netFeePKR * 0.30);
    secondInstalmentPKR = Math.round(netFeePKR * 0.40);
    // Guarantee exact sum equals netFeePKR
    thirdInstalmentPKR = netFeePKR - firstInstalmentPKR - secondInstalmentPKR;
  }

  return {
    baseFeeEUR,
    paymentCurrency: input.paymentCurrency,
    agreedExchangeRate: rate,
    exchangeRateDate: input.exchangeRateDate ? String(input.exchangeRateDate).trim() : null,
    discountType: input.discountType,
    discountValue: cleanVal,
    discountPercent,
    discountEUR,
    discountPKR,
    netFeeEUR,
    netFeePKR,
    firstInstalmentEUR,
    firstInstalmentPKR,
    secondInstalmentEUR,
    secondInstalmentPKR,
    thirdInstalmentEUR,
    thirdInstalmentPKR,
  };
}

export type ValidationError = {
  field: string;
  message: string;
};

export function validateAgreementForExport(input: AgreementFormInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.referenceNumber?.trim()) {
    errors.push({ field: "referenceNumber", message: "Agreement reference number is required." });
  }
  if (!input.agreementDate?.trim()) {
    errors.push({ field: "agreementDate", message: "Agreement date is required." });
  }

  // Consultant
  if (!input.consultantEntityName?.trim()) {
    errors.push({ field: "consultantEntityName", message: "Consultant entity name is required." });
  }
  if (!input.consultantRegNumber?.trim()) {
    errors.push({ field: "consultantRegNumber", message: "Consultant registration number is required." });
  }
  if (!input.consultantAddress?.trim()) {
    errors.push({ field: "consultantAddress", message: "Consultant registered address is required." });
  }

  // Student
  if (!input.studentFullName?.trim()) {
    errors.push({ field: "studentFullName", message: "Student full legal name is required." });
  }
  if (!input.studentParentGuardian?.trim()) {
    errors.push({ field: "studentParentGuardian", message: "Parent or guardian name is required." });
  }
  if (!input.studentCnicPassport?.trim()) {
    errors.push({ field: "studentCnicPassport", message: "Student CNIC or Passport number is required." });
  }
  if (!input.studentAddress?.trim()) {
    errors.push({ field: "studentAddress", message: "Student address is required." });
  }
  if (!input.studentEmail?.trim()) {
    errors.push({ field: "studentEmail", message: "Student email is required." });
  }
  if (!input.studentPhone?.trim()) {
    errors.push({ field: "studentPhone", message: "Student contact number is required." });
  }

  // Engagement
  if (!input.degreeLevel?.trim()) {
    errors.push({ field: "degreeLevel", message: "Degree level is required." });
  }
  if (!input.fieldOfStudy?.trim()) {
    errors.push({ field: "fieldOfStudy", message: "Field of study is required." });
  }
  if (!input.preferredDestination?.trim()) {
    errors.push({ field: "preferredDestination", message: "Preferred destination is required." });
  }
  if (!input.academicYearIntake?.trim()) {
    errors.push({ field: "academicYearIntake", message: "Academic year or intake is required." });
  }

  // Currency & Rate
  if (input.paymentCurrency === "PKR") {
    const rate = typeof input.agreedExchangeRate === "number" 
      ? input.agreedExchangeRate 
      : parseFloat(String(input.agreedExchangeRate || "0"));
    if (!Number.isFinite(rate) || rate <= 0) {
      errors.push({ field: "agreedExchangeRate", message: "A positive EUR/PKR exchange rate is required for PKR payments." });
    }
    if (!input.exchangeRateDate?.trim()) {
      errors.push({ field: "exchangeRateDate", message: "Exchange rate agreement date is required when payment is in PKR." });
    }
  }

  // Representatives
  if (!input.repName?.trim()) {
    errors.push({ field: "repName", message: "UniMondo representative name is required." });
  }
  if (!input.repDesignation?.trim()) {
    errors.push({ field: "repDesignation", message: "UniMondo representative designation is required." });
  }

  return errors;
}
