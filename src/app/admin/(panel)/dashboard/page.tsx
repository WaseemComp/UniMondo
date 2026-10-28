import { redirect } from "next/navigation";
import { CmsOverviewContent } from "@/components/admin/cms/cms-overview";
import { getCmsNavigation } from "@/lib/admin/navigation-access";
import { getCmsOverview } from "@/lib/admin/overview";
import { getAdminAccess, isAdminUser } from "@/lib/auth/admin";
import { staffDisplayName } from "@/lib/auth/staff-identity";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) redirect("/admin/login");
  const items = await getCmsNavigation(user, await getAdminAccess(user));
  const data = await getCmsOverview(items);
  const firstName = staffDisplayName(user).trim().split(/\s+/)[0] || "";
  return <CmsOverviewContent data={data} items={items} firstName={firstName} />;
}
