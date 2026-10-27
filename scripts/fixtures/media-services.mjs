// Local synthetic transport only. Never imported by the application.
export function createSupabaseServiceClient() { return globalThis.__mediaTest.client; }
export function createSupabaseServerClient() { return globalThis.__mediaTest.client; }
export async function createSupabaseServerAuthClient() { return { auth: { getUser: async () => ({ data: { user: globalThis.__mediaTest.session } }) } }; }
export function revalidatePath(path) { globalThis.__mediaTest.revalidated.push(path); }
export function redirect(path) { throw new Error(`REDIRECT:${path}`); }
