import { FooterView } from "@/components/footer-view";
import { getPublicFooter } from "@/lib/footer/server";
export async function SiteFooter() {
  const { config } = await getPublicFooter();
  return <FooterView config={config} />;
}
