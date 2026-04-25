import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getSiteContent } from "@/lib/data/site-content";
import { HomeContentForm } from "@/components/admin/home-content-form";
import { HomeHeroSliderManager, type HomeHeroSlideRow } from "@/components/admin/cms/home-hero-slider-manager";
import { SimpleSectionCopyForm } from "@/components/admin/cms/simple-section-copy-form";

export default async function AdminHomeCmsPage() {
  await assertAdminScope("content");

  const initialSiteContent = await getSiteContent();
  const svc = createSupabaseServiceClient();
  let slides: HomeHeroSlideRow[] = [];
  const copyBlocks: { section_key: string; block_key: string; id: string; is_active: boolean; sort_order: number; content: Record<string, unknown> | null }[] =
    [];

  if (svc) {
    const { data } = await svc
      .from("cms_content_blocks")
      .select("id, is_active, sort_order, content, media, section_key, block_key")
      .eq("page_slug", "home")
      .order("sort_order", { ascending: true });
    const rows = (data ?? []) as any[];
    slides = rows
      .filter((r) => r.section_key === "hero_slider" && r.block_key === "slide")
      .map((r) => ({ id: r.id, is_active: r.is_active, sort_order: r.sort_order, content: r.content, media: r.media })) as HomeHeroSlideRow[];
    rows
      .filter((r) => r.block_key === "copy")
      .forEach((r) => copyBlocks.push(r));
  }

  const findCopy = (section_key: string) => copyBlocks.find((b) => b.section_key === section_key && b.block_key === "copy") ?? null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Home</h1>
        <p className="mt-1 text-sm text-zinc-600">
          CMS-style content editor for the homepage. Layout and sections are fixed by code; only content is editable.
        </p>
      </div>

      <HomeHeroSliderManager slides={slides} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleSectionCopyForm
          title="Marketing banner"
          description="Standalone homepage strip under the hero."
          pageSlug="home"
          sectionKey="marketing_banner"
          blockKey="copy"
          permissionKey="home.edit"
          revalidatePaths={["/"]}
          existing={findCopy("marketing_banner")}
          fields={[
            { key: "text", label: "Text (before highlight)", type: "text" },
            { key: "highlight", label: "Highlight (price)", type: "text" },
            { key: "ctaLabel", label: "Button label", type: "text" },
            { key: "ctaHref", label: "Button link", type: "text" },
          ]}
        />

        <SimpleSectionCopyForm
          title="Destinations (section header)"
          description="Edits the header and CTA above the destinations cards. Cards themselves remain fixed for safety (for now)."
          pageSlug="home"
          sectionKey="destinations"
          blockKey="copy"
          permissionKey="home.edit"
          revalidatePaths={["/"]}
          existing={findCopy("destinations")}
          fields={[
            { key: "kicker", label: "Kicker", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
            { key: "ctaLabel", label: "CTA label", type: "text" },
            { key: "ctaHref", label: "CTA link", type: "text" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleSectionCopyForm
          title="Universities & Programs (section header)"
          description="Edits the header shown above the featured programs grid."
          pageSlug="home"
          sectionKey="universities"
          blockKey="copy"
          permissionKey="home.edit"
          revalidatePaths={["/"]}
          existing={findCopy("universities")}
          fields={[
            { key: "kicker", label: "Kicker", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
            { key: "ctaLabel", label: "CTA label", type: "text" },
            { key: "ctaHref", label: "CTA link", type: "text" },
          ]}
        />

        <SimpleSectionCopyForm
          title="How it works (header)"
          description="Edits the section header above the 5-step process."
          pageSlug="home"
          sectionKey="how_it_works"
          blockKey="copy"
          permissionKey="home.edit"
          revalidatePaths={["/"]}
          existing={findCopy("how_it_works")}
          fields={[
            { key: "kicker", label: "Kicker", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleSectionCopyForm
          title="Why Europe"
          description="Edits the headline, paragraph, and quick facts. Bullets remain fixed for safety (for now)."
          pageSlug="home"
          sectionKey="why_europe"
          blockKey="copy"
          permissionKey="home.edit"
          revalidatePaths={["/"]}
          existing={findCopy("why_europe")}
          fields={[
            { key: "kicker", label: "Kicker", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
            { key: "quickFact1Label", label: "Quick fact 1 label", type: "text" },
            { key: "quickFact1Value", label: "Quick fact 1 value", type: "text" },
            { key: "quickFact2Label", label: "Quick fact 2 label", type: "text" },
            { key: "quickFact2Value", label: "Quick fact 2 value", type: "text" },
          ]}
        />

        <SimpleSectionCopyForm
          title="Ready when you are (CTA)"
          description="Edits the final CTA section (title/description/button text)."
          pageSlug="home"
          sectionKey="journey_cta"
          blockKey="copy"
          permissionKey="home.cta.edit"
          revalidatePaths={["/"]}
          existing={findCopy("journey_cta")}
          fields={[
            { key: "kicker", label: "Kicker", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "buttonText", label: "Button text", type: "text" },
          ]}
        />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Hero copy (global)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            These values are used as defaults across the hero slider (per-slide overrides are optional).
          </p>
        </div>
        <HomeContentForm initial={initialSiteContent} />
      </div>
    </div>
  );
}

