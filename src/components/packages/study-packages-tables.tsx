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
      <div className="relative overflow-hidden rounded-xl border border-[#E2DFD8] bg-[#E6EEE8] px-5 py-5 sm:px-8 sm:py-6 shadow-xs">
        <p className="relative text-center text-sm leading-relaxed text-[#26343B] sm:text-base">
          <strong className="font-bold text-[#244B50]">Application submission with UniMondo is completely FREE.</strong>{" "}
          You only pay for the support package you choose. You can upgrade or change your package later.
        </p>
      </div>

      {/* Main tiers — card grid */}
      {packages.length > 0 && (
        <section>
          <div className="mb-10 text-center">
            <h2 className="font-[family-name:var(--font-editorial)] text-3xl font-bold text-[#26343B] sm:text-4xl">
              Support tiers
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#4D5F64] sm:text-base">
              From focused consultation to full admission support — pick the depth of guidance that fits you.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-8">
            {packages.map((p) => {
              const featured = p.slug === "standard";
              return (
                <article
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition duration-200 sm:p-8 ${
                    featured
                      ? "z-[1] border-[#244B50] ring-2 ring-[#244B50]/25 shadow-md lg:-mt-2 lg:mb-0 lg:scale-[1.02]"
                      : "border-[#E2DFD8] hover:border-[#244B50]/40 hover:shadow-md"
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-[#244B50] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                      Most popular
                    </span>
                  ) : null}

                  <div className="mb-6">
                    <h3 className="font-[family-name:var(--font-editorial)] text-2xl font-bold text-[#26343B]">
                      {p.name}
                    </h3>
                    <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-3xl font-bold tracking-tight text-[#244B50] sm:text-4xl">{usd(p.priceFull)}</span>
                      <span className="text-sm font-medium text-[#4D5F64]">full pay</span>
                    </div>
                    {p.priceInstallment != null ? (
                      <p className="mt-1 text-sm text-[#4D5F64]">
                        or <span className="font-semibold text-[#26343B]">{usd(p.priceInstallment)}</span> on installments
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[#4D5F64]">One-time consultation tier</p>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-[#4D5F64]">{p.description}</p>

                  {p.features.length > 0 ? (
                    <ul className="mt-6 flex flex-col gap-3">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-3 text-sm leading-snug text-[#26343B]">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#244B50]/10 text-[#244B50]">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {p.bestFor ? (
                    <div className="mt-auto border-t border-[#E2DFD8] pt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#7D673A]">Best for</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#4D5F64]">{p.bestFor}</p>
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
          <div className="mb-10 text-center">
            <h2 className="font-[family-name:var(--font-editorial)] text-3xl font-bold text-[#26343B] sm:text-4xl">
              Add-ons
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#4D5F64] sm:text-base">
              Layer extra support on any tier — scholarships, visa, pre-departure, and more.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {addOns.map((a) => (
              <article
                key={a.id}
                className="group relative overflow-hidden rounded-xl border border-[#E2DFD8] bg-white p-5 shadow-xs transition duration-200 hover:border-[#244B50]/40 hover:shadow-sm"
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-[#244B50]" />
                <div className="pl-3">
                  <h3 className="font-[family-name:var(--font-editorial)] text-xl font-bold text-[#26343B]">{a.name}</h3>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-xl font-bold text-[#244B50]">{usd(a.priceFull)}</span>
                    {a.priceInstallment != null ? (
                      <span className="text-sm text-[#4D5F64]">/ {usd(a.priceInstallment)} installments</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#4D5F64]">{a.description}</p>
                  {a.bestFor ? (
                    <p className="mt-4 text-xs font-medium text-[#4D5F64]">
                      <span className="text-[#7D673A] font-semibold">Best for:</span> {a.bestFor}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="rounded-2xl border border-[#1D3E42] bg-[#244B50] px-6 py-10 text-center shadow-xl sm:px-10 sm:py-12">
        <p className="mx-auto max-w-lg text-base font-medium leading-relaxed text-white sm:text-lg">
          Ready when you are — start your application with{" "}
          <span className="relative mx-0.5 inline-block rounded-md bg-[#C9AB76] px-2.5 py-1 text-sm font-bold tracking-wide text-[#1A2E3A] shadow-xs sm:text-base">
            no fee
          </span>{" "}
          for submission.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex rounded-lg bg-[#C9AB76] px-8 py-3.5 text-sm font-semibold text-[#1A2E3A] shadow-md shadow-black/20 transition hover:bg-[#B8996A]"
        >
          Start application
        </Link>
      </section>
    </div>
  );
}
