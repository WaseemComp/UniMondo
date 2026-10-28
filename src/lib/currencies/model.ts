import { z } from "zod";
export const currencySchema = z
  .object({
    code: z
      .string()
      .regex(/^[A-Z]{3}$/, "Use a three-letter uppercase currency code."),
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(12),
    decimals: z.number().int().min(0).max(4),
    active: z.boolean(),
  })
  .strict();
export type Currency = z.infer<typeof currencySchema>;
export const DEFAULT_CURRENCIES: Currency[] = [
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, active: true },
  {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "Rs",
    decimals: 2,
    active: true,
  },
  {
    code: "LYD",
    name: "Libyan Dinar",
    symbol: "LD",
    decimals: 3,
    active: true,
  },
  {
    code: "TND",
    name: "Tunisian Dinar",
    symbol: "DT",
    decimals: 3,
    active: true,
  },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2, active: true },
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, active: true },
  {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    decimals: 2,
    active: true,
  },
  {
    code: "GBP",
    name: "Pound Sterling (legacy)",
    symbol: "£",
    decimals: 2,
    active: false,
  },
];
export function formatMoney(
  amount: number,
  code: string,
  registry: Currency[] = DEFAULT_CURRENCIES,
) {
  const c = registry.find((c) => c.code === code);
  if (!c) return `${code} ${String(amount)}`;
  return `${c.symbol}${new Intl.NumberFormat("en-GB", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }).format(amount)} ${c.code}`;
}
export function validatePriceCurrency(
  row: Record<string, unknown>,
  prior: Record<string, unknown> | undefined,
  currencies: Currency[],
  confirmed: boolean,
  kind: string,
) {
  const fields =
    kind === "courses" ? ["price"] : ["price_full", "price_installment"];
  if (row.currency_code == null && fields.every((field) => row[field] == null))
    return;
  const legacy = kind === "courses" ? "GBP" : "USD",
    old = String(prior?.currency_code || legacy),
    code = String(row.currency_code || legacy),
    currency = currencies.find((c) => c.code === code);
  if (!currency || (!currency.active && (!prior || code !== old)))
    throw new Error(
      "Choose an active supported currency. An inactive legacy currency may only be retained on an existing record.",
    );
  for (const field of fields) {
    const n = row[field];
    if (n == null) continue;
    if (
      typeof n !== "number" ||
      !Number.isFinite(n) ||
      n < 0 ||
      Math.abs(
        n * 10 ** currency.decimals - Math.round(n * 10 ** currency.decimals),
      ) > 1e-6
    )
      throw new Error(
        `Enter a nonnegative price with at most ${currency.decimals} decimal places.`,
      );
  }
  if (
    prior &&
    (code !== old || (!prior.currency_code && row.currency_code)) &&
    fields.some((f) => prior[f] != null) &&
    !confirmed
  )
    throw new Error(
      "Confirm the currency and entered amounts. Changing currency does not convert a historical price.",
    );
}
