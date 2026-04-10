import { HomePage } from "@/components/home/home-page";
import { getOpenings } from "@/lib/data/openings";
import { getSiteContent, siteContentToHeroCopy } from "@/lib/data/site-content";

export const revalidate = 60;

export default async function Home() {
  const [openings, contentMap] = await Promise.all([getOpenings(), getSiteContent()]);
  return <HomePage initialOpenings={openings} heroCopy={siteContentToHeroCopy(contentMap)} />;
}
