import { HomePage } from "@/components/home/home-page";
import { getOpenings } from "@/lib/data/openings";
import { getCmsBlocks } from "@/lib/data/cms-content";
import { getSiteContent, siteContentToHeroCopy } from "@/lib/data/site-content";
import { getPublishedSuccessStories } from "@/lib/data/success-stories";
import { publicHeroSlides, resolveSection, valuesOf } from "@/lib/homepage/content";

export const revalidate = 60;

export default async function Home() {
  const [openings, content, stories, blocks] = await Promise.all([getOpenings(), getSiteContent(), getPublishedSuccessStories(6), getCmsBlocks("home")]);
  return <HomePage initialOpenings={openings} heroCopy={siteContentToHeroCopy(content)} heroSlides={publicHeroSlides(blocks)}
    marketingBannerCopy={valuesOf(resolveSection(blocks, "marketing_banner"))}
    whyUniMondoCopy={valuesOf(resolveSection(blocks, "why_unimondo"))}
    destinationsCopy={valuesOf(resolveSection(blocks, "destinations"))}
    universitiesSectionCopy={valuesOf(resolveSection(blocks, "universities"))}
    successStories={stories} successStoriesCopy={valuesOf(resolveSection(blocks, "success_stories"))}
    howItWorksCopy={valuesOf(resolveSection(blocks, "how_it_works"))}
    whyEuropeCopy={valuesOf(resolveSection(blocks, "why_europe"))}
    journeyCtaCopy={valuesOf(resolveSection(blocks, "journey_cta"))} />;
}
