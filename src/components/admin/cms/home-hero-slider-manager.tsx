"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteHomeHeroSlide, saveHomeHeroSlide, type HeroSlideInput } from "@/app/admin/cms/home-page-blocks-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type HomeHeroSlideRow = {
  id: string;
  is_active: boolean;
  sort_order: number;
  content: Record<string, unknown> | null;
  media: Record<string, unknown> | null;
};

type Props = {
  slides: HomeHeroSlideRow[];
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function HomeHeroSliderManager({ slides: initial }: Props) {
  const router = useRouter();
  const [slides, setSlides] = useState(initial);
  const [draft, setDraft] = useState<HeroSlideInput | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setSlides(initial), [initial]);

  const openCreate = () => {
    setDraft({
      is_active: true,
      sort_order: slides.length,
      imageUrl: "",
      imageAlt: "",
      line: "",
      title: "",
      subtitle: "",
      buttonText: "",
      secondaryButtonText: "",
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: HomeHeroSlideRow) => {
    const c = row.content ?? {};
    const m = row.media ?? {};
    setDraft({
      id: row.id,
      is_active: row.is_active,
      sort_order: row.sort_order ?? 0,
      imageUrl: asString(m.imageUrl ?? m.src),
      imageAlt: asString(m.imageAlt ?? m.alt),
      line: (c.line as any) ?? "",
      title: (c.title as any) ?? "",
      subtitle: (c.subtitle as any) ?? "",
      buttonText: (c.buttonText as any) ?? "",
      secondaryButtonText: (c.secondaryButtonText as any) ?? "",
    });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const res = await saveHomeHeroSlide({
        ...draft,
        sort_order: Number(draft.sort_order ?? 0),
        is_active: Boolean(draft.is_active),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Hero slide saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this slide?")) return;
    startTransition(async () => {
      const res = await deleteHomeHeroSlide(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Slide deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Hero slider</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Edit slides safely (images + text). The section layout remains fixed in code.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add slide
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Slides</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {slides
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-zinc-700">{s.sort_order ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {asString(s.media?.imageUrl ?? "") ? (
                        <span className="inline-flex max-w-[260px] truncate">{asString(s.media?.imageUrl)}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">{asString((s.content ?? {}).title)}</td>
                    <td className="px-4 py-3">{s.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => onDelete(s.id)} disabled={pending}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!slides.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No slides yet. Add your first slide.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-2xl rounded-2xl p-0 shadow-2xl backdrop:bg-black/30">
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{draft?.id ? "Edit slide" : "New slide"}</h3>
              <p className="mt-1 text-sm text-zinc-600">Fields are content-only; page structure stays fixed.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Close
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={draft?.imageUrl ?? ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, imageUrl: e.target.value } : d))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Image alt text</Label>
              <Input value={draft?.imageAlt ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, imageAlt: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={String(draft?.sort_order ?? 0)}
                onChange={(e) => setDraft((d) => (d ? { ...d, sort_order: Number(e.target.value) } : d))}
              />
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft?.is_active)}
                  onChange={(e) => setDraft((d) => (d ? { ...d, is_active: e.target.checked } : d))}
                />
                Published
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slide line (small text under buttons)</Label>
            <Input value={asString(draft?.line)} onChange={(e) => setDraft((d) => (d ? { ...d, line: e.target.value } : d))} />
          </div>

          <div className="space-y-2">
            <Label>Hero title (optional per-slide override)</Label>
            <Input value={asString(draft?.title)} onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))} />
          </div>

          <div className="space-y-2">
            <Label>Hero subtitle (optional per-slide override)</Label>
            <Textarea
              rows={3}
              value={asString(draft?.subtitle)}
              onChange={(e) => setDraft((d) => (d ? { ...d, subtitle: e.target.value } : d))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary button text (optional override)</Label>
              <Input
                value={asString(draft?.buttonText)}
                onChange={(e) => setDraft((d) => (d ? { ...d, buttonText: e.target.value } : d))}
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary button text (optional override)</Label>
              <Input
                value={asString(draft?.secondaryButtonText)}
                onChange={(e) => setDraft((d) => (d ? { ...d, secondaryButtonText: e.target.value } : d))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit" disabled={pending} className="bg-[#0a1628] text-white hover:bg-[#132a4a]">
              {pending ? "Saving…" : "Save slide"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

