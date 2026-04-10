"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBlog, saveBlog } from "@/app/admin/cms/blogs-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BlogAdminRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
};

type Props = {
  blogs: BlogAdminRow[];
};

export function BlogsManager({ blogs: initial }: Props) {
  const router = useRouter();
  const [blogs, setBlogs] = useState(initial);
  const [draft, setDraft] = useState<Partial<BlogAdminRow>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setBlogs(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      image_url: "",
      published: false,
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: BlogAdminRow) => {
    setDraft({
      ...row,
      image_url: row.image_url ?? "",
    });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        id: draft.id,
        title: draft.title ?? "",
        slug: (draft.slug ?? "").trim().toLowerCase(),
        excerpt: draft.excerpt ?? "",
        content: draft.content ?? "",
        image_url: draft.image_url ?? "",
        published: Boolean(draft.published),
      };
      const res = await saveBlog(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Blog saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this post?")) return;
    startTransition(async () => {
      const res = await deleteBlog(id);
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
          <h1 className="text-2xl font-bold text-zinc-900">Blog</h1>
          <p className="mt-1 text-sm text-zinc-600">Markdown-friendly posts (rendered as plain text with line breaks on the site).</p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          New post
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All posts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.slug}</td>
                  <td className="px-4 py-3">{row.published ? "Yes" : "No"}</td>
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
          {!blogs.length && <p className="p-6 text-center text-sm text-zinc-500">No posts yet.</p>}
        </CardContent>
      </Card>

      <dialog
        ref={dialogRef}
        className="w-[min(100%,640px)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit post" : "New post"}</h2>
          <div className="mt-4 grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="bt">Title</Label>
              <Input
                id="bt"
                required
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bs">Slug (optional — auto from title if empty)</Label>
              <Input
                id="bs"
                value={draft.slug ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="be">Excerpt</Label>
              <Textarea
                id="be"
                value={draft.excerpt ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bc">Content (markdown or plain text)</Label>
              <Textarea
                id="bc"
                className="min-h-[200px] font-mono text-[13px]"
                value={draft.content ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bi">Cover image URL</Label>
              <Input
                id="bi"
                type="url"
                value={draft.image_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="bp"
                type="checkbox"
                checked={Boolean(draft.published)}
                onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
              />
              <Label htmlFor="bp" className="font-normal">
                Published
              </Label>
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
