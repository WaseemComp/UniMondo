import { requireSuperAdmin } from "@/app/admin/require-admin";
import { listAdminUsers } from "@/app/admin/cms/admin-users-actions";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
export default async function TeamPage() {
  const user = await requireSuperAdmin(),
    result = await listAdminUsers();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Team &amp; Permissions</h1>
      {result.ok ? (
        <AdminUsersManager initialRows={result.rows} currentUserId={user.id} />
      ) : (
        <p role="alert">Staff accounts could not be loaded. Please reload.</p>
      )}
    </div>
  );
}
