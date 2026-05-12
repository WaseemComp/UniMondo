import { redirect } from "next/navigation";

/** @deprecated Use `/admin/destinations` — unified hub for countries, featured universities, and programs. */
export default function AdminUniversitiesPage() {
  redirect("/admin/destinations");
}

