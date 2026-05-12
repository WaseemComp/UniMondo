import { redirect } from "next/navigation";

export default function LegacyAdminCountriesRedirect() {
  redirect("/admin/destinations/countries");
}
