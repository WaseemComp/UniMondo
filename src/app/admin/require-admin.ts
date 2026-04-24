import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function requireAdminUser() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdminUser();
  if (!(await isSuperAdmin(user))) {
    throw new Error("Forbidden: super admin only");
  }
  return user;
}
