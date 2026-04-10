import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Applications</h1>
        <p className="mt-1 text-sm text-zinc-600">Review incoming applications and update review status.</p>
      </div>
      <AdminDashboard />
    </div>
  );
}
