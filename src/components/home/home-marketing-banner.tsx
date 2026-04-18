import Link from "next/link";

/** Prominent homepage strip: low entry price + no application fee. */
export function HomeMarketingBanner() {
  return (
    <section className="relative border-b border-amber-500/25 bg-gradient-to-r from-[#0a1628] via-[#132a4a] to-[#0a1628] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row sm:gap-6">
        <p className="text-center text-sm leading-relaxed text-white sm:text-left sm:text-base">
          Start your European journey with UniMondo from as low as{" "}
          <strong className="font-semibold text-amber-300">$150</strong> — No application fee.
        </p>
        <Link
          href="/packages"
          className="shrink-0 rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
        >
          Our packages
        </Link>
      </div>
    </section>
  );
}
