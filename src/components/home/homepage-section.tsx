"use client";
import type { Opening, CountryDetail } from "@/lib/unimondo-data";
import type { FeaturedUniversity } from "@/lib/featured-universities";
import type { SuccessStoryRow } from "@/lib/data/success-stories";
import { resolveGlobalHero, resolveSection, valuesOf, publicHeroSlides, type HomeBlock, type SectionId, type HeroSlide, type HeroCopy } from "@/lib/homepage/content";
import { collectionBlock, isSectionVisible, resolvePresentation, resolveCollection, publicItems, destinationCards, featuredItems } from "@/lib/homepage/items";
import { HeroCarousel } from "./hero-carousel";
import { HomeMarketingBanner } from "./home-marketing-banner";
import { WhyUniMondo } from "./why-unimondo";
import { PopularDestinations } from "./popular-destinations";
import { FeaturedPrograms } from "./featured-programs";
import { FeaturedProgramsLive } from "./featured-programs-live";
import { SuccessStoriesSection } from "./success-stories-section";
import { HowItWorks } from "./how-it-works";
import { WhyEurope } from "./why-europe";
import { JourneyCta } from "./journey-cta";
export type HomepageRenderData = { site: Record<string,string>; blocks: HomeBlock[]; openings: Opening[]; countries: CountryDetail[]; universities: FeaturedUniversity[]; stories: SuccessStoryRow[] };
/** A single public-component rendering path shared by the site and the visual editor. */
export function HomepageSection({section, data, slide, preview = false, selectedItem}: { section: SectionId; data: HomepageRenderData; slide?: HeroSlide; preview?: boolean; selectedItem?: string }) {
  if (!preview && !isSectionVisible(data.blocks, section)) return null;
  const p = resolvePresentation(data.blocks, section), refs = {countries:data.countries,programs:data.openings,universities:data.universities,available:true};
  const items = (key: Parameters<typeof resolveCollection>[1]) => resolveCollection(data.blocks,key,refs,data.openings).items;
  if(section === "hero") return <HeroCarousel copy={valuesOf(resolveGlobalHero(data.site)) as HeroCopy} slides={slide ? [{...slide,isActive:true}] : publicHeroSlides(data.blocks)} preview={preview} />;
  const copy = valuesOf(resolveSection(data.blocks, section));
  switch(section) {
    case "marketing_banner": return <HomeMarketingBanner copy={copy} supportingText={String(p.supportingText)} />;
    case "why_unimondo": return <WhyUniMondo {...copy} cards={items("why_cards")} stats={publicItems(items("why_stats")).map(s=>({id:s.id,value:s.value,suffix:s.suffix,label:s.label}))} />;
    case "destinations": return <PopularDestinations copy={copy} cards={destinationCards(items("destinations"),data.countries)} destinationLabel={String(p.destinationLabel)} />;
    case "universities": { const selection = items("featured"); return preview ? <FeaturedPrograms openings={data.openings} featured={featuredItems(selection,refs,data.openings)} cardOptions={p} {...copy} /> : <FeaturedProgramsLive initialOpenings={data.openings} selection={collectionBlock(data.blocks, "featured") ? selection : undefined} references={refs} cardOptions={p} {...copy} />; }
    case "success_stories": return <SuccessStoriesSection stories={data.stories} copy={copy} preview={preview} previewId={selectedItem?.startsWith("stories:") ? selectedItem.slice(8) : undefined} />;
    case "how_it_works": return <HowItWorks copy={copy} steps={items("steps")} />;
    case "why_europe": return <WhyEurope copy={copy} benefits={items("europe_benefits")} facts={items("europe_facts")} imageUrl={String(p.imageUrl)} imageAlt={String(p.imageAlt)} />;
    case "journey_cta": return <JourneyCta copy={copy} options={p} />;
  }
}
