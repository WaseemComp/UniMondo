"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRegion, saveRegion } from "@/app/admin/cms/regions-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegionGroupRow } from "@/components/admin/cms/countries-manager";

type Props = {
  regions: RegionGroupRow[];
};

const emptyDraft = (): Partial<RegionGroupRow> & { id?: number } => ({
  label: "",
  continent: "Europe",
  sort_order: 0,
});

export function RegionsManager({ regions: initial }: Props) {
  const router = useRouter();
  const [regions, setRegions] = useState(initial);
  const [draft, setDraft] = useState<Partial<RegionGroupRow> & { id?: number }>(emptyDraft());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRegions(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({
      ...emptyDraft(),
      sort_order: (regions[regions.length - 1]?.sort_order ?? -1) + 1,
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: RegionGroupRow) => {
    setDraft({ ...row });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveRegion({
        id: draft.id,
        label: draft.label ?? "",
        continent: draft.continent ?? "Europe",
        sort_order: Number(draft.sort_order ?? 0),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Region saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: number) => {
    if (!confirm("Delete this region? Countries must be reassigned first if they use it.")) return;
    startTransition(async () => {
      const res = await deleteRegion(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Region deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Regions</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Region labels appear in the Countries admin form and on the public Destinations page. Add a continent label
            to group regions geographically (e.g. Europe, Asia).
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add region
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All regions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Continent</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {regions.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{r.label}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.continent ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.sort_order}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => onDelete(r.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No regions loaded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit region" : "New region"}</h2>
          <div>
            <Label htmlFor="rlabel">Region label</Label>
            <Input
              id="rlabel"
              required
              value={draft.label ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="e.g. Western Europe"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="rcont">Continent</Label>
            <Input
              id="rcont"
              value={draft.continent ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, continent: e.target.value }))}
              placeholder="e.g. Europe"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-zinc-500">Shown next to the region in admin pickers; free text.</p>
          </div>
          <div>
            <Label htmlFor="rsort">Sort order</Label>
            <Input
              id="rsort"
              type="number"
              value={draft.sort_order ?? 0}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              className="mt-1.5 max-w-[120px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-amber-600 text-white hover:bg-amber-500">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
