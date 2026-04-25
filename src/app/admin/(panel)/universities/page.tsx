import Link from "next/link";

export default function AdminUniversitiesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Universities</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage universities/programs content shown on the public Universities &amp; Programs experience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/featured-universities"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">Universities spotlight</p>
          <p className="mt-1 text-sm text-zinc-600">Curated university cards on the public Universities page.</p>
        </Link>
        <Link
          href="/admin/programs"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">Programs</p>
          <p className="mt-1 text-sm text-zinc-600">The full programs/openings list (filters, deadlines, tuition).</p>
        </Link>
      </div>
    </div>
  );
}

