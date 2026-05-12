import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminSubmissionsIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Submissions</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Partner and team requests (separate from student Applications).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/submissions/work-with-us"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">Work With Us</p>
          <p className="mt-1 text-sm text-zinc-600">Collaboration and partnership inquiries.</p>
        </Link>
        <Link
          href="/admin/submissions/join-us"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
        >
          <p className="text-sm font-semibold text-zinc-900">Join Us</p>
          <p className="mt-1 text-sm text-zinc-600">Hiring and “join the team” submissions.</p>
        </Link>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Latest submissions</h2>
          <p className="mt-1 text-sm text-zinc-600">Work With Us and Join Us entries from the unified backend.</p>
        </div>
        <AdminDashboard
          allowedTypes={["work_with_us", "join_us"]}
          defaultType="All"
          detailBasePath="/admin/submissions/detail"
        />
      </div>
    </div>
  );
}

