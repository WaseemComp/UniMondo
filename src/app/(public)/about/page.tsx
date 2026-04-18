import { AboutPageView } from "@/components/about/about-page-view";
import { getAboutSections, getTeamMembers } from "@/lib/data/about-page";

export const revalidate = 120;

export default async function AboutPage() {
  const [sections, team] = await Promise.all([getAboutSections(), getTeamMembers()]);
  return <AboutPageView sections={sections} team={team} />;
}
