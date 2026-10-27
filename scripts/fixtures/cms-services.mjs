// Read-only, isolated CMS tests. Production never imports this module.
export function createSupabaseServiceClient() { return globalThis.__cmsTest.client; }
export async function createSupabaseServerAuthClient() {
  return { auth: { getUser: async () => ({ data: { user: globalThis.__cmsTest.session } }) } };
}
