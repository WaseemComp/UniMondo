"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/data/site-settings";
import type { TickerItem } from "@/lib/data/ticker";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  initialSettings: SiteSettings;
  initialItems: TickerItem[];
};

export function SiteTickerBand({ initialSettings, initialItems }: Props) {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const load = async () => {
      const { data } = await supabase.from("site_settings").select("ticker_text, ticker_active").eq("id", 1).maybeSingle();
      if (data) {
        setSettings({
          tickerText: String(data.ticker_text ?? ""),
          tickerActive: Boolean(data.ticker_active),
        });
      }
    };

    const channel = supabase
      .channel("site-ticker-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "id=eq.1" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!settings.tickerActive) {
    return null;
  }

  const items = initialItems;
  if (items.length > 0) {
    const segment = (keyPrefix: string) => (
      <>
        {items.map((item, idx) => (
          <span key={`${keyPrefix}-${item.id}`} className="inline-flex shrink-0 items-center px-5 sm:px-8">
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium text-amber-100/95 underline-offset-2 hover:text-white hover:underline"
              >
                {item.message}
              </Link>
            ) : (
              <span className="font-medium text-amber-100/95">{item.message}</span>
            )}
            {idx < items.length - 1 ? (
              <span className="ml-5 text-amber-500/55 sm:ml-8" aria-hidden>
                ·
              </span>
            ) : null}
          </span>
        ))}
      </>
    );

    return (
      <div
        className="relative overflow-hidden border-b border-amber-400/20 bg-gradient-to-r from-[#071225] via-[#0a1f42] to-[#071225]"
        role="region"
        aria-label="Site announcements"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#071225] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#071225] to-transparent" />
        <div className="unimondo-marquee-track py-2.5 text-[13px] font-medium tracking-wide sm:text-sm">
          <span className="inline-flex shrink-0 items-center">{segment("a")}</span>
          <span className="inline-flex shrink-0 items-center" aria-hidden>
            {segment("b")}
          </span>
        </div>
      </div>
    );
  }

  const text = settings.tickerText.trim();
  if (!text) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden border-b border-amber-400/20 bg-gradient-to-r from-[#071225] via-[#0a1f42] to-[#071225]"
      role="region"
      aria-label="Site announcements"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#071225] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#071225] to-transparent" />
      <div className="unimondo-marquee-track py-2.5 text-[13px] font-medium tracking-wide text-amber-100/95 sm:text-sm">
        <span className="inline-flex shrink-0 items-center px-10">{text}</span>
        <span className="inline-flex shrink-0 items-center px-10" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  );
}
