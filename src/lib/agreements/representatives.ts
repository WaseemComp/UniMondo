import { createSupabaseServiceClient } from "../supabase/admin";
import { isAdminEmail } from "../auth/admin";

export type AgreementRepresentative = { name: string; designation: string };
type StaffUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

function option(user: StaffUser): AgreementRepresentative {
  return {
    name: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "UniMondo Admissions Team"),
    designation: String(user.user_metadata?.designation || "Authorised representative"),
  };
}

/** Called only after the agreement page's existing administrator access check. */
export async function getAgreementRepresentatives(currentUser: StaffUser): Promise<AgreementRepresentative[]> {
  const options = [option(currentUser)];
  const svc = createSupabaseServiceClient();
  if (!svc) return options;
  const { data: profiles, error } = await svc.from("admin_profiles").select("user_id");
  if (error) return options;
  const adminIds = new Set((profiles || []).map(profile => String(profile.user_id)));
  for (let page = 1; ; page++) {
    const { data, error: usersError } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersError) break;
    for (const user of data.users) {
      if (adminIds.has(user.id) || isAdminEmail(user.email)) options.push(option(user));
    }
    if (data.users.length < 1000) break;
  }
  return Array.from(new Map(options.map(rep => [rep.name, rep])).values());
}
