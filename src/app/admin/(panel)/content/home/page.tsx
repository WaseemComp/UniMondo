import { HomeContentForm } from "@/components/admin/home-content-form";
import { getSiteContent } from "@/lib/data/site-content";

export default async function AdminHomeContentPage() {
  const initial = await getSiteContent();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Homepage content</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Edits the hero section on the public home page. Requires <code className="rounded bg-zinc-100 px-1">site_content</code>{" "}
          table and service role on the server.
        </p>
      </div>
      <HomeContentForm initial={initial} />
    </div>
  );
}
