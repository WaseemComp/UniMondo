import Link from "next/link";

/** Prominent homepage strip: low entry price + no application fee. */
export type HomeMarketingBannerCopy = {
  text?: string;
  highlight?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function HomeMarketingBanner({
  copy = {
    text: "Start your European journey with UniMondo from as low as",
    highlight: "$150",
    ctaLabel: "Our packages",
    ctaHref: "/packages",
  },
}: {
  copy?: HomeMarketingBannerCopy;
}) {
  const c = {
    text: copy?.text ?? "Start your European journey with UniMondo from as low as",
    highlight: copy?.highlight ?? "$150",
    ctaLabel: copy?.ctaLabel ?? "Our packages",
    ctaHref: copy?.ctaHref ?? "/packages",
  };
  return (
    <section className="relative border-b border-[#E2DFD8] bg-[#E6EEE8] px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row sm:gap-6">
        <p className="text-center text-sm leading-relaxed text-[#26343B] sm:text-left sm:text-[15px]">
          {c.text} <strong className="font-bold text-[#244B50]">{c.highlight}</strong> — No upfront application fee.
        </p>
        <Link
          href={c.ctaHref}
          className="shrink-0 rounded-lg border border-[#244B50]/30 bg-white px-4 py-1.5 text-xs font-semibold text-[#244B50] shadow-xs transition hover:bg-[#F8F7F3]"
        >
          {c.ctaLabel}
        </Link>
      </div>
    </section>
  );
}
