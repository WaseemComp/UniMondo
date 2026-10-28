import { RegionsManager } from "@/components/admin/cms/regions-manager";
import { catalogueAccess } from "@/app/admin/cms/catalogue-actions";
export default async function Page() {
  const { grants } = await catalogueAccess("countries");
  return <RegionsManager grants={grants} />;
}
