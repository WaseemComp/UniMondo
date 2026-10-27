"use client";
import type { Opening, CountryDetail } from "@/lib/unimondo-data";
import type { FeaturedUniversity } from "@/lib/featured-universities";
import type { SuccessStoryRow } from "@/lib/data/success-stories";
import { HOME_SECTIONS, type HomeBlock, type HeroCopy, type HeroSlide } from "@/lib/homepage/content";
import { HomepageSection } from "./homepage-section";
type Props = { initialOpenings: Opening[]; heroCopy: HeroCopy; heroSlides?: HeroSlide[]; successStories: SuccessStoryRow[]; blocks: HomeBlock[]; countries: CountryDetail[]; universities: FeaturedUniversity[]; site: Record<string,string> };
export function HomePage({initialOpenings, successStories, blocks, countries, universities, site}: Props) {
  const data = {site,blocks,countries,universities,openings:initialOpenings,stories:successStories};
  return <>{HOME_SECTIONS.map(section=><HomepageSection key={section.id} section={section.id} data={data} />)}</>;
}
