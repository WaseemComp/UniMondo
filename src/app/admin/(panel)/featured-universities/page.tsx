import { AcademicCataloguePage } from "@/components/admin/academic/catalogue-page";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ record?: string }>;
}) {
  return (
    <AcademicCataloguePage searchParams={searchParams} kind="universities" />
  );
}
