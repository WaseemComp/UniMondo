"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAboutPartner, saveAboutPartner, uploadAboutPartnerLogo } from "@/app/admin/cms/about-partners-actions";
import type { AboutPartnerRow } from "@/lib/data/about-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type Props = {
  partners: AboutPartnerRow[];
};

const emptyDraft = (): Partial<AboutPartnerRow> => ({
  organization_name: "",
  continent: "",
  country: "",
  region: "",
  logo_url: "",
  short_description: "",
  sort_order: 0,
  is_published: true,
});

export function AboutPartnersManager({ partners: initial }: Props) {
  const router = useRouter();
  const [partners, setPartners] = useState(initial);
  const [draft, setDraft] = useState<Partial<AboutPartnerRow>>(emptyDraft());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPartners(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({
      ...emptyDraft(),
      sort_order: (partners[partners.length - 1]?.sort_order ?? -1) + 1,
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: AboutPartnerRow) => {
    setDraft({ ...row, logo_url: row.logo_url ?? "" });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveAboutPartner({
        id: draft.id,
        organization_name: draft.organization_name ?? "",
        continent: draft.continent ?? "",
        country: draft.country ?? "",
        region: draft.region ?? "",
        logo_url: draft.logo_url ?? "",
        short_description: draft.short_description ?? "",
        sort_order: Number(draft.sort_order ?? 0),
        is_published: draft.is_published ?? true,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Partner saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image must be under 5 MB");
      return;
    }
    if (!ACCEPT_TYPES.has(file.type)) {
      toast.error("Use JPG, PNG, WebP, or SVG");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAboutPartnerLogo(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDraft((d) => ({ ...d, logo_url: res.url }));
      toast.success("Logo uploaded");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = (id: string) => {
    if (!confirm("Remove this partner?")) return;
    startTransition(async () => {
      const res = await deleteAboutPartner(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Our Partners</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Shown on the public About page between <em>Our Values</em> and <em>Our Team</em> — circular logos in a slow
            marquee.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add partner
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Partners</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {partners.map((p) => {
                const loc = [p.region, p.country, p.continent].map((s) => s?.trim()).filter(Boolean).join(" · ");
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.organization_name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-600">{loc || "—"}</td>
                    <td className="px-4 py-3">{p.is_published ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => onDelete(p.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No partners yet — add a few for the About page rail.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-xl rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="max-h-[90vh] space-y-4 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit partner" : "New partner"}</h3>

          <div>
            <Label htmlFor="oname">Organisation name</Label>
            <Input
              id="oname"
              required
              value={draft.organization_name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, organization_name: e.target.value }))}
              className="mt-1.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="oreg">Region</Label>
              <Input
                id="oreg"
                value={draft.region ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                placeholder="e.g. Western Europe"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="octy">Country</Label>
              <Input
                id="octy"
                value={draft.country ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                placeholder="e.g. Italy"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ocont">Continent</Label>
              <Input
                id="ocont"
                value={draft.continent ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, continent: e.target.value }))}
                placeholder="e.g. Europe"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Logo or icon</Label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {draft.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- CMS URL
                <img src={draft.logo_url} alt="" className="h-16 w-16 rounded-full border border-zinc-200 object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs text-zinc-500">
                  No logo
                </div>
              )}
              <label className="inline-flex cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={onPickLogo} disabled={uploading} />
                {uploading ? "Uploading…" : "Upload image"}
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="odes">Short description</Label>
            <Textarea
              id="odes"
              value={draft.short_description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, short_description: e.target.value }))}
              className="mt-1.5 min-h-[88px]"
              maxLength={800}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="osort">Sort order</Label>
              <Input
                id="osort"
                type="number"
                value={draft.sort_order ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input
                id="opub"
                type="checkbox"
                checked={Boolean(draft.is_published)}
                onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
              />
              <Label htmlFor="opub" className="font-normal">
                Published (visible on site)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-amber-600 text-white hover:bg-amber-500">
              {pending ? "Saving…" : "Save partner"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
