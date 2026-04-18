"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTeamMember, saveTeamMember, uploadTeamMemberPhoto } from "@/app/admin/cms/team-members-actions";
import type { TeamMemberRow } from "@/lib/data/about-page";
import { TeamPhotoCropDialog } from "@/components/admin/cms/team-photo-crop-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type Props = {
  members: TeamMemberRow[];
};

export function TeamMembersManager({ members: initial }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [draft, setDraft] = useState<Partial<TeamMemberRow>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initial);
  }, [initial]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const openCreate = () => {
    setDraft({ name: "", qualification: "", bio: "", image_url: "", sort_order: members.length });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: TeamMemberRow) => {
    setDraft({ ...row, image_url: row.image_url ?? "" });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTeamMember({
        id: draft.id,
        name: draft.name ?? "",
        qualification: draft.qualification ?? "",
        bio: draft.bio ?? "",
        image_url: draft.image_url ?? "",
        sort_order: Number(draft.sort_order ?? 0),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Team member saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropOpen(false);
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image must be under 5 MB");
      return;
    }
    if (!ACCEPT_TYPES.has(file.type)) {
      toast.error("Use JPG, PNG, or WebP");
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
  };

  const onCropApply = async (croppedFile: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", croppedFile);
      const res = await uploadTeamMemberPhoto(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDraft((d) => ({ ...d, image_url: res.url }));
      toast.success("Photo uploaded");
      closeCrop();
    } finally {
      setUploading(false);
    }
  };

  const onDelete = (id: string) => {
    if (!confirm("Remove this team member?")) return;
    startTransition(async () => {
      const res = await deleteTeamMember(id);
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
          <h1 className="text-2xl font-bold text-zinc-900">Team members</h1>
          <p className="mt-1 text-sm text-zinc-600">Shown under “Our Team” on the About page.</p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add member
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{m.name}</td>
                  <td className="px-4 py-3">{m.qualification}</td>
                  <td className="px-4 py-3">{m.sort_order}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => onDelete(m.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No team members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit member" : "New member"}</h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="tm-photo">Profile photo</Label>
              <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input
                  id="tm-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickPhoto}
                  className="text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-amber-900 hover:file:bg-amber-200"
                />
                {draft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview for arbitrary storage URL
                  <img src={draft.image_url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-200" />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                JPG, PNG or WebP · max 5 MB · after you choose a file you can zoom and frame the photo before upload.
              </p>
              <div className="mt-2">
                <Label htmlFor="tm-img-url">Or paste image URL (optional)</Label>
                <Input
                  id="tm-img-url"
                  value={draft.image_url ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tm-name">Name</Label>
              <Input id="tm-name" value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="tm-qual">Qualification</Label>
              <Input
                id="tm-qual"
                value={draft.qualification ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, qualification: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tm-bio">Short bio</Label>
              <Textarea id="tm-bio" value={draft.bio ?? ""} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} className="min-h-[100px]" />
            </div>
            <div>
              <Label htmlFor="tm-sort">Sort order</Label>
              <Input
                id="tm-sort"
                type="number"
                value={draft.sort_order ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || uploading} className="bg-amber-600 text-white hover:bg-amber-500">
              {pending || uploading ? "Working…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>

      <TeamPhotoCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={closeCrop}
        onApply={onCropApply}
        applying={uploading}
      />
    </div>
  );
}
