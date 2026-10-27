"use client";

import { SECTION_DEFAULTS } from "@/lib/homepage/content";
const DEFAULT_COPY = SECTION_DEFAULTS.destinations;

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { slugifyCountryName } from "@/lib/destinations-utils";

const FLAG: Record<string, string> = {
  Italy: "🇮🇹",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Netherlands: "🇳🇱",
  Spain: "🇪🇸",
  Poland: "🇵🇱",
};

import { DESTINATION_DEFAULTS } from "@/lib/homepage/item-defaults";
export type DestinationCard = { id: string; country: string; blurb: string; img: string; alt?: string; flag?: string; slug?: string };
const DESTINATIONS: DestinationCard[] = DESTINATION_DEFAULTS.map((d,i) => ({id: `default-country-${i}`,country:d.country,blurb:d.description,img:d.imageUrl}));

export type DestinationsCopy = {
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function PopularDestinations({
  copy = DEFAULT_COPY, cards = DESTINATIONS, destinationLabel = "View destination",
}: {
  copy?: DestinationsCopy; cards?: DestinationCard[]; destinationLabel?: string;
}) {
  const c = {
    kicker: copy?.kicker ?? DEFAULT_COPY.kicker,
    title: copy?.title ?? DEFAULT_COPY.title,
    subtitle: copy?.subtitle ?? DEFAULT_COPY.subtitle,
    ctaLabel: copy?.ctaLabel ?? DEFAULT_COPY.ctaLabel,
    ctaHref: copy?.ctaHref ?? DEFAULT_COPY.ctaHref,
  };
  return (
    <section className="bg-[#F8F7F3] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D673A]">{c.kicker}</p>
            <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#26343B] sm:text-4xl">
              {c.title}
            </h2>
            <p className="mt-3 max-w-xl text-[#4D5F64]">{c.subtitle}</p>
          </div>
          <Link
            href={c.ctaHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#244B50] hover:text-[#1D3E42] transition"
          >
            {c.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 flex gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {cards.map((d, i) => (
            <motion.article
              key={d.id}
              data-home-item={`destinations:${d.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="relative min-w-[280px] flex-1 overflow-hidden rounded-xl border border-[#E2DFD8] bg-white shadow-sm transition hover:shadow-md sm:min-w-0"
            >
              <div className="relative aspect-[16/11] w-full">
                {d.img && <Image
                  src={d.img}
                  alt={d.alt || `${d.country} — European study destination`}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                  sizes="(max-width:768px) 85vw, 33vw"
                />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E3A]/90 via-[#1A2E3A]/25 to-transparent" />
                <span className="absolute left-4 top-4 text-3xl drop-shadow-md" role="img" aria-hidden>
                  {d.flag || FLAG[d.country]}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-[family-name:var(--font-editorial)] text-2xl font-bold text-white">{d.country}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[#E6EEE8]/90">{d.blurb}</p>
                  <Link
                    href={`/destinations/${d.slug || slugifyCountryName(d.country)}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#C9AB76] hover:text-white transition"
                  >
                    {destinationLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
