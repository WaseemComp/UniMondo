"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SuccessStoryRow } from "@/lib/data/success-stories";

type Props = {
  stories: SuccessStoryRow[];
};

const AUTO_MS = 7000;

/** CMS-driven block styled like the original “Testimonials” / success stories section (single rotating story). */
export function SuccessStoriesSection({ stories }: Props) {
  const [i, setI] = useState(0);

  const next = useCallback(() => setI((x) => (x + 1) % stories.length), [stories.length]);
  const prev = useCallback(() => setI((x) => (x - 1 + stories.length) % stories.length), [stories.length]);

  useEffect(() => {
    if (stories.length <= 1) return;
    const t = setInterval(next, AUTO_MS);
    return () => clearInterval(t);
  }, [next, stories.length]);

  if (!stories.length) return null;

  const s = stories[i]!;
  const roleLine = [s.program, s.university].filter(Boolean).join(" · ");

  return (
    <section className="bg-white py-20 sm:py-28 border-b border-[#E2DFD8]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D673A]">Success stories</p>
          <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#26343B] sm:text-4xl">
            Students who crossed borders with us
          </h2>
        </div>

        <div className="relative mx-auto mt-14 max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-2xl border border-[#E2DFD8] bg-[#F8F7F3] p-8 shadow-sm sm:p-10"
            >
              <Quote className="absolute right-8 top-8 h-16 w-16 text-[#C9AB76]/25" aria-hidden />
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-[#C9AB76]/50 md:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- CMS may use arbitrary image hosts */}
                  <img src={s.profile_image_url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="font-[family-name:var(--font-editorial)] text-xl italic leading-relaxed text-[#26343B] sm:text-2xl">
                    &ldquo;{s.testimonial}&rdquo;
                  </p>
                  <p className="mt-5 font-semibold text-[#244B50]">{s.full_name}</p>
                  {roleLine ? <p className="text-sm text-[#4D5F64]">{roleLine}</p> : null}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {stories.length > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={prev}
                className="rounded-lg border border-[#E2DFD8] bg-white p-2 text-[#244B50] shadow-2xs transition hover:bg-[#F8F7F3]"
                aria-label="Previous story"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {stories.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setI(idx)}
                    className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-[#244B50]" : "w-2 bg-[#E2DFD8]"}`}
                    aria-label={`Story ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="rounded-lg border border-[#E2DFD8] bg-white p-2 text-[#244B50] shadow-2xs transition hover:bg-[#F8F7F3]"
                aria-label="Next story"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
