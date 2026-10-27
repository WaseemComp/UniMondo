import { HomepageEditor } from "@/components/admin/homepage/homepage-editor";
import { loadHomepageEditor } from "@/lib/admin/homepage-editor";

export default async function AdminHomeCmsPage({ searchParams }: { searchParams: Promise<{ media?: string }> }) {
  const { media } = await searchParams;
  const initialMediaId = typeof media === "string" && /^(?:[0-9a-f-]{36}|legacy:[0-9a-f]{64})$/.test(media) ? media : undefined;
  return <HomepageEditor initial={await loadHomepageEditor()} initialMediaId={initialMediaId} />;
}
