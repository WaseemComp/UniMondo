import type { Metadata } from "next";
import { OpeningsBoard } from "@/components/openings-board";
import { getFeaturedUniversities } from "@/lib/data/featured-universities";
import { getOpenings } from "@/lib/data/openings";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Featured Universities & Programs | UniMondo",
  description:
    "Discover celebrated European universities with centuries of academic excellence offering outstanding Bachelor’s and Master’s programs.",
};

export default async function CurrentOpeningsPage() {
  const [openings, featuredUniversities] = await Promise.all([getOpenings(), getFeaturedUniversities()]);

  return (
    <main className="min-w-0">
      {/* Hero — gradient only (avoids fragile remote hero URLs / 404s from image CDNs) */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0a1628]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 20% 20%, rgba(212, 175, 55, 0.12), transparent 50%), radial-gradient(ellipse 100% 60% at 80% 100%, rgba(30, 58, 95, 0.55), transparent 45%), linear-gradient(165deg, #0a1628 0%, #132a4a 48%, #0d1f38 100%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">UniMondo</p>
          <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Featured Universities &amp; Programs
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Discover celebrated European universities with centuries of academic excellence offering outstanding
            Bachelor&apos;s and Master&apos;s programs.
          </p>
        </div>
      </section>

      <section
        id="browse-all-programs"
        className="scroll-mt-24 bg-zinc-50/80 py-14 sm:py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <OpeningsBoard openings={openings} featuredUniversities={featuredUniversities} />
        </div>
      </section>
    </main>
  );
}
