"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteStudyAddOn,
  deleteStudyPackage,
  saveStudyAddOn,
  saveStudyPackage,
} from "@/app/admin/cms/packages-pricing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PackageAdminRow = {
  id: string;
  slug: string;
  name: string;
  teaser: string;
  description: string;
  best_for: string | null;
  features: unknown;
  price_full: string | number;
  price_installment: string | number | null;
  sort_order: number;
  is_published: boolean;
};

export type AddOnAdminRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  best_for: string | null;
  price_full: string | number;
  price_installment: string | number | null;
  sort_order: number;
  is_published: boolean;
};

type Props = {
  packages: PackageAdminRow[];
  addOns: AddOnAdminRow[];
};

function featuresToText(features: unknown): string {
  if (!Array.isArray(features)) return "";
  return features.map((x) => String(x)).join("\n");
}

export function PackagesPricingManager({ packages: initialPkgs, addOns: initialAddons }: Props) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPkgs);
  const [addOns, setAddOns] = useState(initialAddons);
  useEffect(() => {
    setPackages(initialPkgs);
  }, [initialPkgs]);
  useEffect(() => {
    setAddOns(initialAddons);
  }, [initialAddons]);

  const [pending, startTransition] = useTransition();
  const pkgDialog = useRef<HTMLDialogElement>(null);
  const addonDialog = useRef<HTMLDialogElement>(null);

  const [pkgDraft, setPkgDraft] = useState({
    id: "" as string | undefined,
    slug: "",
    name: "",
    teaser: "",
    description: "",
    best_for: "",
    featuresText: "",
    price_full: 0,
    price_installment: "" as string | number,
    sort_order: 0,
    is_published: true,
  });

  const [addonDraft, setAddonDraft] = useState({
    id: "" as string | undefined,
    slug: "",
    name: "",
    description: "",
    best_for: "",
    price_full: 0,
    price_installment: "" as string | number,
    sort_order: 0,
    is_published: true,
  });

  const openPkgCreate = () => {
    setPkgDraft({
      id: undefined,
      slug: "",
      name: "",
      teaser: "",
      description: "",
      best_for: "",
      featuresText: "",
      price_full: 0,
      price_installment: "",
      sort_order: packages.length ? Math.max(...packages.map((p) => p.sort_order ?? 0)) + 1 : 0,
      is_published: true,
    });
    pkgDialog.current?.showModal();
  };

  const openPkgEdit = (row: PackageAdminRow) => {
    setPkgDraft({
      id: row.id,
      slug: row.slug,
      name: row.name,
      teaser: row.teaser ?? "",
      description: row.description ?? "",
      best_for: row.best_for ?? "",
      featuresText: featuresToText(row.features),
      price_full: Number(row.price_full),
      price_installment: row.price_installment == null ? "" : Number(row.price_installment),
      sort_order: row.sort_order ?? 0,
      is_published: Boolean(row.is_published),
    });
    pkgDialog.current?.showModal();
  };

  const openAddonCreate = () => {
    setAddonDraft({
      id: undefined,
      slug: "",
      name: "",
      description: "",
      best_for: "",
      price_full: 0,
      price_installment: "",
      sort_order: addOns.length ? Math.max(...addOns.map((a) => a.sort_order ?? 0)) + 1 : 0,
      is_published: true,
    });
    addonDialog.current?.showModal();
  };

  const openAddonEdit = (row: AddOnAdminRow) => {
    setAddonDraft({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      best_for: row.best_for ?? "",
      price_full: Number(row.price_full),
      price_installment: row.price_installment == null ? "" : Number(row.price_installment),
      sort_order: row.sort_order ?? 0,
      is_published: Boolean(row.is_published),
    });
    addonDialog.current?.showModal();
  };

  const onSavePkg = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveStudyPackage({
        id: pkgDraft.id,
        slug: pkgDraft.slug,
        name: pkgDraft.name,
        teaser: pkgDraft.teaser,
        description: pkgDraft.description,
        best_for: pkgDraft.best_for,
        featuresText: pkgDraft.featuresText,
        price_full: pkgDraft.price_full,
        price_installment: pkgDraft.price_installment,
        sort_order: pkgDraft.sort_order,
        is_published: pkgDraft.is_published,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Package saved");
      pkgDialog.current?.close();
      router.refresh();
    });
  };

  const onSaveAddon = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveStudyAddOn({
        id: addonDraft.id,
        slug: addonDraft.slug,
        name: addonDraft.name,
        description: addonDraft.description,
        best_for: addonDraft.best_for,
        price_full: addonDraft.price_full,
        price_installment: addonDraft.price_installment,
        sort_order: addonDraft.sort_order,
        is_published: addonDraft.is_published,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Add-on saved");
      addonDialog.current?.close();
      router.refresh();
    });
  };

  const onDelPkg = (id: string) => {
    if (!confirm("Delete this package?")) return;
    startTransition(async () => {
      const res = await deleteStudyPackage(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  const onDelAddon = (id: string) => {
    if (!confirm("Delete this add-on?")) return;
    startTransition(async () => {
      const res = await deleteStudyAddOn(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Packages</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage packages and add-ons. Updates apply to the public <strong>/packages</strong> (Our packages) page and the apply
          flow.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-0 px-5 py-4">
          <CardTitle>Main packages</CardTitle>
          <Button type="button" onClick={openPkgCreate} className="bg-amber-600 text-white hover:bg-amber-500">
            Add package
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Full</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.slug}</td>
                  <td className="px-4 py-3">${Number(row.price_full)}</td>
                  <td className="px-4 py-3">{row.price_installment != null ? `$${Number(row.price_installment)}` : "—"}</td>
                  <td className="px-4 py-3">{row.is_published ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openPkgEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelPkg(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!packages.length && (
            <p className="p-6 text-center text-sm text-zinc-500">No packages. Run migrations or add one.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-0 px-5 py-4">
          <CardTitle>Add-ons</CardTitle>
          <Button type="button" onClick={openAddonCreate} className="bg-amber-600 text-white hover:bg-amber-500">
            Add add-on
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Full</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.slug}</td>
                  <td className="px-4 py-3">${Number(row.price_full)}</td>
                  <td className="px-4 py-3">{row.price_installment != null ? `$${Number(row.price_installment)}` : "—"}</td>
                  <td className="px-4 py-3">{row.is_published ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openAddonEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelAddon(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!addOns.length && (
            <p className="p-6 text-center text-sm text-zinc-500">No add-ons. Run migrations or add one.</p>
          )}
        </CardContent>
      </Card>

      <dialog
        ref={pkgDialog}
        className="w-[min(100%,640px)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSavePkg} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{pkgDraft.id ? "Edit package" : "New package"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pk-name">Name</Label>
              <Input id="pk-name" required value={pkgDraft.name} onChange={(e) => setPkgDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pk-slug">Slug</Label>
              <Input
                id="pk-slug"
                required
                placeholder="standard"
                value={pkgDraft.slug}
                onChange={(e) => setPkgDraft((d) => ({ ...d, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pk-sort">Sort order</Label>
              <Input
                id="pk-sort"
                type="number"
                value={pkgDraft.sort_order}
                onChange={(e) => setPkgDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pk-teaser">Teaser (apply form — no prices)</Label>
              <Textarea
                id="pk-teaser"
                rows={2}
                value={pkgDraft.teaser}
                onChange={(e) => setPkgDraft((d) => ({ ...d, teaser: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pk-desc">Full description (pricing page)</Label>
              <Textarea
                id="pk-desc"
                rows={3}
                value={pkgDraft.description}
                onChange={(e) => setPkgDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pk-best">Best for</Label>
              <Input
                id="pk-best"
                value={pkgDraft.best_for}
                onChange={(e) => setPkgDraft((d) => ({ ...d, best_for: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pk-feat">Features (one per line)</Label>
              <Textarea
                id="pk-feat"
                rows={4}
                value={pkgDraft.featuresText}
                onChange={(e) => setPkgDraft((d) => ({ ...d, featuresText: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pk-full">Price full (USD)</Label>
              <Input
                id="pk-full"
                type="number"
                step="0.01"
                min={0}
                required
                value={pkgDraft.price_full}
                onChange={(e) => setPkgDraft((d) => ({ ...d, price_full: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pk-inst">Price installment (USD, optional)</Label>
              <Input
                id="pk-inst"
                type="number"
                step="0.01"
                min={0}
                value={pkgDraft.price_installment}
                onChange={(e) => setPkgDraft((d) => ({ ...d, price_installment: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="pk-pub"
                type="checkbox"
                checked={pkgDraft.is_published}
                onChange={(e) => setPkgDraft((d) => ({ ...d, is_published: e.target.checked }))}
              />
              <Label htmlFor="pk-pub" className="font-normal">
                Published
              </Label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => pkgDialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-zinc-900 text-white">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={addonDialog}
        className="w-[min(100%,560px)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSaveAddon} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{addonDraft.id ? "Edit add-on" : "New add-on"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ao-name">Name</Label>
              <Input id="ao-name" required value={addonDraft.name} onChange={(e) => setAddonDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ao-slug">Slug</Label>
              <Input id="ao-slug" required value={addonDraft.slug} onChange={(e) => setAddonDraft((d) => ({ ...d, slug: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ao-sort">Sort order</Label>
              <Input
                id="ao-sort"
                type="number"
                value={addonDraft.sort_order}
                onChange={(e) => setAddonDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ao-desc">Description</Label>
              <Textarea
                id="ao-desc"
                rows={3}
                value={addonDraft.description}
                onChange={(e) => setAddonDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ao-best">Best for (optional)</Label>
              <Input id="ao-best" value={addonDraft.best_for} onChange={(e) => setAddonDraft((d) => ({ ...d, best_for: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ao-full">Price full (USD)</Label>
              <Input
                id="ao-full"
                type="number"
                step="0.01"
                min={0}
                required
                value={addonDraft.price_full}
                onChange={(e) => setAddonDraft((d) => ({ ...d, price_full: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ao-inst">Price installment (optional)</Label>
              <Input
                id="ao-inst"
                type="number"
                step="0.01"
                min={0}
                value={addonDraft.price_installment}
                onChange={(e) => setAddonDraft((d) => ({ ...d, price_installment: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="ao-pub"
                type="checkbox"
                checked={addonDraft.is_published}
                onChange={(e) => setAddonDraft((d) => ({ ...d, is_published: e.target.checked }))}
              />
              <Label htmlFor="ao-pub" className="font-normal">
                Published
              </Label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => addonDialog.current?.close()}>
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
