import Link from "next/link";
import { Globe, Landmark, FileText } from "lucide-react";

export default function AdminDestinationsHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Destinations</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Everything that powers <Link href="/destinations" className="font-medium text-amber-800 hover:underline">/destinations</Link>{" "}
          and country guides like <span className="whitespace-nowrap">/destinations/ireland</span>: country copy (sections A–D),
          spotlight university cards, and published program openings (section E).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/destinations/countries"
          className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
        >
          <Globe className="h-8 w-8 text-amber-700" aria-hidden />
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Countries</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
            Overview, costs, visa copy, slugs, and “also popular” university names. Matches sections A–C and the list in D on
            the public guide.
          </p>
          <span className="mt-4 text-sm font-semibold text-amber-800">Open editor →</span>
        </Link>

        <Link
          href="/admin/featured-universities"
          className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
        >
          <Landmark className="h-8 w-8 text-amber-700" aria-hidden />
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">
            Featured universities
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
            Spotlight cards (hero image, QS label, prestige line, flagship programs, apply links). Filtered on the site by the{" "}
            <span className="font-medium text-zinc-700">Country</span> field — use the exact country name (e.g. Ireland).
          </p>
          <span className="mt-4 text-sm font-semibold text-amber-800">Open editor →</span>
        </Link>

        <Link
          href="/admin/programs"
          className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
        >
          <FileText className="h-8 w-8 text-amber-700" aria-hidden />
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Programs</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
            Published intakes for section E. The <span className="font-medium text-zinc-700">Country</span> column must match
            the country name in CMS so cards appear under the right destination.
          </p>
          <span className="mt-4 text-sm font-semibold text-amber-800">Open editor →</span>
        </Link>
      </div>
    </div>
  );
}
