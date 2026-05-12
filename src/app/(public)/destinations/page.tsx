import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { DestinationsUnified } from "@/components/destinations/destinations-unified";
import { getDestinationsPageData } from "@/lib/data/destinations-page";
import { countrySlug, findCountryBySlug, slugifyCountryName } from "@/lib/destinations-utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Study Destinations & Universities | UniMondo",
  description:
    "Explore countries, universities, programs, tuition, living costs, scholarships, visa guidance, and intakes — all in one place.",
};

type Props = {
  searchParams: Promise<{ country?: string }>;
};

export default async function DestinationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [countries, openings, featuredUniversities] = await getDestinationsPageData();

  const legacy = params.country?.trim();
  if (legacy) {
    const bySlug = findCountryBySlug(countries, slugifyCountryName(legacy));
    const byName = countries.find((c) => c.country.toLowerCase() === legacy.toLowerCase());
    const match = bySlug ?? byName;
    if (match) {
      permanentRedirect(`/destinations/${countrySlug(match)}`);
    }
  }

  return <DestinationsUnified countries={countries} openings={openings} featuredUniversities={featuredUniversities} />;
}
