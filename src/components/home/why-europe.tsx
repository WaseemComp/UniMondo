"use client";

import { SECTION_DEFAULTS, EUROPE_PARTIAL_DEFAULTS } from "@/lib/homepage/content";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Globe2, Languages, Landmark, Sparkles } from "lucide-react";

const BULLETS = [
  { icon: Globe2, text: "Degrees recognized worldwide — strong mobility after graduation." },
  { icon: Languages, text: "Thousands of English-taught programs beyond the UK." },
  { icon: Landmark, text: "Affordable public options and scholarship ecosystems." },
  { icon: Sparkles, text: "Travel, culture, and networks that shape a global mindset." },
];

export type WhyEuropeCopy = {
  kicker?: string;
  title?: string;
  subtitle?: string;
  quickFact1Label?: string;
  quickFact1Value?: string;
  quickFact2Label?: string;
  quickFact2Value?: string;
};

export function WhyEurope({
  copy = SECTION_DEFAULTS.why_europe,
}: {
  copy?: WhyEuropeCopy;
}) {
  const c = {
    kicker: copy?.kicker ?? EUROPE_PARTIAL_DEFAULTS.kicker,
    title: copy?.title ?? EUROPE_PARTIAL_DEFAULTS.title,
    subtitle:
      copy?.subtitle ?? EUROPE_PARTIAL_DEFAULTS.subtitle,
    quickFact1Label: copy?.quickFact1Label ?? EUROPE_PARTIAL_DEFAULTS.quickFact1Label,
    quickFact1Value: copy?.quickFact1Value ?? EUROPE_PARTIAL_DEFAULTS.quickFact1Value,
    quickFact2Label: copy?.quickFact2Label ?? EUROPE_PARTIAL_DEFAULTS.quickFact2Label,
    quickFact2Value: copy?.quickFact2Value ?? EUROPE_PARTIAL_DEFAULTS.quickFact2Value,
  };
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section aria-labelledby="why-europe-heading" className="py-20 sm:py-28">
      {/* Positioned container for useScroll + parallax (avoids static-position warning) */}
      <div ref={ref} className="relative overflow-hidden">
        <motion.div style={{ y }} className="pointer-events-none absolute inset-0 scale-110">
          <Image
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2400&q=75"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            quality={75}
          />
          <div className="absolute inset-0 bg-[#1A2E3A]/92" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9AB76]">{c.kicker}</p>
              <h2
                id="why-europe-heading"
                className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                {c.title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-[#E6EEE8]/90">
                {c.subtitle}
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <dt className="text-xs uppercase tracking-wide text-[#C9AB76]">{c.quickFact1Label}</dt>
                  <dd className="mt-1 text-sm font-medium text-white">{c.quickFact1Value}</dd>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <dt className="text-xs uppercase tracking-wide text-[#C9AB76]">{c.quickFact2Label}</dt>
                  <dd className="mt-1 text-sm font-medium text-white">{c.quickFact2Value}</dd>
                </div>
              </dl>
            </div>

            <ul className="space-y-4">
              {BULLETS.map((b, i) => (
                <motion.li
                  key={b.text}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#C9AB76]/20 text-[#C9AB76]">
                    <b.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-[#E6EEE8] sm:text-base">{b.text}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
