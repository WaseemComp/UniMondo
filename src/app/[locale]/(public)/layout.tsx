import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteMarquee } from "@/components/site-marquee";
import { getSiteSettings } from "@/lib/data/site-settings";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ticker = await getSiteSettings();

  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <SiteMarquee initial={ticker} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}

