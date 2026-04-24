import type { Metadata } from "next";
import Link from "next/link";
import { StudyPackagesTables } from "@/components/packages/study-packages-tables";
import { getPublishedAddOns, getPublishedPackages } from "@/lib/data/study-pricing";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Our Packages | UniMondo",
  description:
    "Transparent UniMondo support packages for European admissions — from consultation to visa-ready guidance.",
};

export default async function StudyPackagesPage() {
  const [packages, addOns] = await Promise.all([getPublishedPackages(), getPublishedAddOns()]);

  return (
    <main className="min-w-0 bg-zinc-50/80">
      <section className="border-b border-white/10 bg-[#0a1628] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">Pricing</p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Our packages
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Choose the level of counsel and application support you need. All tiers assume{" "}
            <span className="font-medium text-amber-200">free application submission</span> — you invest only in the
            services that match your journey.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {!packages.length && !addOns.length ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
            Packages are being configured. Please check back soon or{" "}
            <Link href="/contact" className="font-medium text-amber-800 underline-offset-2 hover:underline">
              contact us
            </Link>
            .
          </p>
        ) : (
          <StudyPackagesTables packages={packages} addOns={addOns} />
        )}
      </div>
    </main>
  );
}
