import { SECTION_DEFAULTS } from "@/lib/homepage/content";
const DEFAULT_COPY = SECTION_DEFAULTS.marketing_banner;

import Link from "next/link";

/** Prominent homepage strip: low entry price + no application fee. */
export type HomeMarketingBannerCopy = {
  text?: string;
  highlight?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function HomeMarketingBanner({
  copy = DEFAULT_COPY, supportingText = "No upfront application fee.",
}: {
  copy?: HomeMarketingBannerCopy; supportingText?: string;
}) {
  const c = {
    text: copy?.text ?? DEFAULT_COPY.text,
    highlight: copy?.highlight ?? DEFAULT_COPY.highlight,
    ctaLabel: copy?.ctaLabel ?? DEFAULT_COPY.ctaLabel,
    ctaHref: copy?.ctaHref ?? DEFAULT_COPY.ctaHref,
  };
  return (
    <section className="relative border-b border-[#E2DFD8] bg-[#E6EEE8] px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row sm:gap-6">
        <p className="text-center text-sm leading-relaxed text-[#26343B] sm:text-left sm:text-[15px]">
          {c.text} <strong className="font-bold text-[#244B50]">{c.highlight}</strong>{supportingText ? ` — ${supportingText}` : ""}
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
