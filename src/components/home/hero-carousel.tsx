"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DEFAULT_HERO_SLIDES, HERO_DEFAULTS, type HeroCopy, type HeroSlide } from "@/lib/homepage/content";
export type { HeroCopy, HeroSlide } from "@/lib/homepage/content";

const INTERVAL_MS = 6500;

export function HeroCarousel({
  copy = HERO_DEFAULTS,
  slides,
  preview = false,
}: {
  copy?: HeroCopy;
  slides?: HeroSlide[];
  preview?: boolean;
}) {
  const activeSlides = (slides ?? DEFAULT_HERO_SLIDES).filter((s) => s && (s as HeroSlide).isActive !== false);
  const normalizedSlides = activeSlides.length ? activeSlides : DEFAULT_HERO_SLIDES;
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % normalizedSlides.length), [normalizedSlides.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + normalizedSlides.length) % normalizedSlides.length),
    [normalizedSlides.length],
  );

  useEffect(() => {
    if (preview) return;
    const t = setInterval(next, INTERVAL_MS);
    return () => clearInterval(t);
  }, [next, preview]);

  const slide = normalizedSlides[index % normalizedSlides.length];
  const effectiveCopy: HeroCopy = {
    title: slide.title ?? copy.title,
    subtitle: slide.subtitle ?? copy.subtitle,
    ctaExplore: slide.ctaExplore ?? copy.ctaExplore,
    ctaApply: slide.ctaApply ?? copy.ctaApply,
  };

  return (
    <section className="relative min-h-[100svh] min-h-[100dvh] w-full overflow-hidden bg-[#F4F3EF]">
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
      <div className="absolute inset-0 bg-[#244B50]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#F4F3EF]/40 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100svh] min-h-[100dvh] flex-col justify-end pb-24 pt-24 sm:pb-32 sm:justify-center sm:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="um-hero-copy max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#244B50]">
              {slide.eyebrow ?? copy.eyebrow ?? HERO_DEFAULTS.eyebrow}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-4xl font-normal leading-[1.08] tracking-tight text-[#2F3E46] sm:text-5xl md:text-6xl lg:text-7xl">
              {effectiveCopy.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#2F3E46] sm:text-xl">{effectiveCopy.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={slide.primaryHref ?? copy.primaryHref ?? HERO_DEFAULTS.primaryHref}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#244B50] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D3E42] sm:w-auto"
                >
                  {effectiveCopy.ctaExplore}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={slide.secondaryHref ?? copy.secondaryHref ?? HERO_DEFAULTS.secondaryHref}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-[#244B50]/30 bg-white px-8 py-3.5 text-sm font-semibold text-[#244B50] transition hover:bg-[#E4F1F7] sm:w-auto"
                >
                  {effectiveCopy.ctaApply}
                </Link>
              </motion.div>
            </div>
            <p className="mt-6 text-sm text-[#4D5F64]">{slide.line}</p>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 sm:bottom-10">
        <button
          type="button"
          onClick={prev}
          className="rounded-lg border border-[#D9E2E8] bg-[#F4F3EF]/95 p-2 text-[#244B50] transition hover:bg-white"
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
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-[#244B50]" : "w-2 bg-white border border-[#244B50] hover:bg-[#E4F1F7]"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="rounded-lg border border-[#D9E2E8] bg-[#F4F3EF]/95 p-2 text-[#244B50] transition hover:bg-white"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
