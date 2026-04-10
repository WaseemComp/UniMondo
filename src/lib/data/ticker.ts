import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TickerItem = {
  id: string;
  message: string;
  href: string | null;
  sortOrder: number;
};

export async function getTickerItems(): Promise<TickerItem[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return [
      { id: "1", message: "Fall 2026 & Spring 2027 intakes — book a free consultation.", href: "/contact", sortOrder: 1 },
      {
        id: "2",
        message: "See new programs in Italy, Germany & Netherlands.",
        href: "/current-openings",
        sortOrder: 2,
      },
    ];
  }

  const { data, error } = await supabase
    .from("news_ticker_items")
    .select("id, message, href, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return [
      { id: "1", message: "Fall 2026 & Spring 2027 intakes — book a free consultation.", href: "/contact", sortOrder: 1 },
    ];
  }

  return (data as { id: string; message: string; href: string | null; sort_order: number }[]).map((r) => ({
    id: r.id,
    message: r.message,
    href: r.href,
    sortOrder: r.sort_order,
  }));
}
