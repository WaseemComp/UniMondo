import Image from "next/image";
import { Fragment } from "react";
import { AboutPartnersShowcase } from "@/components/about/about-partners-showcase";
import { AboutTeamShowcase } from "@/components/about/about-team-showcase";
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
    <main className="bg-[#F4F3EF]">
      <div className="relative overflow-hidden border-b border-[#D9E2E8] bg-[#F4F3EF]">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=70"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[#244B50]/10" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="um-photo-panel"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#244B50]">About UniMondo</p>
          <h1 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl font-bold tracking-tight text-[#2F3E46] sm:text-4xl lg:text-5xl">
            {aboutUs?.title ?? "About UniMondo"}
          </h1>
          {aboutUs?.body ? (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#2F3E46] sm:text-base">{aboutUs.body}</p>
          ) : null}</div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        {rest.map((s) => (
          <Fragment key={s.section_key}>
            <section className="scroll-mt-24 rounded-xl border border-[#D9E2E8] bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-[family-name:var(--font-editorial)] text-2xl font-bold text-[#2F3E46] sm:text-3xl">{s.title}</h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#4D5F64] sm:text-[15px]">{s.body}</div>
            </section>
            {s.section_key === "values" && partners.length > 0 ? (
              <AboutPartnersShowcase partners={partners} />
            ) : null}
          </Fragment>
        ))}

        {team.length === 0 ? (
          <section className="scroll-mt-24 rounded-xl border border-[#D9E2E8] bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-[family-name:var(--font-editorial)] text-2xl font-bold text-[#2F3E46] sm:text-3xl">Our Team</h2>
            <p className="mt-2 text-sm text-[#4D5F64]">
              The counselors and specialists behind your application — approachable, rigorous, and invested in outcomes.
            </p>
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
              Team profiles will appear here once added in the admin panel.
            </p>
          </section>
        ) : (
          <AboutTeamShowcase team={team} />
        )}
      </div>
    </main>
  );
}
