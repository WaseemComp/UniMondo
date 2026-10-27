import { AdminSettingsContent } from "@/components/admin/admin-settings-content";
import { listAdminUsers, type AdminProfileRow } from "@/app/admin/cms/admin-users-actions";
import { getAdminAccess } from "@/lib/auth/admin";
import { requireAdminUser } from "@/app/admin/require-admin";

export default async function AdminSiteSettingsPage() {
  const user = await requireAdminUser();
  const access = await getAdminAccess(user);
  let adminRows: AdminProfileRow[] = [];
  if (access.isSuper) {
    const result = await listAdminUsers();
    if (result.ok) adminRows = result.rows;
  }

  return <AdminSettingsContent access={access} currentUserId={user.id} adminRows={adminRows} />;
}
