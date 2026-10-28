import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCmsNavigation } from "@/lib/admin/navigation-access";
import { staffDisplayName } from "@/lib/auth/staff-identity";
import "@/components/admin/cms-theme.css";
import { getAdminAccess, isAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

/** Server-side guard (in addition to `src/proxy.ts`): blocks direct RSC access if cookies are forged or proxy is bypassed. */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login?next=%2Fadmin%2Fdashboard");
  }

  const access = await getAdminAccess(user);

  const items = await getCmsNavigation(user, access);
  return (
    <AdminShell
      items={items}
      userName={staffDisplayName(user)}
      roleLabel={access.isSuper ? "Superadmin" : "Staff"}
    >
      {children}
    </AdminShell>
  );
}
