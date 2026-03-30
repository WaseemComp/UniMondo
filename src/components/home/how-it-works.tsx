"use client";

import { motion } from "framer-motion";
import { BookOpen, ClipboardCheck, FileText, GraduationCap, Plane } from "lucide-react";

const STEPS = [
  {
    icon: BookOpen,
    title: "Free consultation",
    desc: "We map your goals, academic record, and budget in a structured discovery call.",
  },
  {
    icon: GraduationCap,
    title: "Program shortlisting",
    desc: "Receive a curated list of programs and intakes aligned with your profile.",
  },
  {
    icon: ClipboardCheck,
    title: "Application support",
    desc: "Documents, motivation letters, and portal submissions with counselor review.",
  },
  {
    icon: FileText,
    title: "Visa preparation",
    desc: "Finance proofs, insurance, embassy prep, and mock interviews where needed.",
  },
  {
    icon: Plane,
    title: "Pre-departure",
    desc: "Housing tips, travel checklist, and what to expect in your first weeks abroad.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a1628]/70">Process</p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[#0a1628] sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-slate-600">Five clear stages — transparent, documented, and built around your timeline.</p>
        </div>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute left-[22px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/60 via-amber-400/30 to-transparent sm:left-7" aria-hidden />
          <ul className="space-y-10">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.07 }}
                className="relative flex gap-5 sm:gap-8"
              >
                <div className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-white text-amber-700 shadow-sm sm:h-14 sm:w-14">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Step {i + 1}</span>
                  <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628] sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
