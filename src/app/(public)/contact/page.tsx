import { ContactPageShell } from "@/components/contact/contact-page-shell";
import { getContactPageData } from "@/lib/data/contact-page";

export const revalidate = 120;

export default async function ContactPage() {
  const contact = await getContactPageData();
  return <ContactPageShell contact={contact} />;
}
