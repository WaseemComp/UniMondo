import { getCountryDetails } from "@/lib/data/countries";
import { getFeaturedUniversities } from "@/lib/data/featured-universities";
import { getOpenings } from "@/lib/data/openings";

export async function getDestinationsPageData() {
  return Promise.all([getCountryDetails(), getOpenings(), getFeaturedUniversities()]);
}
