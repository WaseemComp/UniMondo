import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DestinationsUnified } from "@/components/destinations/destinations-unified";
import { getCountryDetails } from "@/lib/data/countries";
import { getDestinationsPageData } from "@/lib/data/destinations-page";
import { findCountryBySlug } from "@/lib/destinations-utils";

export const revalidate = 60;

type Props = {
  params: Promise<{ countrySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params;
  const countries = await getCountryDetails();
  const c = findCountryBySlug(countries, countrySlug);
  if (!c) {
    return { title: "Destination | UniMondo" };
  }
  const desc =
    c.description?.trim() ||
    (c.whyStudyThere.length > 160 ? `${c.whyStudyThere.slice(0, 157).trim()}…` : c.whyStudyThere);
  return {
    title: `Study in ${c.country} | UniMondo Destinations`,
    description: desc,
  };
}

export default async function DestinationCountryPage({ params }: Props) {
  const { countrySlug } = await params;
  const [countries, openings, featuredUniversities] = await getDestinationsPageData();
  if (!findCountryBySlug(countries, countrySlug)) notFound();

  return <DestinationsUnified countries={countries} openings={openings} featuredUniversities={featuredUniversities} />;
}
