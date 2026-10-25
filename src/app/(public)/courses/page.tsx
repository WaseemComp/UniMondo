import type { Metadata } from "next";
import { coursesPageCopy } from "@/lib/site-copy";

export const metadata: Metadata = {
  title: "Language Preparation Courses | UniMondo",
  description:
    "Master IELTS, TOEFL, German (Goethe/TestDaF), Italian, and French with UniMondo's dedicated exam preparation and embassy interview coaching.",
  alternates: {
    canonical: "/courses",
  },
};


export default function CoursesPage() {
  const t = coursesPageCopy;

  return (
    <main className="min-w-0 bg-[#F8F7F3]">
      <section className="border-b border-[#E2DFD8] bg-[#1A2E3A] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9AB76]">{t.kicker}</p>
          <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">{t.heroSubtitle}</p>
          <div className="mt-6 flex justify-center">
            <a
              href="/apply?type=language_course"
              className="inline-flex rounded-full bg-[#C9AB76] px-6 py-3 text-sm font-semibold text-[#1A2E3A] shadow-md shadow-[#C9AB76]/20 transition hover:bg-[#d4b986]"
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
          <div className="rounded-2xl border border-[#E2DFD8] bg-white p-8 shadow-sm">
            <h2 className="font-[family-name:var(--font-editorial)] text-2xl font-normal text-[#244B50]">{t.whyTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#4D5F64]">{t.whyText}</p>
            <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-[#4D5F64]">
              {t.whyPoints.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#E2DFD8] bg-white p-8 shadow-sm">
            <h2 className="font-[family-name:var(--font-editorial)] text-2xl font-normal text-[#244B50]">{t.howTitle}</h2>
            {t.howIntro ? <p className="mt-3 text-sm leading-6 text-[#4D5F64]">{t.howIntro}</p> : null}
            <ol className="mt-5 space-y-3 text-sm text-[#4D5F64]">
              {t.howSteps.map((step, i) => (
                <li key={step}>
                  <span className="font-semibold text-[#244B50]">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-[#C9AB76]/40 bg-[#E6EEE8] p-8 text-center shadow-sm">
          <h2 className="font-[family-name:var(--font-editorial)] text-2xl font-normal text-[#244B50] sm:text-3xl">{t.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#4D5F64]">{t.finalText}</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-[#244B50]">{t.businessLine}</p>
          <div className="mt-6 flex justify-center">
            <a
              href="/apply?type=language_course"
              className="inline-flex rounded-full bg-[#244B50] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1D3E42]"
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
    <article className="flex flex-col justify-between rounded-2xl border border-[#E2DFD8] bg-white p-6 shadow-sm transition hover:shadow-md">
      <div>
        <h3 className="font-[family-name:var(--font-editorial)] text-2xl font-normal text-[#244B50]">{t.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#4D5F64]">{t.description}</p>
        <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-[#4D5F64]">
          {t.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
      <div className="mt-6 pt-4 border-t border-[#E2DFD8]">
        <a
          href={href}
          className="inline-flex rounded-full bg-[#244B50] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1D3E42]"
        >
          {t.button}
        </a>
      </div>
    </article>
  );
}

