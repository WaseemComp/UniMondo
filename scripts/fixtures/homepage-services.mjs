// Isolated transport only; no live Supabase project or existing user is contacted.
export function createSupabaseServiceClient() { return globalThis.__homepageTest.client; }
export function createSupabaseServerClient() { return globalThis.__homepageTest.client; }
export async function createSupabaseServerAuthClient() { return { auth: { getUser: async () => ({ data: { user: globalThis.__homepageTest.session } }) } }; }
export function revalidatePath(path) { globalThis.__homepageTest.revalidated.push(path); }
export function redirect(path) { throw new Error(`REDIRECT:${path}`); }
