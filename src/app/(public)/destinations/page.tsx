import { DestinationsLive } from "@/components/destinations/destinations-live";
import { getCountryDetails } from "@/lib/data/countries";

type Props = {
  searchParams: Promise<{ country?: string }>;
};

export const revalidate = 60;

export default async function DestinationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const countries = await getCountryDetails();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Destinations</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Study Destinations in Europe</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
          Explore destination insights by country and region with admissions-focused guidance for programs, living cost,
          and student visa pathways.
        </p>
      </section>

      <DestinationsLive initialCountry={params.country} initialCountries={countries} />
    </main>
  );
}
