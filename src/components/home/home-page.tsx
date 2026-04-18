"use client";

import type { Opening } from "@/lib/unimondo-data";
import { FeaturedProgramsLive } from "./featured-programs-live";
import { HeroCarousel, type HeroCopy } from "./hero-carousel";
import { HomeMarketingBanner } from "./home-marketing-banner";
import { HowItWorks } from "./how-it-works";
import { JourneyCta } from "./journey-cta";
import { PopularDestinations } from "./popular-destinations";
import { Testimonials } from "./testimonials";
import { WhyEurope } from "./why-europe";
import { WhyUniMondo } from "./why-unimondo";

type Props = {
  initialOpenings: Opening[];
  heroCopy: HeroCopy;
};

/** Full homepage composition: hero + 8 content sections (footer lives in root layout). */
export function HomePage({ initialOpenings, heroCopy }: Props) {
  return (
    <>
      <HeroCarousel copy={heroCopy} />
      <HomeMarketingBanner />
      <WhyUniMondo />
      <PopularDestinations />
      <FeaturedProgramsLive initialOpenings={initialOpenings} />
      <Testimonials />
      <HowItWorks />
      <WhyEurope />
      <JourneyCta />
    </>
  );
}
