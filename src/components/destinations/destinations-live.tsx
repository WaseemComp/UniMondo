"use client";

import { useEffect, useState } from "react";
import type { CountryDetail } from "@/lib/unimondo-data";
import { countryRowToDetail } from "@/lib/cms/maps";
import { DestinationsBrowser } from "@/components/destinations-browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  initialCountries: CountryDetail[];
  initialCountry?: string;
};

function mapRemoteRow(
  row: Record<string, unknown>,
  regionLabelById: Map<number, string>,
): CountryDetail {
  const rid = Number(row.region_group_id);
  const labelFromId = Number.isFinite(rid) ? regionLabelById.get(rid) : undefined;
  const join = row.region_groups as { label?: string } | { label?: string }[] | null | undefined;
  const joinLabel =
    join == null
      ? undefined
      : Array.isArray(join)
        ? join[0]?.label
        : join.label;
  const region_groups =
    labelFromId != null ? { label: labelFromId } : joinLabel ? { label: joinLabel } : null;

  return countryRowToDetail({
    name: row.name as string,
    slug: (row.slug as string | null) ?? null,
    flag_emoji: (row.flag_emoji as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    why_study: (row.why_study as string | null) ?? null,
    why_study_there: (row.why_study_there as string | null) ?? null,
    living_cost: (row.living_cost as string | null) ?? null,
    living_cost_approx: (row.living_cost_approx as string | null) ?? null,
    visa_info: (row.visa_info as string | null) ?? null,
    popular_unis: row.popular_unis,
    popular_universities: (row.popular_universities as string[] | null) ?? null,
    highlighted: (row.highlighted as boolean | null) ?? null,
    region_groups,
  });
}

export function DestinationsLive({ initialCountries, initialCountry }: Props) {
  const [countries, setCountries] = useState(initialCountries);

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const load = async () => {
      const [{ data: rgRows, error: rgErr }, { data, error }] = await Promise.all([
        supabase.from("region_groups").select("id, label").order("sort_order", { ascending: true }),
        supabase
          .from("countries")
          .select(
            `
          name, slug, flag_emoji, description, why_study, why_study_there, living_cost, living_cost_approx,
          visa_info, popular_unis, popular_universities, highlighted, sort_order, region_group_id,
          region_groups ( label )
        `,
          )
          .order("sort_order", { ascending: true }),
      ]);

      if (rgErr || error || !data?.length) return;
      const regionLabelById = new Map<number, string>(
        ((rgRows ?? []) as Array<{ id: number; label: string }>).map((r) => [r.id, r.label]),
      );
      setCountries(data.map((row: Record<string, unknown>) => mapRemoteRow(row, regionLabelById)));
    };

    const channel = supabase
      .channel("countries-destinations")
      .on("postgres_changes", { event: "*", schema: "public", table: "countries" }, () => {
        void load();
      })
      .subscribe();

    void load();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return <DestinationsBrowser initialCountry={initialCountry} countries={countries} />;
}
