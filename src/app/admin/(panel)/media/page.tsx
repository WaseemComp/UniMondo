import { redirect } from "next/navigation";
import { requireMediaAccess } from "@/lib/media/access";
import { MediaLibrary } from "@/components/admin/media/media-library";

export default async function MediaLibraryPage() {
  try { await requireMediaAccess(); }
  catch { redirect("/admin/dashboard"); }
  return <MediaLibrary />;
}
