// Test-only adapters. Actual catalogue actions use the isolated Supabase SDK transport.
export async function saveAcademicRecord(input) {
  return globalThis.__academicActions.saveAcademicRecord(input);
}
export function useRouter() {
  return { refresh() {} };
}
export function usePathname() {
  return "/admin/programs";
}
