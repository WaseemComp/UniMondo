"use client";

import { useCallback, useId, useState } from "react";
import { User } from "lucide-react";
import { CenteredModal } from "@/components/ui/centered-modal";
import type { TeamMemberRow } from "@/lib/data/about-page";
import { cn } from "@/lib/utils";

type Props = {
  team: TeamMemberRow[];
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AboutTeamShowcase({ team }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const onClose = useCallback(() => setOpenId(null), []);
  const modalTitleId = useId();
  if (!team.length) return null;

  const useMarquee = team.length > 1;
  const loop = useMarquee ? [...team, ...team] : team;
  const active = openId ? team.find((m) => m.id === openId) : null;

  return (
    <>
    <section className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/80 to-amber-50/30 py-12 shadow-sm">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-800/80">People behind UniMondo</p>
        <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[#0a1628] sm:text-3xl">
          Our Team
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          The counselors and specialists behind your application — tap a profile to read the full story.
        </p>
      </div>

      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-amber-50/50 to-transparent" />

        <div
          className={
            useMarquee
              ? "about-partners-marquee-track items-stretch gap-16 px-6 md:gap-24 md:px-10"
              : "flex justify-center px-6 md:px-10"
          }
          role="region"
          aria-label="Team members"
        >
          {loop.map((m, idx) => (
            <button
              key={useMarquee ? `${m.id}-${idx}` : m.id}
              type="button"
              onClick={() => setOpenId(m.id)}
              className={cn(
                "group flex w-[min(100vw-3rem,220px)] shrink-0 flex-col items-center text-center text-left transition md:w-[240px]",
                "cursor-pointer rounded-2xl border border-transparent p-2 outline-none",
                "hover:-translate-y-0.5 hover:border-amber-200/80 hover:bg-white/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-amber-500/50",
              )}
              aria-label={`View profile: ${m.name}`}
            >
              <div className="relative w-full text-center">
                <div
                  className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400/50 via-amber-500/30 to-amber-600/40 blur-[2px]"
                  aria-hidden
                />
                <div className="relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#0a1628] shadow-xl shadow-amber-900/15 ring-2 ring-amber-400/35 transition group-hover:ring-amber-400/55 md:h-40 md:w-40">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-3 text-center font-[family-name:var(--font-heading)] text-lg font-semibold leading-tight text-amber-200">
                      {initials(m.name)}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">{m.name}</h3>
              {m.qualification ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-900/75">{m.qualification}</p>
              ) : null}
              {m.bio ? (
                <p className="mt-3 line-clamp-2 w-full max-w-[14rem] min-h-[2.5rem] text-sm leading-relaxed text-slate-600">{m.bio}</p>
              ) : null}
              <span className="mt-2 text-[11px] font-medium text-amber-800/80 underline decoration-amber-400/50 decoration-dotted underline-offset-2">
                {m.bio?.trim() ? "Read more" : "Profile"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>

      {active ? (
        <CenteredModal
          open
          onClose={onClose}
          title={active.name}
          subtitle={active.qualification || undefined}
          icon={
            active.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.image_url} alt="" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-amber-400/30" />
            ) : (
              <User className="h-6 w-6 text-amber-400" aria-hidden />
            )
          }
          labelledBy={modalTitleId}
          lockBodyScroll={false}
          lightBackdrop
          wide
        >
          <div className="space-y-3 text-slate-800">
            {active.bio?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-[15px]">{active.bio}</p>
            ) : (
              <p className="text-sm text-slate-500">Full bio is not available for this team member yet.</p>
            )}
          </div>
        </CenteredModal>
      ) : null}
    </>
  );
}
