"use client";

import { useMemo, useState } from "react";
import { countryDetails, regionGroups } from "@/lib/unimondo-data";

export function DestinationsBrowser({ initialCountry }: { initialCountry?: string }) {
  const initial = useMemo(() => {
    const match = countryDetails.find((country) => country.country === initialCountry);
    return match?.country || "Italy";
  }, [initialCountry]);

  const [activeCountry, setActiveCountry] = useState(initial);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Countries</h2>
        <div className="flex flex-wrap gap-2">
          {countryDetails.map((country) => (
            <button
              key={country.country}
              type="button"
              onClick={() => setActiveCountry(country.country)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCountry === country.country
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {country.country}
              {country.highlighted ? " (Priority)" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {regionGroups.map((group) => (
          <section key={group} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase">{group}</h3>
            <div className="flex flex-wrap gap-2">
              {countryDetails
                .filter((country) => country.regionGroup === group)
                .map((country) => (
                  <button
                    key={country.country}
                    type="button"
                    onClick={() => setActiveCountry(country.country)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      activeCountry === country.country
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {country.country}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>

      {countryDetails
        .filter((country) => country.country === activeCountry)
        .map((country) => (
          <article key={country.country} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-zinc-900">Study in {country.country}</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {country.regionGroup}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Why study there</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{country.whyStudyThere}</p>
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Popular universities</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {country.popularUniversities.map((university) => (
                    <li key={university}>- {university}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Living cost (approx)</h3>
                <p className="mt-2 text-sm text-zinc-700">{country.livingCostApprox}</p>
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Visa info</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{country.visaInfo}</p>
              </section>
            </div>
          </article>
        ))}
    </div>
  );
}
