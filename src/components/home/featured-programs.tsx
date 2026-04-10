"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import type { Opening } from "@/lib/unimondo-data";

type Props = {
  openings: Opening[];
};

export function FeaturedPrograms({ openings }: Props) {
  const featured = openings.slice(0, 4);
  return (
    <section className="relative bg-[#0a1628] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <Image
          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=2000&q=70"
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0a1628]/95 to-[#0a1628]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">Featured programs</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Current openings
            </h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Hand-picked MSc and graduate tracks with clear deadlines and tuition bands.
            </p>
          </div>
          <Link
            href="/current-openings"
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            See all openings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {featured.map((o, i) => (
            <motion.article
              key={o.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                    {o.intake}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
                    {o.programName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{o.university}</p>
                </div>
                {o.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CMS may point to arbitrary hosts
                  <img
                    src={o.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-white/5 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-amber-200">
                    {o.logoText}
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-500/80" aria-hidden />
                  {o.country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-500/80" aria-hidden />
                  Deadline {o.deadline}
                </span>
              </div>
              {o.description ? (
                <p className="mt-3 line-clamp-2 text-sm text-slate-400">{o.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-slate-500">Tuition: {o.tuitionRange}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/apply"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-amber-500 px-5 py-2.5 text-center text-sm font-semibold text-[#0a1628] transition hover:bg-amber-400 sm:flex-none"
                >
                  Apply now
                </Link>
                <Link
                  href="/current-openings"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none"
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
