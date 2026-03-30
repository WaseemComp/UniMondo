"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

export function JourneyCta() {
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
    <section id="eligibility" className="bg-gradient-to-b from-slate-50 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[#0a1628] px-6 py-12 shadow-2xl shadow-slate-300/50 sm:px-10 sm:py-14"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">Ready when you are</p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Begin your journey to Europe
            </h2>
            <p className="mt-4 text-slate-300">
              Drop your GPA and IELTS — we&apos;ll carry these into your application flow so you skip retyping them.
            </p>

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
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:max-w-[200px]"
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
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:max-w-[200px]"
              />
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
              <Link
                href={applyHref}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-8 py-4 text-base font-semibold text-[#0a1628] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
              >
                Start 5-step application
                <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
            <p className="mt-4 text-xs text-slate-500">
              No payment required to start · Your data is used only for counseling coordination.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
