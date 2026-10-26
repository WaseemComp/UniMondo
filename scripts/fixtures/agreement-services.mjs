// Only used by the isolated regression runner; never imported by the application.
export function createSupabaseServiceClient() { return globalThis.__agreementTestServices.client; }
export async function createSupabaseServerAuthClient() {
  return { auth: { getUser: async () => ({ data: { user: globalThis.__agreementTestServices.user } }) } };
}
export async function isAdminUser(user) { return Boolean(user?.admin); }
export async function isSuperAdmin(user) { return Boolean(user?.super); }
export async function hasAdminPermission(user) { return Boolean(user?.discount); }
