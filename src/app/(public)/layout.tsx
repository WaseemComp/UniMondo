import { NewsTickerWrapper } from "@/components/news-ticker-wrapper";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <NewsTickerWrapper />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
