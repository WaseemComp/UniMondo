import { redirect } from "next/navigation";

/** Keep old links compatible while using the single visual homepage editor. */
export default function AdminHomeContentPage() {
  redirect("/admin/home");
}
