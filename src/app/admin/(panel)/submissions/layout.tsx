import { assertAdminScope } from "@/lib/auth/admin-page-guard";

export default async function AdminSubmissionsLayout({ children }: { children: React.ReactNode }) {
  await assertAdminScope("submissions");
  return children;
}
