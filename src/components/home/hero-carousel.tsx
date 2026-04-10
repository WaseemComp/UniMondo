"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=2400&q=80",
    alt: "Historic Italian architecture and canals",
    line: "Italy · World-class universities & timeless culture",
  },
  {
    src: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=2400&q=85",
    alt: "Munich cityscape with Frauenkirche",
    line: "Germany · Research powerhouses & industry links",
  },
  {
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2400&q=85",
    alt: "Eiffel Tower Paris skyline",
    line: "France · Prestige, innovation & global networks",
  },
  {
    src: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=2400&q=85",
    alt: "Amsterdam canals",
    line: "Netherlands · English-taught excellence",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2400&q=85",
    alt: "International students collaborating",
    line: "Your cohort · Ambitious peers from every continent",
  },
] as const;

const INTERVAL_MS = 6500;

export type HeroCopy = {
  title: string;
  subtitle: string;
  ctaExplore: string;
  ctaApply: string;
};

export function HeroCarousel({
  copy = {
    title: "Your Future Knows No Borders",
    subtitle:
      "Personalized admissions guidance, visa expertise, and full student support — from first call to campus arrival.",
    ctaExplore: "Explore Programs",
    ctaApply: "Begin Your Application",
  },
}: {
  copy?: HeroCopy;
}) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(next, INTERVAL_MS);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[index];

  return (
    <section className="relative min-h-[100svh] min-h-[100dvh] w-full overflow-hidden bg-[#050d1a]">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            className="object-cover"
            sizes="100vw"
            quality={75}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-[#0a1628]/75 to-[#0a1628]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050d1a]/90 via-transparent to-[#050d1a]/50" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100svh] min-h-[100dvh] flex-col justify-end pb-24 pt-24 sm:pb-32 sm:justify-center sm:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/95">
              UniMondo · Study in Europe
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200/95 sm:text-xl">{copy.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/current-openings"
                  className="inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-8 py-3.5 text-sm font-semibold text-[#0a1628] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 sm:w-auto"
                >
                  {copy.ctaExplore}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/apply"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 sm:w-auto"
                >
                  {copy.ctaApply}
                </Link>
              </motion.div>
            </div>
            <p className="mt-6 text-sm text-slate-300/90">{slide.line}</p>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 sm:bottom-10">
        <button
          type="button"
          onClick={prev}
          className="rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={_.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-amber-400" : "w-2 bg-white/40 hover:bg-white/60"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
