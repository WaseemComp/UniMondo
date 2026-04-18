import Link from "next/link";
import { Check } from "lucide-react";
import type { StudyAddOnPublic, StudyPackagePublic } from "@/lib/cms/pricing-types";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  packages: StudyPackagePublic[];
  addOns: StudyAddOnPublic[];
};

export function StudyPackagesTables({ packages, addOns }: Props) {
  return (
    <div className="space-y-16 lg:space-y-20">
      {/* Trust strip */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/25 px-5 py-5 sm:px-8 sm:py-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(10, 22, 40, 0.04) 50%, rgba(19, 42, 74, 0.08) 100%)",
        }}
      >
        <p className="relative text-center text-sm leading-relaxed text-[#0a1628] sm:text-base">
          <strong className="font-semibold text-[#0a1628]">Application submission with UniMondo is completely FREE.</strong>{" "}
          You only pay for the support package you choose. You can upgrade or change your package later.
        </p>
      </div>

      {/* Main tiers — card grid */}
      {packages.length > 0 && (
        <section>
          <div className="mb-10 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
              Support tiers
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 sm:text-base">
              From focused consultation to full admission support — pick the depth of guidance that fits you.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-8">
            {packages.map((p) => {
              const featured = p.slug === "standard";
              return (
                <article
                  key={p.id}
                  className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-md transition duration-300 sm:p-8 ${
                    featured
                      ? "z-[1] border-amber-400/60 shadow-xl shadow-amber-900/10 ring-2 ring-amber-400/35 lg:-mt-2 lg:mb-0 lg:scale-[1.02]"
                      : "border-zinc-200/90 shadow-zinc-900/5 hover:border-amber-200/80 hover:shadow-lg"
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0a1628] shadow-sm">
                      Most popular
                    </span>
                  ) : null}

                  <div className="mb-6">
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628] sm:text-2xl">
                      {p.name}
                    </h3>
                    <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-3xl font-bold tracking-tight text-[#0a1628] sm:text-4xl">{usd(p.priceFull)}</span>
                      <span className="text-sm font-medium text-zinc-500">full pay</span>
                    </div>
                    {p.priceInstallment != null ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        or <span className="font-semibold text-zinc-800">{usd(p.priceInstallment)}</span> on installments
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-500">One-time consultation tier</p>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-600">{p.description}</p>

                  {p.features.length > 0 ? (
                    <ul className="mt-6 flex flex-col gap-3">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-3 text-sm leading-snug text-zinc-700">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {p.bestFor ? (
                    <div className="mt-auto border-t border-zinc-100 pt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/90">Best for</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{p.bestFor}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Add-ons */}
      {addOns.length > 0 && (
        <section className="relative">
          <div
            className="pointer-events-none absolute inset-x-0 -top-8 h-px max-w-2xl mx-auto bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
            aria-hidden
          />
          <div className="mb-10 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628] sm:text-3xl">
              Add-ons
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 sm:text-base">
              Layer extra support on any tier — scholarships, visa, pre-departure, and more.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {addOns.map((a) => (
              <article
                key={a.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm transition duration-300 hover:border-amber-300/50 hover:shadow-md"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600 opacity-90" />
                <div className="pl-4">
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">{a.name}</h3>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-xl font-bold text-[#0a1628]">{usd(a.priceFull)}</span>
                    {a.priceInstallment != null ? (
                      <span className="text-sm text-zinc-500">/ {usd(a.priceInstallment)} installments</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{a.description}</p>
                  {a.bestFor ? (
                    <p className="mt-4 text-xs font-medium text-zinc-500">
                      <span className="text-amber-800/90">Best for:</span> {a.bestFor}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1628] via-[#132a4a] to-[#0a1628] px-6 py-10 text-center shadow-xl sm:px-10 sm:py-12">
        <p className="mx-auto max-w-lg text-base font-medium leading-relaxed text-slate-100 sm:text-lg">
          Ready when you are — start your application with{" "}
          <span className="relative mx-0.5 inline-block rounded-md bg-amber-400 px-2.5 py-1 text-sm font-bold tracking-wide text-[#0a1628] shadow-md shadow-black/20 sm:text-base">
            no fee
          </span>{" "}
          for submission.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-[#0a1628] shadow-lg shadow-amber-900/20 transition hover:bg-amber-400"
        >
          Start application
        </Link>
      </section>
    </div>
  );
}
