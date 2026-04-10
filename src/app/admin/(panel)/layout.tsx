import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { isAdminUser } from "@/lib/auth/admin";
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

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <AdminSidebar />
        <main className="min-h-screen flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
