"use client";

import { FeaturedPrograms } from "./featured-programs";
import { HeroCarousel } from "./hero-carousel";
import { HowItWorks } from "./how-it-works";
import { JourneyCta } from "./journey-cta";
import { PopularDestinations } from "./popular-destinations";
import { Testimonials } from "./testimonials";
import { WhyEurope } from "./why-europe";
import { WhyUniMondo } from "./why-unimondo";

/** Full homepage composition: hero + 8 content sections (footer lives in root layout). */
export function HomePage() {
  return (
    <>
      <HeroCarousel />
      <WhyUniMondo />
      <PopularDestinations />
      <FeaturedPrograms />
      <Testimonials />
      <HowItWorks />
      <WhyEurope />
      <JourneyCta />
    </>
  );
}
