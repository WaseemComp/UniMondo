import { AboutPartnersManager } from "@/components/admin/cms/about-partners-manager";
import { AboutSectionsForm } from "@/components/admin/cms/about-sections-form";
import { ABOUT_SECTION_ORDER, type AboutPartnerRow, type AboutSectionRow } from "@/lib/data/about-page";
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

  const [{ data, error }, partnersRes] = await Promise.all([
    svc.from("about_sections").select("section_key, title, body"),
    svc
      .from("about_partners")
      .select("id, organization_name, continent, country, region, logo_url, short_description, sort_order, is_published")
      .order("sort_order", { ascending: true }),
  ]);

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

  const partners = (partnersRes.data ?? []) as AboutPartnerRow[];
  const partnersBlock = partnersRes.error ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Could not load partners</p>
      <p className="mt-1">{partnersRes.error.message}</p>
      <p className="mt-2 text-xs text-amber-900/90">
        Apply the latest Supabase migration that creates <code className="rounded bg-white/70 px-1">about_partners</code>.
      </p>
    </div>
  ) : (
    <AboutPartnersManager partners={partners} />
  );

  return (
    <div className="space-y-14">
      <AboutSectionsForm sections={sections} />
      {partnersBlock}
    </div>
  );
}
