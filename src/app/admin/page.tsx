import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl">Application Dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
          Review incoming applications, filter by review status, and update outcomes for counselor workflows.
        </p>
      </section>

      <AdminDashboard />
    </main>
  );
}
