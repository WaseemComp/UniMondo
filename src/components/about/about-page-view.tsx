import Image from "next/image";
import { Fragment } from "react";
import { AboutPartnersShowcase } from "@/components/about/about-partners-showcase";
import type { AboutPartnerRow, AboutSectionRow, TeamMemberRow } from "@/lib/data/about-page";

type Props = {
  sections: AboutSectionRow[];
  team: TeamMemberRow[];
  partners: AboutPartnerRow[];
};

export function AboutPageView({ sections, team, partners }: Props) {
  if (!sections.length) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-wide text-amber-800/90 uppercase">About</p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[#0a1628]">About UniMondo</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          About content is not available yet. Please run the latest database migrations and configure sections in the admin panel.
        </p>
      </main>
    );
  }

  const aboutUs = sections.find((s) => s.section_key === "about_us");
  const rest = sections.filter((s) => s.section_key !== "about_us");

  return (
    <main className="bg-gradient-to-b from-slate-50 to-white">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[#0a1628]">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <Image
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=70"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] via-[#0a1628]/95 to-[#0a1628]/85" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold tracking-wide text-amber-400/90 uppercase">About</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {aboutUs?.title ?? "About UniMondo"}
          </h1>
          {aboutUs?.body ? (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">{aboutUs.body}</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        {rest.map((s) => (
          <Fragment key={s.section_key}>
            <section className="scroll-mt-24">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628]">{s.title}</h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-[15px]">{s.body}</div>
            </section>
            {s.section_key === "values" && partners.length > 0 ? (
              <AboutPartnersShowcase partners={partners} />
            ) : null}
          </Fragment>
        ))}

        <section className="scroll-mt-24">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628]">Our Team</h2>
          <p className="mt-2 text-sm text-slate-600">
            The counselors and specialists behind your application — approachable, rigorous, and invested in outcomes.
          </p>

          {team.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
              Team profiles will appear here once added in the admin panel.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {team.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex gap-4 p-5">
                    {m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- CMS URLs may be arbitrary hosts
                      <img
                        src={m.image_url}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-amber-400/25"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#0a1628] text-lg font-semibold text-amber-300">
                        {m.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">{m.name}</h3>
                      {m.qualification ? (
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-800/90">{m.qualification}</p>
                      ) : null}
                    </div>
                  </div>
                  {m.bio ? <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-700">{m.bio}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
