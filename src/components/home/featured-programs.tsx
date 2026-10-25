"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import type { Opening } from "@/lib/unimondo-data";

type Props = {
  openings: Opening[];
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function FeaturedPrograms({
  openings,
  kicker = "Universities",
  title = "Universities and Programs",
  subtitle = "Hand-picked tracks from leading institutions — clear deadlines, transparent tuition bands, and counselor support.",
  ctaLabel = "See all openings",
  ctaHref = "/destinations",
}: Props) {
  const featured = openings.slice(0, 4);
  return (
    <section className="relative bg-[#E9F0F5]/50 py-20 sm:py-28 border-y border-[#E2DFD8]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D673A]">{kicker}</p>
            <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#26343B] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-[#4D5F64]">{subtitle}</p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg border border-[#244B50]/30 bg-white px-4 py-2 text-sm font-semibold text-[#244B50] shadow-xs transition hover:bg-[#F8F7F3]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {featured.map((o, i) => (
            <motion.article
              key={o.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="flex flex-col rounded-xl border border-[#E2DFD8] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-md bg-[#244B50]/10 px-2.5 py-1 text-xs font-semibold text-[#244B50]">
                    {o.intake}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-editorial)] text-2xl font-bold text-[#26343B]">
                    {o.programName}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#4D5F64]">{o.university}</p>
                </div>
                {o.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CMS may point to arbitrary hosts
                  <img
                    src={o.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-[#E2DFD8] bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#E2DFD8] bg-[#E6EEE8] text-sm font-bold text-[#244B50]">
                    {o.logoText}
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#4D5F64]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#7D673A]" aria-hidden />
                  {o.country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#7D673A]" aria-hidden />
                  Deadline {o.deadline}
                </span>
              </div>
              {o.description ? (
                <p className="mt-3 line-clamp-2 text-sm text-[#4D5F64]">{o.description}</p>
              ) : null}
              <p className="mt-3 text-sm font-medium text-[#7D673A]">Tuition: {o.tuitionRange}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={"/apply"}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#244B50] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xs transition hover:bg-[#1D3E42] sm:flex-none"
                >
                  Apply now
                </Link>
                <Link
                  href={"/destinations"}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-[#E2DFD8] bg-white px-5 py-2.5 text-sm font-semibold text-[#244B50] transition hover:bg-[#F8F7F3] sm:flex-none"
                >
                  Details
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
