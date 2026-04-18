import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import type { ContactOfficeRow } from "@/lib/data/contact-page";
import { cn } from "@/lib/utils";

type Props = {
  offices: ContactOfficeRow[];
};

export function ContactOfficesSection({ offices }: Props) {
  if (!offices.length) {
    return (
      <section id="our-offices" className="scroll-mt-24">
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
          Office locations will appear here once added in Admin → Contact management.
        </p>
      </section>
    );
  }

  return (
    <section id="our-offices" className="scroll-mt-24">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800/90">Our offices</p>
        <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
          Where to reach us
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
          Head office and branch locations — addresses, lines, and channels in one structured view.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {offices.map((o) => (
          <article
            key={o.id}
            className={cn(
              "relative overflow-hidden rounded-[1.75rem] border bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8",
              o.office_type === "head"
                ? "border-amber-500/40 border-l-[4px] border-l-amber-500"
                : "border-slate-200/90 border-l-[4px] border-l-slate-300",
            )}
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
                    o.office_type === "head"
                      ? "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/30"
                      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
                  )}
                >
                  {o.office_type === "head" ? "Head office" : "Branch office"}
                </span>
                {o.title ? (
                  <h3 className="mt-3 font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628]">{o.title}</h3>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 text-sm">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25">
                  <MapPin className="h-5 w-5 text-amber-700" aria-hidden />
                </span>
                <p className="whitespace-pre-line leading-relaxed text-slate-800">{o.address_lines}</p>
              </div>

              {o.phones.length > 0 ? (
                <ul className="space-y-2">
                  {o.phones.map((p, idx) => (
                    <li key={`${p.number}-${idx}`} className="flex gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0a1628]/90 text-amber-400">
                        <Phone className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        {p.label ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{p.label}</p> : null}
                        <a
                          href={`tel:${p.number.replace(/\s+/g, "")}`}
                          className="font-medium text-[#0a1628] underline-offset-2 hover:text-amber-800 hover:underline"
                        >
                          {p.number}
                        </a>
                        {p.kind ? (
                          <span className="ml-2 text-xs text-slate-500">({p.kind})</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {o.emails.length > 0 ? (
                <ul className="space-y-2">
                  {o.emails.map((e, idx) => (
                    <li key={`${e.email}-${idx}`} className="flex gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                        <Mail className="h-5 w-5 text-amber-800" aria-hidden />
                      </span>
                      <div>
                        {e.label ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{e.label}</p> : null}
                        <a
                          href={`mailto:${e.email}`}
                          className="font-medium text-[#0a1628] underline-offset-2 hover:text-amber-800 hover:underline"
                        >
                          {e.email}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {o.social_links.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Social</p>
                  <div className="flex flex-wrap gap-2">
                    {o.social_links.map((s, idx) => (
                      <a
                        key={`${s.url}-${idx}`}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[#0a1628] transition hover:border-amber-500/40 hover:bg-amber-50"
                        aria-label={s.platform}
                        title={s.platform}
                      >
                        <ExternalLink className="h-5 w-5" aria-hidden />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
