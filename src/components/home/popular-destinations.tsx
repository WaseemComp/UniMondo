"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const FLAG: Record<string, string> = {
  Italy: "🇮🇹",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Netherlands: "🇳🇱",
  Spain: "🇪🇸",
  Poland: "🇵🇱",
};

const DESTINATIONS = [
  {
    country: "Italy",
    blurb: "Historic universities, design & engineering excellence, vibrant student cities.",
    img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
  },
  {
    country: "Germany",
    blurb: "Research-led degrees, strong industry ties, and accessible public tuition.",
    img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    country: "France",
    blurb: "Global rankings, innovation hubs, and pathways in business & arts.",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  },
  {
    country: "Netherlands",
    blurb: "English-taught programs, practical learning, and international classrooms.",
    img: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80",
  },
  {
    country: "Spain",
    blurb: "Sunlit campuses, strong hospitality & tech scenes, lower living costs.",
    img: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80",
  },
  {
    country: "Poland",
    blurb: "Fast-growing hubs, affordable living, and quality STEM & business tracks.",
    img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

export function PopularDestinations() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a1628]/70">Destinations</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[#0a1628] sm:text-4xl">
              Popular countries we cover
            </h2>
            <p className="mt-3 max-w-xl text-slate-600">
              From Mediterranean campuses to Nordic innovation — find where your profile fits best.
            </p>
          </div>
          <Link
            href={"/destinations"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-600"
          >
            View all countries
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 flex gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {DESTINATIONS.map((d, i) => (
            <motion.article
              key={d.country}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="relative min-w-[280px] flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:min-w-0"
            >
              <div className="relative aspect-[16/11] w-full">
                <Image
                  src={d.img}
                  alt={`${d.country} — European study destination`}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 85vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-[#0a1628]/20 to-transparent" />
                <span className="absolute left-4 top-4 text-3xl drop-shadow-md" role="img" aria-hidden>
                  {FLAG[d.country]}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-white">{d.country}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-200">{d.blurb}</p>
                  <Link
                    href={"/destinations"}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Explore programs
                    <ArrowRight className="h-4 w-4" />
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
