// Real server actions with isolated PostgreSQL backing; no browser/production network.
export async function readContentWorkflow(input) {
  return globalThis.__publishingActions.readContentWorkflow(input);
}
export async function transitionContent(input) {
  return globalThis.__publishingActions.transitionContent(input);
}
export async function readEarlierContentRevisions(input) {
  return globalThis.__publishingActions.readEarlierContentRevisions(input);
}
export async function saveHomepageEditor(input) {
  return globalThis.__publishingActions.saveHomepageEditor(input);
}
export async function saveHomepageCollection(input) {
  return globalThis.__publishingActions.saveHomepageCollection(input);
}
export async function saveHomepagePresentation(input) {
  return globalThis.__publishingActions.saveHomepagePresentation(input);
}
export async function saveHomepageStory(input) {
  return globalThis.__publishingActions.saveHomepageStory(input);
}
export async function hideHomepageStory(input) {
  return globalThis.__publishingActions.hideHomepageStory(input);
}
export async function saveAcademicRecord(input) {
  return globalThis.__publishingActions.saveAcademicRecord(input);
}
export function useRouter() {
  return { refresh() {} };
}
export function usePathname() {
  return "/admin/home";
}
export function getSupabaseBrowserClient() {
  return null;
}

export async function readContentRevision(input) {
  return globalThis.__publishingActions.readContentRevision(input);
}

export async function saveFooterDraft(input) { return globalThis.__publishingActions.saveFooterDraft(input); }
