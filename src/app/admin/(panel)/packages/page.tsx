import Link from "next/link";
import { readPriceCatalogue } from "@/app/admin/cms/catalogue-actions";
import { PriceCatalogueManager } from "@/components/admin/catalogue/price-catalogue-manager";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; record?: string }>;
}) {
  const params = await searchParams,
    kind = params.kind === "addons" ? "addons" : "packages";
  let data;
  try {
    data = await readPriceCatalogue(kind);
  } catch {
    /* Preserve existing prices on an unavailable/unauthorized read. */
  }
  return data ? (
    <div className="space-y-4">
      <nav className="flex gap-3">
        <Link href="/admin/packages">Main packages</Link>
        <Link href="/admin/packages?kind=addons">Add-ons</Link>
      </nav>
      <PriceCatalogueManager
        kind={kind}
        {...data}
        initialRecord={params.record}
      />
    </div>
  ) : (
    <p role="alert">
      Packages could not be loaded, or your account lacks access. Existing
      prices and records are unchanged.
    </p>
  );
}
