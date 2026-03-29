import { OpeningsBoard } from "@/components/openings-board";

export default function CurrentOpeningsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Current Openings</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Live Programs for Fall 2026 and Spring 2027</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
          Filter by continent, country, region, and intake to quickly identify matching opportunities and apply with
          pre-filled destination details.
        </p>
      </section>

      <OpeningsBoard />
    </main>
  );
}
