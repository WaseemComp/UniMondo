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

export type WhyUniMondoStat = { value: number; suffix?: string; label: string };

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(value);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  if (!value || value <= 0) return null;

  return (
    <div ref={ref} className="rounded-xl border border-[#E2DFD8] bg-white px-6 py-6 text-center shadow-sm">
      <p className="font-[family-name:var(--font-editorial)] text-4xl font-bold text-[#244B50] md:text-5xl">
        {n}
        <span className="text-[#8A7345]">{suffix}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-[#4D5F64]">{label}</p>
    </div>
  );
}

export function WhyUniMondo({
  kicker = "Why UniMondo",
  title = "Built for ambitious students who expect clarity",
  subtitle = "We combine European admissions know-how with human support — so you can focus on your future, not the paperwork maze.",
  stats = [],
}: {
  kicker?: string;
  title?: string;
  subtitle?: string;
  stats?: WhyUniMondoStat[];
}) {
  const validStats = (stats || []).filter((s) => s && typeof s.value === "number" && s.value > 0);


  return (
    <section className="relative overflow-hidden bg-[#E6EEE8]/40 py-20 sm:py-28 border-y border-[#E2DFD8]/70">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D673A]">{kicker}</p>
          <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#26343B] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#4D5F64] sm:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="group rounded-xl border border-[#E2DFD8] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#244B50]/10 text-[#244B50] transition group-hover:bg-[#244B50]/15">
                <f.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#26343B]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4D5F64]">{f.body}</p>
            </motion.article>
          ))}
        </div>

        {validStats.length > 0 ? (
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {validStats.slice(0, 3).map((s) => (
              <AnimatedStat key={s.label} value={s.value} suffix={s.suffix ?? ""} label={s.label} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
