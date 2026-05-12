import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import {
  CountriesManager,
  type CountryAdminRow,
  type RegionGroupRow,
} from "@/components/admin/cms/countries-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminDestinationsCountriesPage() {
  await assertAdminScope("academic");
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage countries.
      </p>
    );
  }

  const [{ data: regions, error: rErr }, { data: countries, error: cErr }] = await Promise.all([
    svc.from("region_groups").select("id, label, continent, sort_order").order("sort_order", { ascending: true }),
    svc.from("countries").select("*").order("sort_order", { ascending: true }),
  ]);

  if (rErr || cErr) {
    return <p className="text-sm text-red-600">{rErr?.message ?? cErr?.message}</p>;
  }

  return (
    <CountriesManager regions={(regions ?? []) as RegionGroupRow[]} countries={(countries ?? []) as CountryAdminRow[]} />
  );
}
