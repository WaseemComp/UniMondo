import { HomepageEditor } from "@/components/admin/homepage/homepage-editor";
import { loadHomepageEditor } from "@/lib/admin/homepage-editor";

export default async function AdminHomeCmsPage() {
  return <HomepageEditor initial={await loadHomepageEditor()} />;
}
