import { requireSuperAdmin } from "@/app/admin/require-admin";
import { readCurrencies } from "@/lib/currencies/server";
import { CurrenciesManager } from "@/components/admin/catalogue/currencies-manager";
export default async function Page() {
  await requireSuperAdmin();
  return <CurrenciesManager {...await readCurrencies()} />;
}
