"use client";

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
  copy = {
    kicker: "Why Europe",
    title: "A continent built for curious minds",
    subtitle:
      "From historic universities to cutting-edge labs, Europe blends academic depth with everyday adventure — trains to new cities on weekends, internships in global firms, and classmates from everywhere.",
    quickFact1Label: "Quick fact",
    quickFact1Value: "4000+ English-taught programs (EU/EEA)",
    quickFact2Label: "Quick fact",
    quickFact2Value: "Schengen mobility for study & travel",
  },
}: {
  copy?: WhyEuropeCopy;
}) {
  const c = {
    kicker: copy?.kicker ?? "GO GLOBAL. THINK BIGGER.",
    title: copy?.title ?? "Your journey shouldn’t be limited by geography.",
    subtitle:
      copy?.subtitle ??
      "The world’s best opportunities are not in one country — they’re everywhere. Studying abroad connects you to global education, international careers, and life-changing experiences that redefine your future.",
    quickFact1Label: copy?.quickFact1Label ?? "Quick fact",
    quickFact1Value: copy?.quickFact1Value ?? "4000+ English-taught programs (EU/EEA)",
    quickFact2Label: copy?.quickFact2Label ?? "Quick fact",
    quickFact2Value: copy?.quickFact2Value ?? "Schengen mobility for study & travel",
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
          <div className="absolute inset-0 bg-[#0a1628]/88" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">{c.kicker}</p>
              <h2
                id="why-europe-heading"
                className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                {c.title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-300">
                {c.subtitle}
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <dt className="text-xs uppercase tracking-wide text-amber-300/90">{c.quickFact1Label}</dt>
                  <dd className="mt-1 text-sm font-medium text-white">{c.quickFact1Value}</dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <dt className="text-xs uppercase tracking-wide text-amber-300/90">{c.quickFact2Label}</dt>
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
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                    <b.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200 sm:text-base">{b.text}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
