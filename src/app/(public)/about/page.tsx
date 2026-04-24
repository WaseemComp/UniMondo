import { AboutPageView } from "@/components/about/about-page-view";
import { getAboutPartners, getAboutSections, getTeamMembers } from "@/lib/data/about-page";

export const revalidate = 120;

export default async function AboutPage() {
  const [sections, team, partners] = await Promise.all([getAboutSections(), getTeamMembers(), getAboutPartners()]);
  return <AboutPageView sections={sections} team={team} partners={partners} />;
}
