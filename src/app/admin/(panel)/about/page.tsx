import Link from "next/link";

export default function AdminAboutPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">About</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage the About page sections and team content.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/content/about"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">About page sections</p>
          <p className="mt-1 text-sm text-zinc-600">Edit page copy, partners, and structured about sections.</p>
        </Link>
        <Link
          href="/admin/content/team"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">Team members</p>
          <p className="mt-1 text-sm text-zinc-600">Add, edit, reorder, and publish team cards.</p>
        </Link>
      </div>
    </div>
  );
}

