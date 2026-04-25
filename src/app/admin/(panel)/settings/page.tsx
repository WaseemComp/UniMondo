import { AdminSettingsContent } from "@/components/admin/admin-settings-content";
import { type AdminProfileRow } from "@/app/admin/cms/admin-users-actions";
import { getAdminAccess } from "@/lib/auth/admin";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminSiteSettingsPage() {
  const user = await requireAdminUser();
  const access = await getAdminAccess(user);
  const svc = createSupabaseServiceClient();
  let adminRows: AdminProfileRow[] = [];
  if (access.isSuper && svc) {
    const { data } = await svc
      .from("admin_profiles")
      .select("user_id, email, is_super_admin, permissions, permissions_v2")
      .order("email", { ascending: true });
    adminRows = (data ?? []) as AdminProfileRow[];
  }

  return <AdminSettingsContent access={access} currentUserId={user.id} adminRows={adminRows} />;
}
