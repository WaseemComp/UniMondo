"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORIES = [
  {
    quote:
      "UniMondo helped me shortlist realistic programs in Germany and prepared every visa document. I’m now at TU Munich.",
    name: "Ayesha K.",
    role: "MSc Artificial Intelligence",
    uni: "TU Munich",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  },
  {
    quote:
      "The timeline was crystal clear. From IELTS planning to the embassy interview, I always knew the next step.",
    name: "Omar H.",
    role: "MSc Data Science",
    uni: "University of Bologna",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  },
  {
    quote:
      "I appreciated how honest they were about fit — not pushing random schools, only programs that matched my GPA.",
    name: "Giulia M.",
    role: "MSc Design",
    uni: "Politecnico di Milano",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
  },
] as const;

const AUTO_MS = 7000;

export function Testimonials() {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((x) => (x + 1) % STORIES.length), []);
  const prev = useCallback(() => setI((x) => (x - 1 + STORIES.length) % STORIES.length), []);

  useEffect(() => {
    const t = setInterval(next, AUTO_MS);
    return () => clearInterval(t);
  }, [next]);

  const s = STORIES[i];

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
              key={s.name}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80 p-8 shadow-xl shadow-slate-200/50 sm:p-10"
            >
              <Quote className="absolute right-8 top-8 h-16 w-16 text-amber-500/15" aria-hidden />
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full ring-4 ring-amber-500/20 md:mx-0">
                  <Image src={s.img} alt={`${s.name}, UniMondo student`} fill className="object-cover" sizes="112px" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">&ldquo;{s.quote}&rdquo;</p>
                  <p className="mt-6 font-semibold text-[#0a1628]">{s.name}</p>
                  <p className="text-sm text-slate-600">
                    {s.role} · {s.uni}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              className="rounded-full border border-slate-200 bg-white p-2 text-[#0a1628] shadow-sm transition hover:bg-slate-50"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {STORIES.map((_, idx) => (
                <button
                  key={_.name}
                  type="button"
                  onClick={() => setI(idx)}
                  className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-amber-500" : "w-2 bg-slate-300"}`}
                  aria-label={`Testimonial ${idx + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-full border border-slate-200 bg-white p-2 text-[#0a1628] shadow-sm transition hover:bg-slate-50"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
