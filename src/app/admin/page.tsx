import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

/** `/admin` is outside the `(panel)` segment; guard here so unauthenticated users cannot bounce only on `/admin/dashboard`. */
export default async function AdminIndexPage() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login");
  }

  redirect("/admin/dashboard");
}
