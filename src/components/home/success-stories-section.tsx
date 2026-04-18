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
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Success stories</p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[#0a1628] sm:text-4xl">
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
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80 p-8 shadow-xl shadow-slate-200/50 sm:p-10"
            >
              <Quote className="absolute right-8 top-8 h-16 w-16 text-amber-500/15" aria-hidden />
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full ring-4 ring-amber-500/20 md:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- CMS may use arbitrary image hosts */}
                  <img src={s.profile_image_url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">&ldquo;{s.testimonial}&rdquo;</p>
                  <p className="mt-6 font-semibold text-[#0a1628]">{s.full_name}</p>
                  {roleLine ? <p className="text-sm text-slate-600">{roleLine}</p> : null}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {stories.length > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={prev}
                className="rounded-full border border-slate-200 bg-white p-2 text-[#0a1628] shadow-sm transition hover:bg-slate-50"
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
                    className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-amber-500" : "w-2 bg-slate-300"}`}
                    aria-label={`Story ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="rounded-full border border-slate-200 bg-white p-2 text-[#0a1628] shadow-sm transition hover:bg-slate-50"
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
