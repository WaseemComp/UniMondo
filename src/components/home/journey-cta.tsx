"use client";

import { SECTION_DEFAULTS } from "@/lib/homepage/content";
const DEFAULT_COPY = SECTION_DEFAULTS.journey_cta;

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

export type JourneyCtaCopy = {
  kicker?: string;
  title?: string;
  description?: string;
  buttonText?: string;
};

export function JourneyCta({
  copy = DEFAULT_COPY,
}: {
  copy?: JourneyCtaCopy;
}) {
  const c = {
    kicker: copy?.kicker ?? DEFAULT_COPY.kicker,
    title: copy?.title ?? DEFAULT_COPY.title,
    description:
      copy?.description ?? DEFAULT_COPY.description,
    buttonText: copy?.buttonText ?? DEFAULT_COPY.buttonText,
  };
  const [gpa, setGpa] = useState("");
  const [ielts, setIelts] = useState("");

  const applyHref = useMemo(() => {
    const q = new URLSearchParams();
    if (gpa.trim()) q.set("gpa", gpa.trim());
    if (ielts.trim()) q.set("ielts", ielts.trim());
    const s = q.toString();
    return s ? `/apply?${s}` : "/apply";
  }, [gpa, ielts]);

  return (
    <section id="eligibility" className="bg-[#F8F7F3] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-[#1D3E42] bg-[#244B50] px-6 py-12 shadow-xl sm:px-10 sm:py-14"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C9AB76]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9AB76]">{c.kicker}</p>
            <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.title}
            </h2>
            <p className="mt-4 text-[#E6EEE8]/90">{c.description}</p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <label className="sr-only" htmlFor="gpa-field">
                GPA (4.0 scale)
              </label>
              <input
                id="gpa-field"
                type="text"
                inputMode="decimal"
                placeholder="GPA (e.g. 3.4)"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-[#C9AB76] focus:outline-none focus:ring-2 focus:ring-[#C9AB76]/40 sm:max-w-[200px]"
              />
              <label className="sr-only" htmlFor="ielts-field">
                IELTS overall
              </label>
              <input
                id="ielts-field"
                type="text"
                inputMode="decimal"
                placeholder="IELTS (e.g. 7.0)"
                value={ielts}
                onChange={(e) => setIelts(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-[#C9AB76] focus:outline-none focus:ring-2 focus:ring-[#C9AB76]/40 sm:max-w-[200px]"
              />
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
              <Link
                href={applyHref}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C9AB76] px-8 py-3.5 text-base font-semibold text-[#1A2E3A] shadow-md shadow-black/20 transition hover:bg-[#B8996A]"
              >
                {c.buttonText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
            <p className="mt-4 text-xs text-[#E6EEE8]/70">
              No payment required to start · Your data is used only for counseling coordination.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
