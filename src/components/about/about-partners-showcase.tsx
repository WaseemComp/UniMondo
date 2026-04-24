import type { AboutPartnerRow } from "@/lib/data/about-page";

function locationLine(p: AboutPartnerRow): string {
  return [p.region, p.country, p.continent].map((s) => s?.trim()).filter(Boolean).join(" · ");
}

type Props = {
  partners: AboutPartnerRow[];
};

export function AboutPartnersShowcase({ partners }: Props) {
  if (!partners.length) return null;

  const loop = [...partners, ...partners];

  return (
    <section className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/80 to-amber-50/30 py-12 shadow-sm">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-800/80">Together we go further</p>
        <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[#0a1628] sm:text-3xl">
          Our Partners
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          Universities, agencies, and mission-aligned organisations that help us open doors for students — trusted
          names in motion.
        </p>
      </div>

      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-amber-50/50 to-transparent" />

        <div className="about-partners-marquee-track items-stretch gap-16 px-6 md:gap-24 md:px-10">
          {loop.map((p, idx) => {
            const loc = locationLine(p);
            return (
              <article
                key={`${p.id}-${idx}`}
                className="flex w-[min(100vw-3rem,220px)] shrink-0 flex-col items-center text-center md:w-[240px]"
              >
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400/50 via-amber-500/30 to-amber-600/40 blur-[2px]" aria-hidden />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-white bg-[#0a1628] shadow-xl shadow-amber-900/15 ring-2 ring-amber-400/35 md:h-40 md:w-40">
                    {p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- CMS URL
                      <img src={p.logo_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="px-3 text-center font-[family-name:var(--font-heading)] text-lg font-semibold leading-tight text-amber-200">
                        {p.organization_name.slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">{p.organization_name}</h3>
                {loc ? <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-900/75">{loc}</p> : null}
                {p.short_description ? (
                  <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-slate-600">{p.short_description}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
