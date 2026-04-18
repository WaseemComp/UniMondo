"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSuccessStory, saveSuccessStory } from "@/app/admin/cms/success-stories-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SuccessStoryAdminRow = {
  id: string;
  profile_image_url: string;
  full_name: string;
  testimonial: string;
  country: string | null;
  program: string | null;
  university: string | null;
  sort_order: number;
  is_published: boolean;
};

type Props = {
  stories: SuccessStoryAdminRow[];
};

export function SuccessStoriesManager({ stories: initial }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState(initial);
  const [draft, setDraft] = useState<Partial<SuccessStoryAdminRow>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStories(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({
      profile_image_url: "",
      full_name: "",
      testimonial: "",
      country: "",
      program: "",
      university: "",
      sort_order: stories.length,
      is_published: true,
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: SuccessStoryAdminRow) => {
    setDraft({
      ...row,
      country: row.country ?? "",
      program: row.program ?? "",
      university: row.university ?? "",
    });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        id: draft.id,
        profile_image_url: draft.profile_image_url ?? "",
        full_name: draft.full_name ?? "",
        testimonial: draft.testimonial ?? "",
        country: draft.country ?? "",
        program: draft.program ?? "",
        university: draft.university ?? "",
        sort_order: Number(draft.sort_order ?? 0),
        is_published: Boolean(draft.is_published),
      };
      const res = await saveSuccessStory(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Success story saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this success story?")) return;
    startTransition(async () => {
      const res = await deleteSuccessStory(id);
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
          <h1 className="text-2xl font-bold text-zinc-900">Success stories</h1>
          <p className="mt-1 text-sm text-zinc-600">Shown on the home page (up to six published stories).</p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          New story
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All stories</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stories.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.full_name}</td>
                  <td className="px-4 py-3">{s.is_published ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{s.sort_order}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => onDelete(s.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {stories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No stories yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit story" : "New story"}</h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="ss-img">Profile image URL</Label>
              <Input
                id="ss-img"
                value={draft.profile_image_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, profile_image_url: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="ss-name">Full name</Label>
              <Input
                id="ss-name"
                value={draft.full_name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="ss-body">Testimonial</Label>
              <Textarea
                id="ss-body"
                value={draft.testimonial ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, testimonial: e.target.value }))}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="ss-co">Country (optional)</Label>
                <Input id="ss-co" value={draft.country ?? ""} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ss-uni">University (optional)</Label>
                <Input id="ss-uni" value={draft.university ?? ""} onChange={(e) => setDraft((d) => ({ ...d, university: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ss-prog">Program (optional)</Label>
                <Input id="ss-prog" value={draft.program ?? ""} onChange={(e) => setDraft((d) => ({ ...d, program: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ss-sort">Sort order</Label>
                <Input
                  id="ss-sort"
                  type="number"
                  value={draft.sort_order ?? 0}
                  onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input
                  id="ss-pub"
                  type="checkbox"
                  checked={Boolean(draft.is_published)}
                  onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
                  className="accent-amber-600"
                />
                <Label htmlFor="ss-pub">Published</Label>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
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
