"use client";

import type { Opening } from "@/lib/unimondo-data";
import type { SuccessStoryRow } from "@/lib/data/success-stories";
import { FeaturedProgramsLive } from "./featured-programs-live";
import { HeroCarousel, type HeroCopy } from "./hero-carousel";
import { HomeMarketingBanner } from "./home-marketing-banner";
import { HowItWorks } from "./how-it-works";
import { JourneyCta } from "./journey-cta";
import { PopularDestinations } from "./popular-destinations";
import { SuccessStoriesSection } from "./success-stories-section";
import { WhyEurope } from "./why-europe";
import { WhyUniMondo } from "./why-unimondo";

type Props = {
  initialOpenings: Opening[];
  heroCopy: HeroCopy;
  successStories: SuccessStoryRow[];
};

/** Full homepage composition: hero + 8 content sections (footer lives in root layout). */
export function HomePage({ initialOpenings, heroCopy, successStories }: Props) {
  return (
    <>
      <HeroCarousel copy={heroCopy} />
      <HomeMarketingBanner />
      <WhyUniMondo />
      <PopularDestinations />
      <FeaturedProgramsLive initialOpenings={initialOpenings} />
      <SuccessStoriesSection stories={successStories} />
      <HowItWorks />
      <WhyEurope />
      <JourneyCta />
    </>
  );
}
