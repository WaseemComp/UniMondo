import { redirect } from "next/navigation";

export default function LegacyAdminProgramsRedirect() {
  redirect("/admin/programs");
}
