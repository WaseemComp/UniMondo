import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteTickerBand } from "@/components/site-ticker-band";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getTickerItems } from "@/lib/data/ticker";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [tickerSettings, tickerItems] = await Promise.all([getSiteSettings(), getTickerItems()]);

  return (
    <div className="um-public-theme relative flex min-h-full flex-col bg-[#F4F3EF] text-[#2F3E46] selection:bg-[#E4F1F7] selection:text-[#244B50]">
      <SiteHeader />
      <SiteTickerBand initialSettings={tickerSettings} initialItems={tickerItems} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
