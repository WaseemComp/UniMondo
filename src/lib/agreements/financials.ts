import type { AgreementFinancials, AgreementFormInput, DiscountType, PaymentCurrency } from "../../types/agreement";
import { CURRENCY_DECIMALS } from "../../types/agreement";

export const BASE_CONSULTANCY_FEE_EUR = 1000;

/** Round to exactly N decimal places using standard half-up rounding. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Format a foreign-currency amount with the correct precision for that currency. */
export function formatForeignAmount(amount: number, currency: PaymentCurrency): string {
  const decimals = CURRENCY_DECIMALS[currency];
  return amount.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function roundMoney(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.abs(value)) * factor) / factor;
}

export function calculateAgreementFinancials(input: Pick<AgreementFormInput,
  "paymentCurrency" | "agreedExchangeRate" | "exchangeRateDate" | "discountType" | "discountValue" | "pricingMode" | "customGrossFee"
>): AgreementFinancials {
  const currency = input.paymentCurrency;
  const decimals = CURRENCY_DECIMALS[currency];
  if (decimals === undefined) throw new Error("Unsupported payment currency.");
  const rate = currency === "EUR" ? 1 : Number(input.agreedExchangeRate);
  const validRate = Number.isFinite(rate) && rate > 0;
  const mode = input.pricingMode || "reference";
  const gross = roundMoney(mode === "custom" ? Number(input.customGrossFee || 0) : validRate ? 1000 * rate : 0, decimals);
  const value = Number(input.discountValue || 0);
  const discount = roundMoney(Math.min(gross, Math.max(0, input.discountType === "percentage" ? gross * Math.min(100, value) / 100 : value)), decimals);
  const net = roundMoney(gross - discount, decimals);
  const split = (amount: number, precision: number) => {
    const first = roundMoney(amount * 0.3, precision);
    const second = roundMoney(amount * 0.4, precision);
    return [first, second, roundMoney(amount - first - second, precision)];
  };
  const eur = (amount: number) => validRate ? roundMoney(amount / rate, 2) : 0;
  const [firstEUR, secondEUR, thirdEUR] = split(eur(net), 2);
  const [first, second, third] = split(net, decimals);
  return {
    currencyDecimals: decimals, exchangeRatePair: `EUR/${currency}`,
    pricingVersion: 2, pricingMode: mode, customGrossFee: mode === "custom" ? gross : null,
    grossFee: gross, grossFeeEUR: eur(gross), baseFeeEUR: BASE_CONSULTANCY_FEE_EUR,
    paymentCurrency: currency, agreedExchangeRate: currency === "EUR" ? null : validRate ? rate : null,
    exchangeRateDate: input.exchangeRateDate?.trim() || null,
    discountType: input.discountType, discountValue: value,
    discountPercent: input.discountType === "percentage" ? value : gross ? roundMoney(discount / gross * 100, 4) : 0,
    discountEUR: roundMoney(eur(gross) - eur(net), 2), discountForeign: currency === "EUR" ? null : discount,
    netFeeEUR: eur(net), netFeeForeign: currency === "EUR" ? null : net,
    firstInstalmentEUR: firstEUR, secondInstalmentEUR: secondEUR, thirdInstalmentEUR: thirdEUR,
    firstInstalmentForeign: currency === "EUR" ? null : first,
    secondInstalmentForeign: currency === "EUR" ? null : second,
    thirdInstalmentForeign: currency === "EUR" ? null : third,
  };
}

/** Pricing authority follows the payable snapshot, including exchange-rate changes and finalization. */
export function requiresAgreementPricingApproval(input: AgreementFormInput, existing?: AgreementFinancials): boolean {
  const protectedPricing = Number(input.discountValue) > 0 || Number(existing?.discountValue || 0) > 0
    || input.pricingMode === "custom" || existing?.pricingMode === "custom";
  if (!protectedPricing) return false;
  if (!existing || input.status === "finalized" || input.pricingMode === "custom") return true;
  const next = calculateAgreementFinancials(input);
  return (["pricingMode", "customGrossFee", "paymentCurrency", "agreedExchangeRate", "exchangeRateDate",
    "discountType", "discountValue", "grossFee", "discountEUR", "discountForeign", "netFeeEUR", "netFeeForeign"] as const)
    .some(key => (next[key] ?? null) !== (existing[key] ?? null));
}

/** Validate pricing before saving drafts as well as final agreements. */
export function validateAgreementPricing(input: AgreementFormInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.status != null && !["draft", "finalized"].includes(input.status)) errors.push({ field: "status", message: "Select a valid agreement status." });
  if (!input.referenceNumber?.trim()) errors.push({ field: "referenceNumber", message: "Agreement reference number is required." });
  if (!Object.hasOwn(CURRENCY_DECIMALS, input.paymentCurrency)) errors.push({ field: "paymentCurrency", message: "Select a supported currency." });
  if (input.pricingMode && !["reference", "custom"].includes(input.pricingMode)) errors.push({ field: "pricingMode", message: "Select a valid pricing mode." });
  if (!["percentage", "amount"].includes(input.discountType)) errors.push({ field: "discountType", message: "Select a valid discount type." });
  for (const [field, choices] of Object.entries({ studentTitle: ["Mr.", "Ms.", "Mx."], studentRelationship: ["son of", "daughter of", "spouse of"], studentIdType: ["CNIC", "Passport", "Other ID"] })) {
    const selected = input[field as keyof AgreementFormInput];
    if (selected != null && !choices.includes(String(selected))) errors.push({ field, message: "Select a valid identity option." });
  }
  const value = Number(input.discountValue);
  if (!Number.isFinite(value) || value < 0 || (input.discountType === "percentage" && value > 100)) errors.push({ field: "discountValue", message: "Enter a valid discount." });
  if (input.pricingMode === "custom" && (!Number.isFinite(Number(input.customGrossFee)) || Number(input.customGrossFee) <= 0)) errors.push({ field: "customGrossFee", message: "Enter a positive custom gross fee." });
  if (input.paymentCurrency !== "EUR" && (!Number.isFinite(Number(input.agreedExchangeRate)) || Number(input.agreedExchangeRate) <= 0 || !input.exchangeRateDate?.trim())) errors.push({ field: "agreedExchangeRate", message: "Confirm a positive exchange rate and its date." });
  if (!errors.length) {
    const fin = calculateAgreementFinancials(input);
    if (!fin.grossFee || fin.grossFee <= 0) errors.push({ field: "customGrossFee", message: "Gross fee must be positive at the selected currency precision." });
    if (!Number.isSafeInteger(Math.round((fin.grossFee || 0) * 10 ** CURRENCY_DECIMALS[input.paymentCurrency]))) errors.push({ field: "customGrossFee", message: "Fee is too large." });
    if (input.discountType === "amount" && value > (fin.grossFee || 0)) errors.push({ field: "discountValue", message: "Discount cannot exceed the gross fee." });
  }
  return errors;
}

export type ValidationError = {
  field: string;
  message: string;
};

export function validateAgreementForExport(input: AgreementFormInput): ValidationError[] {
  const errors: ValidationError[] = validateAgreementPricing(input);

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
    errors.push({ field: "consultantAddress", message: "Consultant address is required." });
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

  // Representatives
  if (!input.repName?.trim()) {
    errors.push({ field: "repName", message: "UniMondo representative name is required." });
  }
  if (!input.repDesignation?.trim()) {
    errors.push({ field: "repDesignation", message: "UniMondo representative designation is required." });
  }

  // Non-EUR currencies require a manually agreed exchange rate
  if (input.paymentCurrency !== "EUR") {
    const rate =
      typeof input.agreedExchangeRate === "number"
        ? input.agreedExchangeRate
        : parseFloat(String(input.agreedExchangeRate || "0"));
    if (!Number.isFinite(rate) || rate <= 0) {
      errors.push({
        field: "agreedExchangeRate",
        message: `A positive EUR/${input.paymentCurrency} exchange rate is required for export.`,
      });
    }
    if (!input.exchangeRateDate?.trim()) {
      errors.push({
        field: "exchangeRateDate",
        message: "Exchange rate agreement date is required for non-EUR payments.",
      });
    }
  }

  return errors;
}

export function calculateLegacyAgreementFinancials(input: {
  paymentCurrency: PaymentCurrency;
  agreedExchangeRate?: number | string | null;
  exchangeRateDate?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
}): AgreementFinancials {
  const baseFeeEUR = BASE_CONSULTANCY_FEE_EUR;
  const isNonEur = input.paymentCurrency !== "EUR";
  const foreignDecimals = CURRENCY_DECIMALS[input.paymentCurrency];

  let rate: number | null = null;
  if (isNonEur) {
    const parsedRate =
      typeof input.agreedExchangeRate === "number"
        ? input.agreedExchangeRate
        : parseFloat(String(input.agreedExchangeRate || "0"));
    rate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
  }

  const rawVal =
    typeof input.discountValue === "number"
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

  // 30% / 40% / 30% instalments; third absorbs any rounding residual
  const firstInstalmentEUR = Math.round(netFeeEUR * 0.3);
  const secondInstalmentEUR = Math.round(netFeeEUR * 0.4);
  const thirdInstalmentEUR = netFeeEUR - firstInstalmentEUR - secondInstalmentEUR;

  // Foreign-currency equivalents
  let discountForeign: number | null = null;
  let netFeeForeign: number | null = null;
  let firstInstalmentForeign: number | null = null;
  let secondInstalmentForeign: number | null = null;
  let thirdInstalmentForeign: number | null = null;

  if (isNonEur && rate !== null && rate > 0) {
    const baseForeign = roundTo(baseFeeEUR * rate, foreignDecimals);
    discountForeign = roundTo(discountEUR * rate, foreignDecimals);
    netFeeForeign = roundTo(Math.max(0, baseForeign - discountForeign), foreignDecimals);

    firstInstalmentForeign = roundTo(netFeeForeign * 0.3, foreignDecimals);
    secondInstalmentForeign = roundTo(netFeeForeign * 0.4, foreignDecimals);
    // Third instalment absorbs rounding residual; guarantees exact sum
    thirdInstalmentForeign = roundTo(
      netFeeForeign - firstInstalmentForeign - secondInstalmentForeign,
      foreignDecimals
    );
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
    discountForeign,
    netFeeEUR,
    netFeeForeign,
    firstInstalmentEUR,
    firstInstalmentForeign,
    secondInstalmentEUR,
    secondInstalmentForeign,
    thirdInstalmentEUR,
    thirdInstalmentForeign,
  };
}
