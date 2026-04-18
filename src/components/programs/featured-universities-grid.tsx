"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { FeaturedUniversity } from "@/lib/featured-universities";

type Props = {
  universities: FeaturedUniversity[];
  /** First N cards use `priority` on hero images for LCP when above the fold. */
  eagerHeroCount?: number;
};

function allowNextImageOptimization(src: string) {
  try {
    const u = new URL(src);
    return u.hostname === "images.unsplash.com" || u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function applyHref(uni: FeaturedUniversity) {
  const program = uni.applyProgramSummary?.trim() || `${uni.name} — flagship programs`;
  return `/apply?country=${encodeURIComponent(uni.country)}&program=${encodeURIComponent(program)}`;
}

export function FeaturedUniversitiesGrid({ universities, eagerHeroCount = 3 }: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {universities.map((uni, i) => (
        <motion.article
          key={uni.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: i * 0.06 }}
          whileHover={{ y: -4 }}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-md shadow-zinc-900/5 transition-[box-shadow,border-color] duration-300 hover:border-amber-300/50 hover:shadow-xl hover:shadow-amber-900/10"
        >
          <div className="relative aspect-[16/11] w-full overflow-hidden">
            <Image
              src={uni.imageSrc}
              alt={uni.imageAlt}
              fill
              priority={i < eagerHeroCount}
              unoptimized={!allowNextImageOptimization(uni.imageSrc)}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/88 via-[#0a1628]/25 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {uni.logoUrl ? (
                  <span
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"
                    aria-hidden
                  >
                    <Image
                      src={uni.logoUrl}
                      alt=""
                      fill
                      unoptimized={!allowNextImageOptimization(uni.logoUrl)}
                      className="object-cover"
                      sizes="48px"
                    />
                  </span>
                ) : (
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-xs font-bold tracking-tight text-white backdrop-blur-md"
                    aria-hidden
                  >
                    {uni.logoInitials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-[family-name:var(--font-heading)] text-base font-semibold leading-tight text-white drop-shadow-sm">
                    <span className="mr-1.5" aria-hidden>
                      {uni.flagEmoji}
                    </span>
                    {uni.name}
                  </p>
                  <p className="text-xs font-medium text-amber-200/95">{uni.country}</p>
                </div>
              </div>
              {uni.qsLabel ? (
                <span className="shrink-0 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0a1628] shadow-sm">
                  {uni.qsLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5 pt-4">
            <p className="text-sm leading-relaxed text-zinc-600">{uni.prestigeLine}</p>

            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Flagship programs</p>
              <ul className="space-y-2">
                {uni.programs.map((p) => (
                  <li key={p.name} className="flex flex-col gap-0.5 rounded-lg bg-zinc-50/80 px-3 py-2 text-sm">
                    <span className="font-medium text-zinc-900">{p.name}</span>
                    <span className="text-xs text-zinc-500">{p.tuitionRange}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="#program-results"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0a1628] transition hover:border-amber-400 hover:bg-amber-50/50"
              >
                Explore all programs
              </Link>
              <Link
                href={applyHref(uni)}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-[#0a1628] shadow-sm transition hover:bg-amber-400"
              >
                Apply now
              </Link>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
