import Link from "next/link";
import { HomeHero } from "@/components/home-hero";
import { OpeningsPreview } from "@/components/openings-preview";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <HomeHero />

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Acceptance Pathways</p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900">Program Match Strategy</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Personalized university shortlisting aligned with your GPA, language scores, and intake timing.
          </p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Visa Support</p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900">From Offer to Embassy</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Structured pre-visa preparation, finance checks, and document readiness for smoother approvals.
          </p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Student Care</p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900">Application Tracking</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Transparent progress updates with a tracking ID and counselor follow-ups at every milestone.
          </p>
        </article>
      </section>

      <OpeningsPreview />

      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-zinc-900">Ready to apply?</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700">
          Start your 5-step UniMondo application and get an instant eligibility tag based on your GPA and IELTS profile.
        </p>
        <Link
          href="/apply"
          className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          Begin Application
        </Link>
      </section>
    </main>
  );
}
