import { HomePage } from "@/components/home/home-page";
import { getOpenings } from "@/lib/data/openings";
import { getCmsBlocks, pickLocaleText } from "@/lib/data/cms-content";
import { getSiteContent, siteContentToHeroCopy } from "@/lib/data/site-content";
import { getPublishedSuccessStories } from "@/lib/data/success-stories";

export const revalidate = 60;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function blockCopy(homeBlocks: Awaited<ReturnType<typeof getCmsBlocks>>, sectionKey: string, blockKey: string) {
  const b = homeBlocks.find((x) => x.section_key === sectionKey && x.block_key === blockKey);
  const c = asRecord(b?.content);
  const pick = (k: string) => (pickLocaleText(c[k]) ?? (typeof c[k] === "string" ? (c[k] as string) : undefined) ?? "") as string;
  return { pick };
}

export default async function Home() {
  const [openings, contentMap, successStories, homeBlocks] = await Promise.all([
    getOpenings(),
    getSiteContent(),
    getPublishedSuccessStories(6),
    getCmsBlocks("home"),
  ]);

  const heroSlides = homeBlocks
    .filter((b) => b.section_key === "hero_slider" && b.block_key === "slide")
    .map((b) => {
      const c = asRecord(b.content);
      const m = asRecord(b.media);
      const src = String(m.imageUrl ?? m.src ?? "");
      const alt = String(m.imageAlt ?? m.alt ?? "");
      const line = String(pickLocaleText(c.line) ?? c.line ?? "");
      const title = String(pickLocaleText(c.title) ?? c.title ?? "");
      const subtitle = String(pickLocaleText(c.subtitle) ?? c.subtitle ?? "");
      const ctaExplore = String(pickLocaleText(c.buttonText) ?? c.buttonText ?? "");
      const ctaApply = String(pickLocaleText(c.secondaryButtonText) ?? c.secondaryButtonText ?? "");
      return {
        src,
        alt,
        line: line || alt || "",
        title: title || undefined,
        subtitle: subtitle || undefined,
        ctaExplore: ctaExplore || undefined,
        ctaApply: ctaApply || undefined,
        isActive: b.is_active,
      };
    })
    .filter((s) => Boolean(s.src));

  return (
    <HomePage
      initialOpenings={openings}
      heroCopy={siteContentToHeroCopy(contentMap)}
      heroSlides={heroSlides.length ? heroSlides : undefined}
      marketingBannerCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "marketing_banner", "copy");
        const text = pick("text");
        const highlight = pick("highlight");
        const ctaLabel = pick("ctaLabel");
        const ctaHref = pick("ctaHref");
        return text || highlight || ctaLabel || ctaHref
          ? {
              text: text || "Start your European journey with UniMondo from as low as",
              highlight: highlight || "$150",
              ctaLabel: ctaLabel || "Our packages",
              ctaHref: ctaHref || "/packages",
            }
          : undefined;
      })()}
      destinationsCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "destinations", "copy");
        const kicker = pick("kicker");
        const title = pick("title");
        const subtitle = pick("subtitle");
        const ctaLabel = pick("ctaLabel");
        const ctaHref = pick("ctaHref");
        return kicker || title || subtitle || ctaLabel || ctaHref
          ? { kicker: kicker || undefined, title: title || undefined, subtitle: subtitle || undefined, ctaLabel: ctaLabel || undefined, ctaHref: ctaHref || undefined }
          : undefined;
      })()}
      universitiesSectionCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "universities", "copy");
        const kicker = pick("kicker");
        const title = pick("title");
        const subtitle = pick("subtitle");
        const ctaLabel = pick("ctaLabel");
        const ctaHref = pick("ctaHref");
        return kicker || title || subtitle || ctaLabel || ctaHref
          ? { kicker: kicker || undefined, title: title || undefined, subtitle: subtitle || undefined, ctaLabel: ctaLabel || undefined, ctaHref: ctaHref || undefined }
          : undefined;
      })()}
      howItWorksCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "how_it_works", "copy");
        const kicker = pick("kicker");
        const title = pick("title");
        const subtitle = pick("subtitle");
        return kicker || title || subtitle ? { kicker: kicker || undefined, title: title || undefined, subtitle: subtitle || undefined } : undefined;
      })()}
      whyEuropeCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "why_europe", "copy");
        const kicker = pick("kicker");
        const title = pick("title");
        const subtitle = pick("subtitle");
        const quickFact1Label = pick("quickFact1Label");
        const quickFact1Value = pick("quickFact1Value");
        const quickFact2Label = pick("quickFact2Label");
        const quickFact2Value = pick("quickFact2Value");
        return kicker || title || subtitle || quickFact1Value || quickFact2Value
          ? {
              kicker: kicker || undefined,
              title: title || undefined,
              subtitle: subtitle || undefined,
              quickFact1Label: quickFact1Label || undefined,
              quickFact1Value: quickFact1Value || undefined,
              quickFact2Label: quickFact2Label || undefined,
              quickFact2Value: quickFact2Value || undefined,
            }
          : undefined;
      })()}
      journeyCtaCopy={(() => {
        const { pick } = blockCopy(homeBlocks, "journey_cta", "copy");
        const kicker = pick("kicker");
        const title = pick("title");
        const description = pick("description");
        const buttonText = pick("buttonText");
        return kicker || title || description || buttonText
          ? { kicker: kicker || undefined, title: title || undefined, description: description || undefined, buttonText: buttonText || undefined }
          : undefined;
      })()}
      successStories={successStories}
    />
  );
}
