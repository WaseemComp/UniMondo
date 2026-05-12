import { permanentRedirect } from "next/navigation";

/** Canonical URL: `/admin/destinations/countries` */
export default function AdminCountriesLegacyRedirect() {
  permanentRedirect("/admin/destinations/countries");
}
