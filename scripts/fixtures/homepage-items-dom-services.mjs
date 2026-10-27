// DOM test adapter only. Delegates to real server actions backed by the isolated SDK fixture.
export async function saveHomepageEditor(input) { return globalThis.__homepageItemsActions.saveHomepageEditor(input); }
export async function saveHomepageCollection(input) { return globalThis.__homepageItemsActions.saveHomepageCollection(input); }
export async function saveHomepagePresentation(input) { return globalThis.__homepageItemsActions.saveHomepagePresentation(input); }
export async function saveHomepageStory(input) { return globalThis.__homepageItemsActions.saveHomepageStory(input); }
export async function hideHomepageStory(input) { return globalThis.__homepageItemsActions.hideHomepageStory(input); }
export function getSupabaseBrowserClient() { return null; }
export function usePathname() { return '/admin/home'; }
export function useRouter() { return {refresh(){}}; }
