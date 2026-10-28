import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { DEFAULT_CURRENCIES, type Currency } from "./model";
export async function readCurrencies() {
  const svc = createSupabaseServiceClient();
  if (!svc) return { ready: false, currencies: DEFAULT_CURRENCIES };
  const result = await svc
    .from("cms_currencies")
    .select("code,name,symbol,decimals,active")
    .order("code");
  return {
    ready: !result.error,
    currencies: result.error ? DEFAULT_CURRENCIES : (result.data as Currency[]),
  };
}
