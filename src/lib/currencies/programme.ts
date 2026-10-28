import { readCurrencies } from "./server";
import { validatePriceCurrency } from "./model";
/** Retain unmodified legacy academic metadata; never infer a denomination for a changed amount. */
export async function validateProgrammeCurrency(
  details: Record<string, unknown>,
  prior: Record<string, unknown> | undefined,
  confirmed: boolean,
) {
  const code = String(details.currency || ""),
    old = String(prior?.currency || ""),
    amount = details.tuition_amount ?? null,
    previous = prior?.tuition_amount ?? null;
  if (code === old && amount === previous) return;
  if (!code && amount == null) return;
  if (!code)
    throw new Error(
      "Select the confirmed tuition currency; changing currency does not convert an amount.",
    );
  if (prior && previous != null && code !== old && !confirmed)
    throw new Error(
      "Confirm the tuition currency and amount. Currency selection does not convert existing tuition.",
    );
  const { currencies } = await readCurrencies();
  validatePriceCurrency(
    { price: amount, currency_code: code },
    prior ? { price: previous, currency_code: old } : undefined,
    currencies,
    true,
    "courses",
  );
}
