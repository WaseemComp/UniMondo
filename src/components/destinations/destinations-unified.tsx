"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FeaturedUniversitiesGrid } from "@/components/programs/featured-universities-grid";
import type { FeaturedUniversity } from "@/lib/featured-universities";
import {
  aggregateTuitionBounds,
  countrySlug,
  fieldHaystack,
  findCountryBySlug,
  inferStudyLevel,
  openingsForCountry,
  suggestsScholarshipOrLowTuition,
  tuitionBandForCountry,
  tuitionMidpointEur,
  visaBulletPoints,
} from "@/lib/destinations-utils";
import type { CountryDetail, Opening } from "@/lib/unimondo-data";

type Props = {
  countries: CountryDetail[];
  openings: Opening[];
  featuredUniversities: FeaturedUniversity[];
};

const TUITION_BUCKETS = ["Any", "Under €5,000 / yr", "€5,000 – €10,000 / yr", "Over €10,000 / yr"] as const;

function tuitionBucket(o: Opening): (typeof TUITION_BUCKETS)[number] {
  const mid = tuitionMidpointEur(o.tuitionRange);
  if (mid == null) return "Any";
  if (mid < 5000) return "Under €5,000 / yr";
  if (mid <= 10000) return "€5,000 – €10,000 / yr";
  return "Over €10,000 / yr";
}

function matchesTuitionBucket(o: Opening, bucket: string): boolean {
  if (bucket === "Any") return true;
  return tuitionBucket(o) === bucket;
}

export function DestinationsUnified({ countries, openings, featuredUniversities }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const slugFromPath = useMemo(() => {
    const tail = pathname.replace(/^\/destinations\/?/, "").split("/").filter(Boolean)[0];
    return tail ?? null;
  }, [pathname]);

  const activeCountry = useMemo(() => {
    if (!slugFromPath) return null;
    return findCountryBySlug(countries, slugFromPath) ?? null;
  }, [countries, slugFromPath]);

  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("All");
  const [filterCountry, setFilterCountry] = useState<string>("All");
  const [filterStudyLevel, setFilterStudyLevel] = useState<string>("All");
  const [filterField, setFilterField] = useState("");
  const [filterIntake, setFilterIntake] = useState<string>("All");
  const [filterTuition, setFilterTuition] = useState<string>("Any");
  const [filterScholarship, setFilterScholarship] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<string>("All");

  const intakeOptions = useMemo(() => {
    const values = [...new Set(openings.map((o) => o.intake).filter(Boolean))].sort();
    return ["All", ...values];
  }, [openings]);

  const regionOptions = useMemo(() => {
    const values = [...new Set(countries.map((c) => c.regionGroup).filter(Boolean))].sort();
    return ["All", ...values];
  }, [countries]);

  const studyLevels = useMemo(() => {
    const levels = new Set(openings.map((o) => inferStudyLevel(o)));
    return ["All", ...[...levels].sort()];
  }, [openings]);

  const filteredOpenings = useMemo(() => {
    return openings.filter((o) => {
      if (filterStudyLevel !== "All" && inferStudyLevel(o) !== filterStudyLevel) return false;
      if (filterIntake !== "All" && o.intake !== filterIntake) return false;
      if (!matchesTuitionBucket(o, filterTuition)) return false;
      if (filterScholarship && !suggestsScholarshipOrLowTuition(o)) return false;
      if (filterLanguage !== "All") {
        const lang = o.languageOfInstruction ?? "English";
        if (lang !== filterLanguage) return false;
      }
      if (filterField.trim()) {
        const q = filterField.trim().toLowerCase();
        if (!fieldHaystack(o).includes(q)) return false;
      }
      if (filterRegion !== "All") {
        const c = countries.find((x) => x.country === o.country);
        if (!c || c.regionGroup !== filterRegion) return false;
      }
      if (filterCountry !== "All" && o.country !== filterCountry) return false;
      return true;
    });
  }, [
    openings,
    filterStudyLevel,
    filterIntake,
    filterTuition,
    filterScholarship,
    filterLanguage,
    filterField,
    filterRegion,
    filterCountry,
    countries,
  ]);

  const visibleCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const programActive =
      filterStudyLevel !== "All" ||
      filterIntake !== "All" ||
      filterTuition !== "Any" ||
      filterScholarship ||
      filterField.trim().length > 0;

    let base = countries;

    if (filterRegion !== "All") {
      base = base.filter((c) => c.regionGroup === filterRegion);
    }
    if (filterCountry !== "All") {
      base = base.filter((c) => c.country === filterCountry);
    }

    if (programActive) {
      const allowed = new Set(filteredOpenings.map((o) => o.country));
      base = base.filter((c) => allowed.has(c.country));
    }

    if (q) {
      base = base.filter((c) => {
        const blob = `${c.country} ${c.regionGroup} ${c.description ?? ""} ${c.whyStudyThere} ${c.popularUniversities.join(" ")}`.toLowerCase();
        if (blob.includes(q)) return true;
        return filteredOpenings.some((o) => o.country === c.country && fieldHaystack(o).includes(q));
      });
    }

    return base;
  }, [
    countries,
    filterRegion,
    filterCountry,
    filteredOpenings,
    search,
    filterStudyLevel,
    filterIntake,
    filterTuition,
    filterScholarship,
    filterField,
  ]);

  const openingsForActive = useMemo(() => {
    if (!activeCountry) return [];
    return filteredOpenings.filter((o) => o.country === activeCountry.country);
  }, [activeCountry, filteredOpenings]);

  const featuredForActive = useMemo(() => {
    if (!activeCountry) return [];
    return featuredUniversities.filter((u) => u.country === activeCountry.country);
  }, [activeCountry, featuredUniversities]);

  useEffect(() => {
    if (!activeCountry) return;
    const id = `destination-detail-${countrySlug(activeCountry)}`;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeCountry]);

  return (
    <div className="min-w-0">
      <section id="destinations-hero" className="relative overflow-hidden border-b border-white/10 bg-[#0a1628]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 20% 20%, rgba(212, 175, 55, 0.12), transparent 50%), radial-gradient(ellipse 100% 60% at 80% 100%, rgba(30, 58, 95, 0.55), transparent 45%), linear-gradient(165deg, #0a1628 0%, #132a4a 48%, #0d1f38 100%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">UniMondo Destinations</p>
          <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Study Destinations &amp; Universities
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Explore countries, universities, programs, tuition fees, living costs, scholarships, visa guidance, and
            available intakes — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#destination-filters"
              className="inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0a1628] shadow-md transition hover:bg-amber-400"
            >
              Explore destinations
            </a>
            <Link
              href="/apply"
              className="inline-flex rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Start application
            </Link>
          </div>
          <label className="mt-10 block max-w-xl">
            <span className="sr-only">Search destinations and programs</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by country, university, program, intake, or field of study"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 backdrop-blur-md focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </label>
        </div>
      </section>

      <section id="destination-filters" className="scroll-mt-24 border-b border-zinc-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628] sm:text-2xl">
            Find your destination
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600">
            Narrow down by geography and program preferences. Filters apply to destination cards and program listings.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <FilterSelect label="Country" value={filterCountry} onChange={setFilterCountry} options={["All", ...countries.map((c) => c.country)]} />
            <FilterSelect label="Region" value={filterRegion} onChange={setFilterRegion} options={regionOptions} />
            <FilterSelect label="Study level" value={filterStudyLevel} onChange={setFilterStudyLevel} options={studyLevels} />
            <FilterSelect label="Intake" value={filterIntake} onChange={setFilterIntake} options={intakeOptions} />
            <FilterSelect label="Tuition range" value={filterTuition} onChange={setFilterTuition} options={[...TUITION_BUCKETS]} />
            <label className="space-y-1 text-sm text-zinc-700 lg:col-span-2">
              <span className="font-medium">Field of study</span>
              <input
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                placeholder="e.g. engineering, law, data science"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <FilterSelect
              label="Language of instruction"
              value={filterLanguage}
              onChange={setFilterLanguage}
              options={["All", "English"]}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-zinc-800 lg:col-span-2">
              <input
                type="checkbox"
                checked={filterScholarship}
                onChange={(e) => setFilterScholarship(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-400"
              />
              <span className="font-medium">Scholarship-friendly or low-tuition listings</span>
            </label>
          </div>
        </div>
      </section>

      <section id="destination-cards" className="scroll-mt-24 bg-zinc-50/90 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
              Choose a destination
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 sm:text-base">
              Start with a country — then review universities, published intakes, and costs in one scroll.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCountries.map((c) => (
              <DestinationCountryCard
                key={c.country}
                country={c}
                allOpenings={openings}
                filteredOpenings={filteredOpenings}
                onOpen={() => router.push(`/destinations/${countrySlug(c)}`)}
              />
            ))}
          </div>

          {!visibleCountries.length ? (
            <p className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
              No destinations match these filters. Try clearing field of study or tuition filters.
            </p>
          ) : null}
        </div>
      </section>

      {activeCountry ? (
        <DestinationDetailSection
          country={activeCountry}
          openings={openingsForActive}
          allOpeningsForCountry={openings.filter((o) => o.country === activeCountry.country)}
          featured={featuredForActive}
          onBack={() => router.push("/destinations")}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-1 text-sm text-zinc-700">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DestinationCountryCard({
  country,
  allOpenings,
  filteredOpenings,
  onOpen,
}: {
  country: CountryDetail;
  allOpenings: Opening[];
  filteredOpenings: Opening[];
  onOpen: () => void;
}) {
  const scoped = openingsForCountry(filteredOpenings, country.country);
  const uniCount = new Set(scoped.map((o) => o.university)).size;
  const programsListed = scoped.length;
  const band =
    tuitionBandForCountry(filteredOpenings, country.country) ?? tuitionBandForCountry(allOpenings, country.country);
  const shortDesc =
    country.description?.trim() ||
    country.whyStudyThere.slice(0, 220) + (country.whyStudyThere.length > 220 ? "…" : "");

  const visaShort = country.visaInfo.trim().split(".").slice(0, 2).join(". ").trim();
  const visaNote = visaShort ? (visaShort.endsWith(".") ? visaShort : `${visaShort}.`) : "Student visa pathway — details vary by nationality.";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-300/60 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">
            {country.flagEmoji ? (
              <span className="mr-2" aria-hidden>
                {country.flagEmoji}
              </span>
            ) : null}
            {country.country}
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-700/90">{country.regionGroup}</p>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-600">{shortDesc}</p>
      <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Tuition (listed)</dt>
          <dd className="text-right font-medium text-zinc-800">{band ?? "See programs below"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Living cost</dt>
          <dd className="text-right font-medium text-zinc-800">{country.livingCostApprox || "Varies by city"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Visa snapshot</dt>
          <dd className="max-w-[58%] text-right text-xs leading-snug text-zinc-700">{visaNote}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Universities / programs</dt>
          <dd className="text-right font-medium text-zinc-800">
            {uniCount} universities · {programsListed} matching programs
          </dd>
        </div>
      </dl>
      {country.popularUniversities.length ? (
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-600">Popular:</span> {country.popularUniversities.slice(0, 3).join(", ")}
          {country.popularUniversities.length > 3 ? "…" : ""}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        View {country.country}
      </button>
    </article>
  );
}

function DestinationDetailSection({
  country,
  openings,
  allOpeningsForCountry,
  featured,
  onBack,
}: {
  country: CountryDetail;
  openings: Opening[];
  allOpeningsForCountry: Opening[];
  featured: FeaturedUniversity[];
  onBack: () => void;
}) {
  const slug = countrySlug(country);
  const visaBullets = visaBulletPoints(country.visaInfo);
  const tuitionAgg = aggregateTuitionBounds(allOpeningsForCountry);

  const g = country.destinationGuide;
  const ov = g?.overview;
  const cost = g?.costs;
  const visa = g?.visa;

  const defaultEducation =
    "Degrees are aligned with the European Bologna framework in most cases: undergraduate (3 years), graduate (1–2 years), with strong English-taught options in major cities. Entry typically requires recognized prior study and language proof where applicable.";

  const defaultCities = `Students choose hubs with strong transport links, international communities, and internship access — often capital cities and regional academic centers within ${country.regionGroup}. Expect vibrant campus societies, seasonal travel opportunities, and practical part-time work rules that vary by country.`;

  const defaultScholarships =
    "Many institutions publish merit and need-based awards; EU programs may also offer mobility grants. We map scholarship cycles alongside admission deadlines so you do not miss parallel applications.";

  const tuitionBandLine =
    cost?.tuitionBandNote?.trim() ||
    (tuitionAgg
      ? `EUR ${tuitionAgg.min.toLocaleString("en-EU")} – ${tuitionAgg.max.toLocaleString("en-EU")} / year across current listings`
      : "See individual programs below — bands vary by faculty and intake.");

  const defaultAccommodation =
    "Typically your largest monthly line item — shared housing or student residences are common first-year choices.";
  const defaultFoodTransport =
    "Plan for local transit passes and groceries; many cities offer discounted student fares.";
  const defaultProofFunds =
    "Visa pathways usually require documented savings or sponsorship aligned with embassy guidance — amounts depend on destination rules and your study city.";

  const defaultEmbassyNote = "Book early during peak intakes; processing windows vary by location.";
  const defaultVisaType = "Long-stay student route (wording differs by embassy).";

  const hasStructuredVisa =
    visa &&
    [
      visa.studentVisaType,
      visa.mainRequirements,
      visa.proofOfAdmission,
      visa.proofOfFunds,
      visa.insurance,
      visa.accommodation,
      visa.embassyNote,
    ].some((x) => x?.trim());

  const extraUniversities = country.popularUniversities.filter(
    (name) => !featured.some((f) => f.name.toLowerCase() === name.toLowerCase()),
  );

  return (
    <section
      id={`destination-detail-${slug}`}
      className="scroll-mt-24 border-t border-zinc-200 bg-white py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-zinc-500">
          <button type="button" onClick={onBack} className="font-medium text-amber-700 hover:underline">
            All destinations
          </button>
          <span className="mx-2 text-zinc-300">/</span>
          <span className="text-zinc-800">{country.country}</span>
        </nav>

        <header className="mb-12 border-b border-zinc-100 pb-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Destination guide</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[#0a1628] sm:text-4xl">
            {country.flagEmoji ? <span className="mr-2">{country.flagEmoji}</span> : null}
            Study in {country.country}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">{country.description ?? country.whyStudyThere}</p>
        </header>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6">
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">A. Overview</h3>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-700">
                <div>
                  <p className="font-semibold text-zinc-900">Why study in {country.country}</p>
                  <p className="mt-1">{country.whyStudyThere}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Education system snapshot</p>
                  <p className="mt-1">{ov?.educationSystem?.trim() || defaultEducation}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Popular cities &amp; student lifestyle</p>
                  <p className="mt-1">{ov?.popularCitiesLifestyle?.trim() || defaultCities}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Scholarship opportunities</p>
                  <p className="mt-1">{ov?.scholarships?.trim() || defaultScholarships}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">B. Cost information</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-700">
                <li>
                  <span className="font-semibold text-zinc-900">Tuition band (published programs): </span>
                  {tuitionBandLine}
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">Monthly living budget: </span>
                  {country.livingCostApprox}
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">Accommodation: </span>
                  {cost?.accommodation?.trim() || defaultAccommodation}
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">Food &amp; transport: </span>
                  {cost?.foodTransport?.trim() || defaultFoodTransport}
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">Proof of funds: </span>
                  {cost?.proofOfFunds?.trim() || defaultProofFunds}
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">C. Visa information</h3>
              {hasStructuredVisa && visa ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                  <li>
                    <span className="font-semibold text-zinc-900">Student visa type: </span>
                    {visa.studentVisaType?.trim() || defaultVisaType}
                  </li>
                  {visa.mainRequirements?.trim() ? (
                    <li>
                      <span className="font-semibold text-zinc-900">Main requirements: </span>
                      {visa.mainRequirements}
                    </li>
                  ) : null}
                  {visa.proofOfAdmission?.trim() ? (
                    <li>
                      <span className="font-semibold text-zinc-900">Proof of admission: </span>
                      {visa.proofOfAdmission}
                    </li>
                  ) : null}
                  {visa.proofOfFunds?.trim() ? (
                    <li>
                      <span className="font-semibold text-zinc-900">Proof of funds: </span>
                      {visa.proofOfFunds}
                    </li>
                  ) : null}
                  {visa.insurance?.trim() ? (
                    <li>
                      <span className="font-semibold text-zinc-900">Insurance: </span>
                      {visa.insurance}
                    </li>
                  ) : null}
                  {visa.accommodation?.trim() ? (
                    <li>
                      <span className="font-semibold text-zinc-900">Accommodation: </span>
                      {visa.accommodation}
                    </li>
                  ) : null}
                  <li>
                    <span className="font-semibold text-zinc-900">Embassy appointments: </span>
                    {visa.embassyNote?.trim() || defaultEmbassyNote}
                  </li>
                </ul>
              ) : (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                  <li>
                    <span className="font-semibold text-zinc-900">Student visa type: </span>
                    {defaultVisaType}
                  </li>
                  {visaBullets.length ? (
                    visaBullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))
                  ) : (
                    <li>Admission letter, financial proof, insurance, and accommodation evidence are commonly requested.</li>
                  )}
                  <li>
                    <span className="font-semibold text-zinc-900">Embassy appointments: </span>
                    {defaultEmbassyNote}
                  </li>
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 p-5 text-sm text-amber-950">
              <p className="font-semibold">Ready to apply?</p>
              <p className="mt-2 leading-relaxed opacity-90">
                We align documents, intake timing, and visa checks before you pay embassy fees.
              </p>
              <Link
                href={`/apply?country=${encodeURIComponent(country.country)}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0a1628] hover:bg-amber-400"
              >
                Start application
              </Link>
            </div>
          </aside>
        </div>

        <section className="mt-14 border-t border-zinc-100 pt-12">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628]">D. Popular universities</h3>
              <p className="mt-1 text-sm text-zinc-600">Spotlight partners and celebrated institutions we frequently support.</p>
            </div>
          </div>
          {featured.length ? (
            <FeaturedUniversitiesGrid
              universities={featured}
              eagerHeroCount={3}
              programsSectionId="#destination-programs"
            />
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-600">
              Featured spotlight universities for {country.country} will appear here when published in the admin CMS.
            </p>
          )}

          {extraUniversities.length ? (
            <div className="mt-10">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Also popular</h4>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {extraUniversities.map((name) => (
                  <li key={name} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="font-medium text-zinc-900">{name}</span>
                    <Link
                      href={`/apply?country=${encodeURIComponent(country.country)}&program=${encodeURIComponent(`${name} — inquiry`)}`}
                      className="text-sm font-semibold text-amber-800 hover:underline"
                    >
                      Apply
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section id="destination-programs" className="mt-16 scroll-mt-28 border-t border-zinc-100 pt-12">
          <div className="mb-6">
            <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628]">E. Available programs</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Published intakes for {country.country}. Filters above refine what appears here.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {openings.map((o) => (
              <article key={o.id} className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                    {o.logoText}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">{o.university}</p>
                    <p className="text-sm font-semibold text-zinc-900">{o.programName}</p>
                  </div>
                </div>
                <dl className="space-y-1 text-sm text-zinc-600">
                  <div className="flex justify-between gap-2">
                    <dt>Level</dt>
                    <dd className="font-medium text-zinc-800">{inferStudyLevel(o)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Intake</dt>
                    <dd className="font-medium text-zinc-800">{o.intake}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Deadline</dt>
                    <dd className="font-medium text-zinc-800">{o.deadline}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Tuition</dt>
                    <dd className="font-medium text-zinc-800">{o.tuitionRange}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Language</dt>
                    <dd className="font-medium text-zinc-800">{o.languageOfInstruction ?? "English"}</dd>
                  </div>
                </dl>
                <Link
                  href={`/apply?country=${encodeURIComponent(o.country)}&program=${encodeURIComponent(o.programName)}`}
                  className="mt-5 inline-flex justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  Apply now
                </Link>
              </article>
            ))}
          </div>
          {!openings.length ? (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
              No published programs match your filters for {country.country}. Clear filters or explore another destination.
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
