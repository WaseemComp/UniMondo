"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HeroSlide = {
  src: string;
  alt: string;
  line: string;
  isActive?: boolean;
  title?: string;
  subtitle?: string;
  ctaExplore?: string;
  ctaApply?: string;
};

const SLIDES: HeroSlide[] = [
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
    ctaExplore: "Universities",
    ctaApply: "Begin Your Application",
  },
  slides,
}: {
  copy?: HeroCopy;
  slides?: HeroSlide[];
}) {
  const activeSlides = (slides ?? SLIDES).filter((s) => s && (s as HeroSlide).isActive !== false);
  const normalizedSlides = activeSlides.length ? activeSlides : SLIDES;
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % normalizedSlides.length), [normalizedSlides.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + normalizedSlides.length) % normalizedSlides.length),
    [normalizedSlides.length],
  );

  useEffect(() => {
    const t = setInterval(next, INTERVAL_MS);
    return () => clearInterval(t);
  }, [next]);

  const slide = normalizedSlides[index];
  const effectiveCopy: HeroCopy = {
    title: slide.title ?? copy.title,
    subtitle: slide.subtitle ?? copy.subtitle,
    ctaExplore: slide.ctaExplore ?? copy.ctaExplore,
    ctaApply: slide.ctaApply ?? copy.ctaApply,
  };

  return (
    <section className="relative min-h-[100svh] min-h-[100dvh] w-full overflow-hidden bg-[#1A2E3A]">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E3A] via-[#1A2E3A]/70 to-[#1A2E3A]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A2E3A]/85 via-transparent to-[#1A2E3A]/45" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100svh] min-h-[100dvh] flex-col justify-end pb-24 pt-24 sm:pb-32 sm:justify-center sm:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9AB76]">
              UNIMONDO · EUROPEAN ADMISSIONS CONSULTANCY
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-4xl font-normal leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {effectiveCopy.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#E6EEE8]/95 sm:text-xl">{effectiveCopy.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/destinations"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#C9AB76] px-8 py-3.5 text-sm font-semibold text-[#1A2E3A] shadow-lg shadow-black/20 transition hover:bg-[#B8996A] sm:w-auto"
                >
                  {effectiveCopy.ctaExplore}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/apply"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
                >
                  {effectiveCopy.ctaApply}
                </Link>
              </motion.div>
            </div>
            <p className="mt-6 text-sm text-[#E6EEE8]/80">{slide.line}</p>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 sm:bottom-10">
        <button
          type="button"
          onClick={prev}
          className="rounded-lg border border-white/20 bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {normalizedSlides.map((_, i) => (
            <button
              key={_.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-[#C9AB76]" : "w-2 bg-white/40 hover:bg-white/60"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="rounded-lg border border-white/20 bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
