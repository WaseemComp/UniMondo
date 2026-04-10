import Link from "next/link";

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Blog</p>
      <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[#0a1628]">Coming soon</h1>
      <p className="mt-4 text-slate-600">
        We&apos;re preparing guides on admissions, visas, and student life in Europe. Check back shortly — or{" "}
        <Link href="/contact" className="font-semibold text-amber-800 underline-offset-4 hover:underline">
          contact us
        </Link>{" "}
        for updates.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#132a4a]"
      >
        Back to home
      </Link>
    </main>
  );
}
