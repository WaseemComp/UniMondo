"use client";

import { motion, useInView } from "framer-motion";
import { BarChart3, HeartHandshake, Plane, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Personalized Matching",
    body: "Shortlists aligned to your GPA, language scores, budget, and intake timing.",
  },
  {
    icon: ShieldCheck,
    title: "Expert Visa Support",
    body: "Document packs, embassy prep, and finance checks that reduce surprises.",
  },
  {
    icon: Trophy,
    title: "High Success Rate",
    body: "Structured processes that keep applications on track across institutions.",
  },
  {
    icon: HeartHandshake,
    title: "Full Student Care",
    body: "Counselor follow-ups, tracking IDs, and reminders at every milestone.",
  },
  {
    icon: Plane,
    title: "Pre-Departure Ready",
    body: "Housing tips, insurance guidance, and arrival checklists for your new city.",
  },
  {
    icon: BarChart3,
    title: "Transparent Progress",
    body: "Clear timelines so you always know what comes next in your journey.",
  },
] as const;

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div ref={ref} className="rounded-2xl border border-amber-500/15 bg-[#0b1830]/80 px-5 py-6 text-center backdrop-blur-sm">
      <p className="font-[family-name:var(--font-heading)] text-4xl font-semibold text-amber-400 md:text-5xl">
        {n}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function WhyUniMondo() {
  return (
    <section className="relative overflow-hidden bg-[#060f1f] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.12),transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">Why UniMondo</p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built for ambitious students who expect clarity
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
            We combine European admissions know-how with human support — so you can focus on your future, not the
            paperwork maze.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 backdrop-blur-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 transition group-hover:bg-amber-500/25">
                <f.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <AnimatedStat value={150} suffix="+" label="Students guided to Europe" />
          <AnimatedStat value={95} suffix="%" label="Visa success (rolling cohort)" />
          <AnimatedStat value={12} suffix="+" label="Destination countries" />
        </div>
      </div>
    </section>
  );
}
