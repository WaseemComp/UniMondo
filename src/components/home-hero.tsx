import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/85 p-8 shadow-[0_30px_90px_-45px_rgba(2,6,23,0.55)] sm:p-12">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-200/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />

      <div className="relative max-w-3xl space-y-6">
        <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
          UniMondo Education Consultancy
        </p>
        <h1 className="text-balance text-3xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">
          Your future knows no borders and neither do we. At UniMondo, we open doors to world-class universities
          across Europe and beyond, turning ambitious dreams into real, achievable success stories.
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/destinations?country=Italy"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-zinc-700"
          >
            Explore Italy
          </Link>
          <Link
            href="/current-openings"
            className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-500"
          >
            View Current Openings
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-sm font-semibold text-zinc-700">
          <span className="rounded-full bg-zinc-100 px-3 py-1">Pakistan</span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">Libya</span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">Italy</span>
        </div>
      </div>
    </section>
  );
}
