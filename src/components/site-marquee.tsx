"use client";

import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/data/site-settings";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  initial: SiteSettings;
};

export function SiteMarquee({ initial }: Props) {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    setSettings(initial);
  }, [initial]);

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
      .channel("site-settings-live")
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

  if (!settings.tickerActive || !settings.tickerText.trim()) {
    return null;
  }

  const text = settings.tickerText.trim();

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
