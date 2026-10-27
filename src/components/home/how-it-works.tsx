"use client";

import { SECTION_DEFAULTS } from "@/lib/homepage/content";
const DEFAULT_COPY = SECTION_DEFAULTS.how_it_works;

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

export type HowItWorksCopy = {
  kicker?: string;
  title?: string;
  subtitle?: string;
};

export function HowItWorks({
  copy = DEFAULT_COPY,
}: {
  copy?: HowItWorksCopy;
}) {
  const c = {
    kicker: copy?.kicker ?? DEFAULT_COPY.kicker,
    title: copy?.title ?? DEFAULT_COPY.title,
    subtitle: copy?.subtitle ?? DEFAULT_COPY.subtitle,
  };
  return (
    <section className="border-y border-[#E2DFD8] bg-[#F8F7F3] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D673A]">{c.kicker}</p>
          <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#26343B] sm:text-4xl">
            {c.title}
          </h2>
          <p className="mt-4 text-[#4D5F64] leading-relaxed">{c.subtitle}</p>
        </div>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute left-[22px] top-2 bottom-2 w-px bg-gradient-to-b from-[#244B50] via-[#C9AB76]/60 to-transparent sm:left-7" aria-hidden />
          <ul className="space-y-8">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
                className="relative flex gap-5 sm:gap-7"
              >
                <div className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2DFD8] bg-white text-[#244B50] shadow-xs sm:h-14 sm:w-14">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="flex-1 rounded-xl border border-[#E2DFD8] bg-white p-5 shadow-sm sm:p-6 transition hover:shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7D673A]">Stage {i + 1}</span>
                  <h3 className="mt-1 font-[family-name:var(--font-editorial)] text-xl font-bold text-[#26343B] sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4D5F64]">{step.desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
