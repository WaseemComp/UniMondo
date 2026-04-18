import { HomePage } from "@/components/home/home-page";
import { getOpenings } from "@/lib/data/openings";
import { getSiteContent, siteContentToHeroCopy } from "@/lib/data/site-content";
import { getPublishedSuccessStories } from "@/lib/data/success-stories";

export const revalidate = 60;

export default async function Home() {
  const [openings, contentMap, successStories] = await Promise.all([
    getOpenings(),
    getSiteContent(),
    getPublishedSuccessStories(6),
  ]);
  return (
    <HomePage
      initialOpenings={openings}
      heroCopy={siteContentToHeroCopy(contentMap)}
      successStories={successStories}
    />
  );
}
