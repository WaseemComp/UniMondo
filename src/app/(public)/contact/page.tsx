import type { Metadata } from "next";
import { ContactPageShell } from "@/components/contact/contact-page-shell";
import { getContactPageData } from "@/lib/data/contact-page";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Contact Us & Regional Offices | UniMondo",
  description:
    "Get in touch with UniMondo's European study advisors. Explore regional offices, partnership inquiries, or careers in international education.",
  alternates: {
    canonical: "/contact",
  },
};


export default async function ContactPage() {
  const contact = await getContactPageData();
  return <ContactPageShell contact={contact} />;
}

