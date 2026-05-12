"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCountry, saveCountry } from "@/app/admin/cms/countries-actions";
import {
  destinationGuideForForm,
  emptyDestinationGuide,
  type DestinationGuide,
} from "@/lib/destination-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type RegionGroupRow = { id: number; label: string; continent?: string | null; sort_order?: number | null };

export type CountryAdminRow = {
  id: string;
  name: string;
  slug: string | null;
  flag_emoji: string | null;
  description: string | null;
  why_study: string | null;
  why_study_there: string | null;
  living_cost: string | null;
  living_cost_approx: string | null;
  visa_info: string | null;
  popular_unis: unknown;
  popular_universities: string[] | null;
  region_group_id: number;
  highlighted: boolean | null;
  sort_order: number | null;
  destination_guide?: unknown;
};

type Props = {
  countries: CountryAdminRow[];
  regions: RegionGroupRow[];
};

function popularLinesFromRow(row: CountryAdminRow): string {
  const fromJson = Array.isArray(row.popular_unis)
    ? (row.popular_unis as unknown[]).map(String)
    : row.popular_universities ?? [];
  return fromJson.join("\n");
}

type DraftState = Partial<CountryAdminRow> & {
  popularLines?: string;
  destinationGuide?: DestinationGuide;
};

export function CountriesManager({ countries: initial, regions }: Props) {
  const router = useRouter();
  const [countries, setCountries] = useState(initial);
  const [draft, setDraft] = useState<DraftState>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCountries(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({
      region_group_id: regions[0]?.id ?? 1,
      highlighted: false,
      sort_order: (countries[countries.length - 1]?.sort_order ?? -1) + 1,
      name: "",
      slug: "",
      flag_emoji: "",
      description: "",
      why_study: "",
      living_cost: "",
      visa_info: "",
      popularLines: "",
      destinationGuide: destinationGuideForForm(undefined),
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: CountryAdminRow) => {
    setDraft({
      ...row,
      popularLines: popularLinesFromRow(row),
      why_study: row.why_study?.trim() || row.why_study_there || "",
      living_cost: row.living_cost?.trim() || row.living_cost_approx || "",
      slug: row.slug ?? "",
      flag_emoji: row.flag_emoji ?? "",
      description: row.description ?? "",
      destinationGuide: destinationGuideForForm(row.destination_guide),
    });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const lines = (draft.popularLines ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        id: draft.id,
        name: draft.name ?? "",
        slug: (draft.slug ?? "").trim().toLowerCase(),
        flag_emoji: draft.flag_emoji ?? "",
        description: draft.description ?? "",
        why_study: draft.why_study ?? "",
        living_cost: draft.living_cost ?? "",
        visa_info: draft.visa_info ?? "",
        popular_unis: lines,
        region_group_id: Number(draft.region_group_id),
        highlighted: Boolean(draft.highlighted),
        sort_order: Number(draft.sort_order ?? 0),
        destination_guide: draft.destinationGuide ?? emptyDestinationGuide(),
      };
      const res = await saveCountry(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Country saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this country?")) return;
    startTransition(async () => {
      const res = await deleteCountry(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Countries</h1>
          <p className="mt-1 text-sm text-zinc-600">
          Country copy for <code className="rounded bg-zinc-100 px-1">/destinations</code>. Matches sections A–E on the
          public destination guide (overview, costs, visa, universities list, and programs from the Programs CMS).
        </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add country
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All countries</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.flag_emoji ? <span className="mr-1">{row.flag_emoji}</span> : null}
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.slug}</td>
                  <td className="px-4 py-3">{row.highlighted ? "Yes" : ""}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!countries.length && <p className="p-6 text-center text-sm text-zinc-500">No countries in database.</p>}
        </CardContent>
      </Card>

      <dialog
        ref={dialogRef}
        className="w-[min(100%,42rem)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit country" : "New country"}</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  required
                  placeholder="italy"
                  value={draft.slug ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="flag">Flag emoji</Label>
                <Input
                  id="flag"
                  placeholder="Optional emoji"
                  value={draft.flag_emoji ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, flag_emoji: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rg">Region group</Label>
                <select
                  id="rg"
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                  value={draft.region_group_id ?? regions[0]?.id}
                  onChange={(e) => setDraft((d) => ({ ...d, region_group_id: Number(e.target.value) }))}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                      {r.continent?.trim() ? ` — ${r.continent.trim()}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="desc">Short description</Label>
              <Textarea
                id="desc"
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">A. Overview</h3>
              <p className="mt-1 text-xs text-zinc-500">
                “Why study” maps to the first block on the public page; other fields override the generic template text.
              </p>
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="why">Why study in this country</Label>
                  <Textarea
                    id="why"
                    required
                    value={draft.why_study ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, why_study: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edu">Education system overview</Label>
                  <Textarea
                    id="edu"
                    rows={3}
                    placeholder="Optional — overrides the default Bologna-framework paragraph"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).overview?.educationSystem ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            overview: { ...cur.overview, educationSystem: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cities">Popular cities &amp; student lifestyle</Label>
                  <Textarea
                    id="cities"
                    rows={3}
                    placeholder="Optional — overrides the regional lifestyle paragraph"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).overview?.popularCitiesLifestyle ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            overview: { ...cur.overview, popularCitiesLifestyle: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sch">Scholarship opportunities</Label>
                  <Textarea
                    id="sch"
                    rows={3}
                    placeholder="Optional — overrides the default scholarships paragraph"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).overview?.scholarships ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            overview: { ...cur.overview, scholarships: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900">B. Cost information</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Monthly budget maps to “Monthly living budget”. Tuition band usually comes from published programs; use the
                override only when you need a manual band.
              </p>
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="living">Monthly living budget</Label>
                  <Input
                    id="living"
                    required
                    placeholder="e.g. EUR 1,100 - 1,700/month"
                    value={draft.living_cost ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, living_cost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tuition-note">Tuition fee range (override)</Label>
                  <Input
                    id="tuition-note"
                    placeholder="Leave blank to use tuition computed from Programs CMS"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).costs?.tuitionBandNote ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            costs: { ...cur.costs, tuitionBandNote: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="acc">Accommodation estimate</Label>
                  <Textarea
                    id="acc"
                    rows={2}
                    placeholder="Optional"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).costs?.accommodation ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            costs: { ...cur.costs, accommodation: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="food">Food / transport estimate</Label>
                  <Textarea
                    id="food"
                    rows={2}
                    placeholder="Optional"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).costs?.foodTransport ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            costs: { ...cur.costs, foodTransport: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pof">Proof of funds note</Label>
                  <Textarea
                    id="pof"
                    rows={2}
                    placeholder="Optional"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).costs?.proofOfFunds ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            costs: { ...cur.costs, proofOfFunds: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">C. Visa information</h3>
              <p className="mt-1 text-xs text-zinc-500">
                If any structured field below is filled, the public page uses section C from these fields (not fallback prose).
                You cannot save both structured visa content and fallback prose — clear one side.
              </p>
              <div className="mt-4 grid gap-4">
                <div className="space-y-1">
                  <Label htmlFor="vtype">Student visa type</Label>
                  <Input
                    id="vtype"
                    value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.studentVisaType ?? ""}
                    onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            visa: { ...cur.visa, studentVisaType: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vmain">Main requirements</Label>
                  <Textarea id="vmain" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.mainRequirements ?? ""} onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            visa: { ...cur.visa, mainRequirements: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="vadmit">Proof of admission</Label>
                    <Textarea id="vadmit" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.proofOfAdmission ?? ""} onChange={(e) =>
                        setDraft((d) => {
                          const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                          return {
                            ...d,
                            destinationGuide: {
                              ...cur,
                              visa: { ...cur.visa, proofOfAdmission: e.target.value },
                            },
                          };
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vfunds">Proof of funds</Label>
                    <Textarea id="vfunds" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.proofOfFunds ?? ""} onChange={(e) =>
                        setDraft((d) => {
                          const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                          return {
                            ...d,
                            destinationGuide: {
                              ...cur,
                              visa: { ...cur.visa, proofOfFunds: e.target.value },
                            },
                          };
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="vins">Insurance</Label>
                    <Textarea id="vins" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.insurance ?? ""} onChange={(e) =>
                        setDraft((d) => {
                          const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                          return {
                            ...d,
                            destinationGuide: {
                              ...cur,
                              visa: { ...cur.visa, insurance: e.target.value },
                            },
                          };
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vacc">Accommodation evidence</Label>
                    <Textarea id="vacc" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.accommodation ?? ""} onChange={(e) =>
                        setDraft((d) => {
                          const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                          return {
                            ...d,
                            destinationGuide: {
                              ...cur,
                              visa: { ...cur.visa, accommodation: e.target.value },
                            },
                          };
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vemb">Embassy appointment note</Label>
                  <Textarea id="vemb" rows={2} value={(draft.destinationGuide ?? destinationGuideForForm(undefined)).visa?.embassyNote ?? ""} onChange={(e) =>
                      setDraft((d) => {
                        const cur = d.destinationGuide ?? destinationGuideForForm(undefined);
                        return {
                          ...d,
                          destinationGuide: {
                            ...cur,
                            visa: { ...cur.visa, embassyNote: e.target.value },
                          },
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1 border-t border-zinc-200 pt-4">
                  <Label htmlFor="visa">Visa notes (fallback prose)</Label>
                  <Textarea
                    id="visa"
                    rows={3}
                    placeholder="Required only when all structured visa fields above are empty; sentences become bullets."
                    value={draft.visa_info ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, visa_info: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="unis">D. Also popular — university names (one per line)</Label>
              <p className="text-xs text-zinc-500">
                Large spotlight cards (hero, QS rank, flagship programs) are edited under{" "}
                <span className="font-medium text-zinc-700">Destinations → Featured universities</span>; use the exact same{" "}
                <span className="font-medium text-zinc-700">Country</span> name as this row.
              </p>
              <Textarea
                id="unis"
                required
                className="mt-2"
                value={draft.popularLines ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, popularLines: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sort">Sort order</Label>
                <Input
                  id="sort"
                  type="number"
                  value={draft.sort_order ?? 0}
                  onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="hi"
                  type="checkbox"
                  checked={Boolean(draft.highlighted)}
                  onChange={(e) => setDraft((d) => ({ ...d, highlighted: e.target.checked }))}
                />
                <Label htmlFor="hi" className="font-normal">
                  Priority highlight
                </Label>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-zinc-900 text-white">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
