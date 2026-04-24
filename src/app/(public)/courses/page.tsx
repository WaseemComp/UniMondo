import { coursesPageCopy } from "@/lib/site-copy";

export default function CoursesPage() {
  const t = coursesPageCopy;

  return (
    <main className="min-w-0 bg-zinc-50/80">
      <section className="border-b border-white/10 bg-[#0a1628] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">{t.kicker}</p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">{t.heroSubtitle}</p>
          <div className="mt-6 flex justify-center">
            <a
              href="/apply?type=language_course"
              className="inline-flex rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-[#0a1628] shadow-md shadow-amber-500/20 transition hover:bg-amber-400"
            >
              {t.heroCta}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <CourseCard courseKey="ielts" href="/apply?type=language_course&course=ielts_toefl" />
          <CourseCard courseKey="german" href="/apply?type=language_course&course=german" />
          <CourseCard courseKey="italianFrench" href="/apply?type=language_course&course=italian_french" />
        </div>

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">{t.whyTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{t.whyText}</p>
            <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-zinc-700">
              {t.whyPoints.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">{t.howTitle}</h2>
            {t.howIntro ? <p className="mt-3 text-sm leading-6 text-zinc-700">{t.howIntro}</p> : null}
            <ol className="mt-5 space-y-3 text-sm text-zinc-700">
              {t.howSteps.map((step, i) => (
                <li key={step}>
                  <span className="font-semibold text-zinc-900">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-[#0a1628]">{t.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-amber-950">{t.finalText}</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-amber-900">{t.businessLine}</p>
          <div className="mt-6 flex justify-center">
            <a
              href="/apply?type=language_course"
              className="inline-flex rounded-full bg-[#0a1628] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a1628]/90"
            >
              {t.finalCta}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function CourseCard({
  courseKey,
  href,
}: {
  courseKey: "ielts" | "german" | "italianFrench";
  href: string;
}) {
  const t = coursesPageCopy.cards[courseKey];
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">{t.title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{t.description}</p>
      <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-zinc-700">
        {t.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <div className="mt-6">
        <a
          href={href}
          className="inline-flex rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-[#0a1628] hover:bg-amber-400"
        >
          {t.button}
        </a>
      </div>
    </article>
  );
}
