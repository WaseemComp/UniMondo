import { OpeningsBoard } from "@/components/openings-board";
import { getOpenings } from "@/lib/data/openings";

export const revalidate = 60;

export default async function CurrentOpeningsPage() {
  const openings = await getOpenings();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Programs</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Current Openings</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-700">
          Live programs for Fall 2026 and Spring 2027 — filter by continent, country, region, and intake to find
          opportunities that match your profile, then apply with pre-filled destination details.
        </p>
      </section>

      <OpeningsBoard openings={openings} />
    </main>
  );
}
