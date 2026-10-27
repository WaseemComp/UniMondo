// Isolated tests only. Production never imports this module.
export function createSupabaseServiceClient() { return globalThis.__staffTest.client; }
export async function createSupabaseServerAuthClient() {
  return { auth: { getUser: async () => ({ data: { user: globalThis.__staffTest.session } }) } };
}
export function revalidatePath(path) { globalThis.__staffTest.revalidated.push(path); }
export function useRouter() { return { push() {}, refresh() {} }; }
