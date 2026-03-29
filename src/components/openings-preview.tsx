import Link from "next/link";
import { openings } from "@/lib/unimondo-data";

export function OpeningsPreview() {
  const featured = openings.slice(0, 3);

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Current Openings</h2>
        <Link href="/current-openings" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
          See all openings
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {featured.map((opening) => (
          <article
            key={opening.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {opening.logoText}
            </div>
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{opening.country}</p>
            <h3 className="mt-1 text-base font-semibold text-zinc-900">{opening.programName}</h3>
            <p className="mt-1 text-sm text-zinc-600">{opening.university}</p>
            <p className="mt-2 text-xs text-zinc-500">Deadline: {opening.deadline}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
