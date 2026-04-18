import {
  AddOnAdminRow,
  PackageAdminRow,
  PackagesPricingManager,
} from "@/components/admin/cms/packages-pricing-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminPackagesPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage packages.
      </p>
    );
  }

  const [pkgRes, addonRes] = await Promise.all([
    svc.from("packages").select("*").order("sort_order", { ascending: true }),
    svc.from("add_ons").select("*").order("sort_order", { ascending: true }),
  ]);

  if (pkgRes.error || addonRes.error) {
    const msg = pkgRes.error?.message || addonRes.error?.message || "Failed to load";
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Packages</h1>
        <p className="text-sm text-red-600">
          {msg.includes("does not exist") ? "Run the latest Supabase migration for packages and add_ons." : msg}
        </p>
      </div>
    );
  }

  return (
    <PackagesPricingManager
      packages={(pkgRes.data ?? []) as PackageAdminRow[]}
      addOns={(addonRes.data ?? []) as AddOnAdminRow[]}
    />
  );
}
