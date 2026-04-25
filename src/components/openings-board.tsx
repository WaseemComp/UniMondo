"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FeaturedUniversitiesGrid } from "@/components/programs/featured-universities-grid";
import type { FeaturedUniversity } from "@/lib/featured-universities";
import type { Opening } from "@/lib/unimondo-data";

type Props = {
  openings: Opening[];
  featuredUniversities: FeaturedUniversity[];
};

export function OpeningsBoard({ openings, featuredUniversities }: Props) {
  const intakeOptions = useMemo(() => {
    const values = [...new Set(openings.map((o) => o.intake).filter(Boolean))].sort();
    return ["All", ...values];
  }, [openings]);

  const [intake, setIntake] = useState<string>("All");
  const [continent, setContinent] = useState<string>("All");
  const [region, setRegion] = useState<string>("All");
  const [country, setCountry] = useState<string>("All");

  const byIntake = useMemo(() => {
    if (intake === "All") return openings;
    return openings.filter((item) => item.intake === intake);
  }, [intake, openings]);

  const continents = useMemo(() => ["All", ...new Set(byIntake.map((item) => item.continent))], [byIntake]);

  const regions = useMemo(() => {
    const scoped =
      continent === "All" ? byIntake : byIntake.filter((item) => item.continent === continent);
    return ["All", ...new Set(scoped.map((item) => item.region))];
  }, [byIntake, continent]);

  const countries = useMemo(() => {
    const scoped = byIntake.filter((item) => {
      if (continent !== "All" && item.continent !== continent) return false;
      if (region !== "All" && item.region !== region) return false;
      return true;
    });
    return ["All", ...new Set(scoped.map((item) => item.country))];
  }, [byIntake, continent, region]);

  const filtered = useMemo(() => {
    return openings.filter((item) => {
      if (intake !== "All" && item.intake !== intake) return false;
      if (continent !== "All" && item.continent !== continent) return false;
      if (region !== "All" && item.region !== region) return false;
      if (country !== "All" && item.country !== country) return false;
      return true;
    });
  }, [openings, intake, continent, region, country]);

  const isFiltered =
    intake !== "All" || continent !== "All" || region !== "All" || country !== "All";

  const featuredBlock =
    featuredUniversities.length > 0 ? (
      <section className="space-y-6">
        <div className="text-center lg:mb-2">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
            Universities &amp; Programs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            A curated selection of institutions where tradition meets innovation — each with pathways we help students
            navigate from admission to arrival.
          </p>
        </div>
        <FeaturedUniversitiesGrid
          universities={featuredUniversities}
          eagerHeroCount={isFiltered ? 0 : 3}
        />
      </section>
    ) : (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        Universities will appear here once they are published in the admin dashboard.
      </p>
    );

  const programsIntro = (
    <div className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
        {isFiltered ? "Programs matching your filters" : "Browse all programs"}
      </h2>
      <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        {isFiltered
          ? "Refine intake and geography above, then apply with pre-filled destination details."
          : "Live listings for upcoming intakes — filter by geography and intake, then apply with pre-filled destination details."}
      </p>
    </div>
  );

  const programsGrid = (
    <section id="program-results" className="grid scroll-mt-28 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((opening) => (
        <article
          key={opening.id}
          className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {opening.logoText}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{opening.country}</p>
              <p className="text-sm text-zinc-700">{opening.university}</p>
            </div>
          </div>

          <h3 className="text-base font-semibold text-zinc-900">{opening.programName}</h3>
          <p className="mt-2 text-sm text-zinc-600">Intake: {opening.intake}</p>
          <p className="text-sm text-zinc-600">Deadline: {opening.deadline}</p>
          <p className="text-sm text-zinc-600">Tuition: {opening.tuitionRange}</p>

          <div className="mt-5">
            <Link
              href={`/apply?country=${encodeURIComponent(opening.country)}&program=${encodeURIComponent(opening.programName)}`}
              className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Apply Now
            </Link>
          </div>
        </article>
      ))}
    </section>
  );

  const emptyPrograms = !filtered.length && (
    <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
      No openings found for the selected filters.
    </p>
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Filter openings</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Intake</span>
            <select
              value={intake}
              onChange={(event) => {
                setIntake(event.target.value);
                setContinent("All");
                setRegion("All");
                setCountry("All");
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              {intakeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Continent</span>
            <select
              value={continent}
              onChange={(event) => {
                setContinent(event.target.value);
                setRegion("All");
                setCountry("All");
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              {continents.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Region</span>
            <select
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                setCountry("All");
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              {regions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Country</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              {countries.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!isFiltered ? (
        <>
          {featuredBlock}
          <div className="space-y-6 border-t border-zinc-200 pt-10">
            {programsIntro}
            {programsGrid}
            {emptyPrograms}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-6">
            {programsIntro}
            {programsGrid}
            {emptyPrograms}
          </div>
          <div className="space-y-6 border-t border-zinc-200 pt-10">{featuredBlock}</div>
        </>
      )}
    </div>
  );
}
