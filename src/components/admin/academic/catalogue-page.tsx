import { redirect } from "next/navigation";
import { CatalogueManager } from "./catalogue-manager";
import { readAcademicCatalogue } from "@/lib/academic/server";
import type { AcademicKind } from "@/lib/academic/model";
export async function AcademicCataloguePage({
  kind,
  searchParams,
}: {
  kind: AcademicKind;
  searchParams?: Promise<{ record?: string }>;
}) {
  const data = await readAcademicCatalogue();
  if (!data.permissions[kind].view) redirect("/admin/dashboard");
  return (
    <CatalogueManager
      kind={kind}
      data={data}
      initialRecord={(await searchParams)?.record}
    />
  );
}
