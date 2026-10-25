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
    <main className="min-w-0 bg-[#F8F7F3]">
      <section className="border-b border-[#E2DFD8] bg-[#1A2E3A] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9AB76]">Pricing & Support</p>
          <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl">
            Our packages
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Choose the level of counsel and application support you need. All tiers assume{" "}
            <span className="font-medium text-[#C9AB76]">free application submission</span> — you invest only in the
            services that match your journey.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {!packages.length && !addOns.length ? (
          <p className="rounded-xl border border-dashed border-[#E2DFD8] bg-white p-8 text-center text-sm text-[#4D5F64]">
            Packages are being configured. Please check back soon or{" "}
            <Link href="/contact" className="font-medium text-[#244B50] underline-offset-2 hover:underline">
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

