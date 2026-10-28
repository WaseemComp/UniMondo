import { readPriceCatalogue } from "@/app/admin/cms/catalogue-actions";
import { PriceCatalogueManager } from "@/components/admin/catalogue/price-catalogue-manager";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ record?: string }>;
}) {
  let data;
  try {
    data = await readPriceCatalogue("courses");
  } catch {
    /* Do not turn a failed or unauthorized read into an empty catalogue. */
  }
  const params = await searchParams;
  return data ? (
    <PriceCatalogueManager
      kind="courses"
      {...data}
      initialRecord={params.record}
    />
  ) : (
    <p role="alert">
      Language Courses could not be loaded, or your account lacks course access.
      No records were created or replaced. Ask Superadmin to check access and
      the catalogue installation.
    </p>
  );
}
