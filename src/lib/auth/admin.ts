import { createSupabaseServiceClient } from "@/lib/supabase/admin";

/**
 * Who may access /admin: comma-separated emails in ADMIN_EMAILS,
 * plus optional rows in public.admin_profiles (checked server-side).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const list = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list?.length && list.includes(normalized)) return true;
  return false;
}

/** Use in Server Actions after getUser(): env allowlist OR admin_profiles row. */
export async function isAdminUser(user: { id: string; email?: string | null }): Promise<boolean> {
  if (isAdminEmail(user.email)) return true;
  const svc = createSupabaseServiceClient();
  if (!svc) return false;
  const { data } = await svc.from("admin_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  return data != null;
}
