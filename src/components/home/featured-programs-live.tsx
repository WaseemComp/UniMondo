"use client";

import { publicProgramme } from "@/lib/academic/public";
import { useEffect, useState } from "react";
import { featuredItems, type HomepageItem, type HomepageReferences } from "@/lib/homepage/items";
import type { Opening } from "@/lib/unimondo-data";
import { programRowToOpening, type ProgramRow } from "@/lib/cms/maps";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { FeaturedPrograms } from "./featured-programs";

type Props = {
  initialOpenings: Opening[]; selection?: HomepageItem[]; references?: HomepageReferences; cardOptions?: Record<string, string | boolean>;
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

async function fetchPublishedPrograms(): Promise<Opening[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("programs")
    .select(
      "*",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return null;
  }
  const [countries,universities]=await Promise.all([supabase.from("countries").select("*"),supabase.from("featured_universities").select("*")]);
  if(countries.error||universities.error)return [];
  return ((data??[]) as ProgramRow[]).filter(row=>publicProgramme(row as unknown as Record<string,unknown>,countries.data??[],universities.data??[])).map(programRowToOpening);
}

export function FeaturedProgramsLive({ initialOpenings, kicker, title, subtitle, ctaLabel, ctaHref, selection, references, cardOptions }: Props) {
  const [openings, setOpenings] = useState(initialOpenings);

  useEffect(() => {
    setOpenings(initialOpenings);
  }, [initialOpenings]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const refresh = async () => {
      const next = await fetchPublishedPrograms();
      if (next !== null) setOpenings(next);
    };

    const channel = supabase
      .channel("programs-featured")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "countries" }, () => {void refresh();})
      .on("postgres_changes", { event: "*", schema: "public", table: "featured_universities" }, () => {void refresh();})
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <FeaturedPrograms featured={selection && references ? featuredItems(selection, references, openings) : undefined} cardOptions={cardOptions} openings={openings} kicker={kicker} title={title} subtitle={subtitle} ctaLabel={ctaLabel} ctaHref={ctaHref} />
  );
}
