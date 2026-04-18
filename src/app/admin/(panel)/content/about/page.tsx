import { AboutSectionsForm } from "@/components/admin/cms/about-sections-form";
import { ABOUT_SECTION_ORDER, type AboutSectionRow } from "@/lib/data/about-page";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminAboutContentPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to edit About content.
      </p>
    );
  }

  const { data, error } = await svc.from("about_sections").select("section_key, title, body");

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">About page</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create about_sections."
            : error.message}
        </p>
      </div>
    );
  }

  const map = new Map((data as AboutSectionRow[] | null)?.map((r) => [r.section_key, r]) ?? []);
  const sections = ABOUT_SECTION_ORDER.map((k) => map.get(k)).filter(Boolean) as AboutSectionRow[];

  return <AboutSectionsForm sections={sections} />;
}
