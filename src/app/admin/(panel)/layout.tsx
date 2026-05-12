import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminPortalNavigation } from "@/components/admin/admin-portal-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminAccess, isAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

/** Server-side guard (in addition to `src/proxy.ts`): blocks direct RSC access if cookies are forged or proxy is bypassed. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login?next=%2Fadmin%2Fdashboard");
  }

  const access = await getAdminAccess(user);

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <AdminSidebar access={access} />
        <main className="min-h-screen flex-1 p-6 lg:p-10">
          <Suspense
            fallback={
              <div
                className="mb-6 h-14 animate-pulse rounded-lg bg-zinc-200/80"
                aria-hidden
              />
            }
          >
            <AdminPortalNavigation
              showApplicationsShortcut={access.permissions.applications}
              showCountriesShortcut={access.permissions.academic}
            />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
