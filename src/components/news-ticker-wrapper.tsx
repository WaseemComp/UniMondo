import { getSiteContent, getTickerEnabled } from "@/lib/data/site-content";
import { getTickerItems } from "@/lib/data/ticker";
import { NewsTicker } from "./news-ticker";

export async function NewsTickerWrapper() {
  const [items, map] = await Promise.all([getTickerItems(), getSiteContent()]);
  return <NewsTicker items={items} enabled={getTickerEnabled(map)} />;
}
