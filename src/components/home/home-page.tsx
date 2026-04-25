"use client";

import type { Opening } from "@/lib/unimondo-data";
import type { SuccessStoryRow } from "@/lib/data/success-stories";
import { FeaturedProgramsLive } from "./featured-programs-live";
import { HeroCarousel, type HeroCopy, type HeroSlide } from "./hero-carousel";
import { HomeMarketingBanner, type HomeMarketingBannerCopy } from "./home-marketing-banner";
import { HowItWorks, type HowItWorksCopy } from "./how-it-works";
import { JourneyCta, type JourneyCtaCopy } from "./journey-cta";
import { PopularDestinations, type DestinationsCopy } from "./popular-destinations";
import { SuccessStoriesSection } from "./success-stories-section";
import { WhyEurope, type WhyEuropeCopy } from "./why-europe";
import { WhyUniMondo, type WhyUniMondoStat } from "./why-unimondo";

type Props = {
  initialOpenings: Opening[];
  heroCopy: HeroCopy;
  heroSlides?: HeroSlide[];
  marketingBannerCopy?: HomeMarketingBannerCopy;
  whyUniMondoCopy?: { kicker?: string; title?: string; subtitle?: string; stats?: WhyUniMondoStat[] };
  destinationsCopy?: DestinationsCopy;
  universitiesSectionCopy?: { kicker?: string; title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string };
  successStories: SuccessStoryRow[];
  howItWorksCopy?: HowItWorksCopy;
  whyEuropeCopy?: WhyEuropeCopy;
  journeyCtaCopy?: JourneyCtaCopy;
};

/** Full homepage composition: hero + 8 content sections (footer lives in root layout). */
export function HomePage({
  initialOpenings,
  heroCopy,
  heroSlides,
  marketingBannerCopy,
  whyUniMondoCopy,
  destinationsCopy,
  universitiesSectionCopy,
  successStories,
  howItWorksCopy,
  whyEuropeCopy,
  journeyCtaCopy,
}: Props) {
  return (
    <>
      <HeroCarousel copy={heroCopy} slides={heroSlides} />
      <HomeMarketingBanner copy={marketingBannerCopy} />
      <WhyUniMondo {...(whyUniMondoCopy ?? {})} />
      <PopularDestinations copy={destinationsCopy} />
      <FeaturedProgramsLive initialOpenings={initialOpenings} {...(universitiesSectionCopy ?? {})} />
      <SuccessStoriesSection stories={successStories} />
      <HowItWorks copy={howItWorksCopy} />
      <WhyEurope copy={whyEuropeCopy} />
      <JourneyCta copy={journeyCtaCopy} />
    </>
  );
}
