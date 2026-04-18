import { Suspense } from "react";
import { ApplyWizard } from "@/components/apply-wizard";
import { getPublishedAddOns, getPublishedPackages } from "@/lib/data/study-pricing";

export default async function ApplyPage() {
  const [packages, addOns] = await Promise.all([getPublishedPackages(), getPublishedAddOns()]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Apply Now</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Your UniMondo Application</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
          Complete your profile in six guided steps — including your preferred support package. Your documents and
          details are securely stored, then tagged by initial screening rules before counselor review.
        </p>
      </section>

      <Suspense fallback={<p className="text-sm text-zinc-600">Loading application form...</p>}>
        <ApplyWizard packages={packages} addOns={addOns} />
      </Suspense>
    </main>
  );
}
