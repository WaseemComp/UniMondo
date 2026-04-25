import { redirect } from "next/navigation";

export default async function AdminUsersPermissionsPage() {
  // Merged into /admin/settings
  redirect("/admin/settings");
}

