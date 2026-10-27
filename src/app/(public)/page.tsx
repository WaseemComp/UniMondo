import { HomePage } from "@/components/home/home-page";
import { getOpenings } from "@/lib/data/openings";
import { getCountryDetails } from "@/lib/data/countries";
import { getFeaturedUniversities } from "@/lib/data/featured-universities";
import { getCmsBlocks } from "@/lib/data/cms-content";
import { getSiteContent, siteContentToHeroCopy } from "@/lib/data/site-content";
import { getPublishedSuccessStories } from "@/lib/data/success-stories";
export const revalidate = 60;
export default async function Home() {
  const [openings, site, stories, blocks, countries, universities] = await Promise.all([getOpenings(), getSiteContent(), getPublishedSuccessStories(6), getCmsBlocks("home"), getCountryDetails(), getFeaturedUniversities()]);
  return <HomePage initialOpenings={openings} heroCopy={siteContentToHeroCopy(site)} site={site} blocks={blocks} countries={countries} universities={universities} successStories={stories} />;
}
