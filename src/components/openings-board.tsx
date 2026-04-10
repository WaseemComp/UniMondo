"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Opening } from "@/lib/unimondo-data";

type Intake = "All" | "Fall 2026" | "Spring 2027";

type Props = {
  openings: Opening[];
};

export function OpeningsBoard({ openings }: Props) {
  const [intake, setIntake] = useState<Intake>("All");
  const [continent, setContinent] = useState<string>("All");
  const [region, setRegion] = useState<string>("All");
  const [country, setCountry] = useState<string>("All");

  /** Narrow by intake first, then geography (continent → region → country). */
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Filter Openings</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Intake</span>
            <select
              value={intake}
              onChange={(event) => {
                setIntake(event.target.value as Intake);
                setContinent("All");
                setRegion("All");
                setCountry("All");
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              <option value="All">All</option>
              <option value="Fall 2026">Fall 2026</option>
              <option value="Spring 2027">Spring 2027</option>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      {!filtered.length && (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          No openings found for the selected filters.
        </p>
      )}
    </div>
  );
}
