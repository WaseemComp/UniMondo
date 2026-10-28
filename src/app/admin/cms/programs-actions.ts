"use server";
import { academicAccess } from "@/lib/academic/server";
// Legacy clients must reload the Phase 05 editor. Never delete retained catalogue records.
export async function saveProgram(
  _input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  void _input;
  const { permissions } = await academicAccess();
  return {
    ok: false,
    error: permissions.programmes.view
      ? "Reload the academic catalogue editor before saving. Your existing content has not changed."
      : "Forbidden",
  };
}
export async function deleteProgram(
  _id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  void _id;
  const { permissions } = await academicAccess();
  return {
    ok: false,
    error: permissions.programmes.delete
      ? "Use Archive in the academic catalogue editor. Related records must be retained."
      : "Forbidden",
  };
}
