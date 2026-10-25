import type { Metadata } from "next";
import { AboutPageView } from "@/components/about/about-page-view";
import { getAboutPartners, getAboutSections, getTeamMembers } from "@/lib/data/about-page";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "About Us — European Educational Excellence | UniMondo",
  description:
    "Learn about UniMondo's mission, expert educational counseling team, accredited European university partners, and verified student success stories.",
  alternates: {
    canonical: "/about",
  },
};


export default async function AboutPage() {
  const [sections, team, partners] = await Promise.all([getAboutSections(), getTeamMembers(), getAboutPartners()]);
  return <AboutPageView sections={sections} team={team} partners={partners} />;
}

