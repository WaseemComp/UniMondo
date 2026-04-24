import { assertAdminScope } from "@/lib/auth/admin-page-guard";

export default async function AdminContentSectionLayout({ children }: { children: React.ReactNode }) {
  await assertAdminScope("content");
  return children;
}
