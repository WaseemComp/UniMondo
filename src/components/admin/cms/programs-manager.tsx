"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProgram, saveProgram } from "@/app/admin/cms/programs-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProgramAdminRow = {
  id: string;
  title: string;
  university: string;
  country: string;
  degree: string;
  intake: string;
  deadline: string;
  tuition_range: string;
  description: string | null;
  logo_url: string | null;
  logo_text: string | null;
  continent: string | null;
  region: string | null;
  is_published: boolean | null;
  sort_order: number | null;
};

const emptyDraft = (): Partial<ProgramAdminRow> & {
  degree: "bachelor" | "master";
  is_published: boolean;
  sort_order: number;
  continent: string;
  region: string;
} => ({
  degree: "master",
  is_published: true,
  sort_order: 0,
  continent: "Europe",
  region: "",
  description: "",
  title: "",
  university: "",
  country: "",
  intake: "Fall 2026",
  deadline: new Date().toISOString().slice(0, 10),
  tuition_range: "",
  logo_url: "",
  logo_text: "",
});

type Props = {
  programs: ProgramAdminRow[];
};

export function ProgramsManager({ programs: initial }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initial);

  useEffect(() => {
    setPrograms(initial);
  }, [initial]);
  const [draft, setDraft] = useState<
    Partial<ProgramAdminRow> & {
      degree?: "bachelor" | "master";
      is_published?: boolean;
      sort_order?: number;
    }
  >(() => emptyDraft());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const openCreate = () => {
    setDraft(emptyDraft());
    dialogRef.current?.showModal();
  };

  const openEdit = (row: ProgramAdminRow) => {
    setDraft({
      ...row,
      deadline: typeof row.deadline === "string" ? row.deadline.slice(0, 10) : row.deadline,
      degree: (row.degree === "bachelor" ? "bachelor" : "master") as "bachelor" | "master",
      description: row.description ?? "",
      logo_url: row.logo_url ?? "",
      logo_text: row.logo_text ?? "",
      continent: row.continent ?? "Europe",
      region: row.region ?? "",
      is_published: Boolean(row.is_published),
      sort_order: row.sort_order ?? 0,
    });
    dialogRef.current?.showModal();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        id: draft.id,
        title: draft.title ?? "",
        university: draft.university ?? "",
        country: draft.country ?? "",
        degree: draft.degree ?? "master",
        intake: draft.intake ?? "",
        deadline: draft.deadline ?? "",
        tuition_range: draft.tuition_range ?? "",
        description: draft.description ?? "",
        logo_url: draft.logo_url ?? "",
        logo_text: draft.logo_text ?? "",
        continent: draft.continent ?? "Europe",
        region: draft.region ?? "",
        is_published: Boolean(draft.is_published),
        sort_order: Number(draft.sort_order ?? 0),
      };
      const res = await saveProgram(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Program saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this program? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteProgram(id);
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
          <h1 className="text-2xl font-bold text-zinc-900">Programs</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage current openings shown on the homepage and programs page.</p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add program
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All programs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Intake</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.university}</td>
                  <td className="px-4 py-3">{row.country}</td>
                  <td className="px-4 py-3">{row.intake}</td>
                  <td className="px-4 py-3">{row.is_published ? "Yes" : "No"}</td>
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
          {!programs.length && <p className="p-6 text-center text-sm text-zinc-500">No programs yet. Add one to get started.</p>}
        </CardContent>
      </Card>

      <dialog
        ref={dialogRef}
        className="w-[min(100%,560px)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit program" : "New program"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                required
                value={draft.university ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, university: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                required
                value={draft.country ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="degree">Degree</Label>
              <select
                id="degree"
                className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                value={draft.degree ?? "master"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, degree: e.target.value as "bachelor" | "master" }))
                }
              >
                <option value="bachelor">Bachelor</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="intake">Intake</Label>
              <Input
                id="intake"
                required
                placeholder="e.g. Fall 2026"
                value={draft.intake ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, intake: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                required
                value={draft.deadline?.toString().slice(0, 10) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="tuition">Tuition range</Label>
              <Input
                id="tuition"
                required
                value={draft.tuition_range ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, tuition_range: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo_url">Logo URL (optional)</Label>
              <Input
                id="logo_url"
                type="url"
                value={draft.logo_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo_text">Logo initials (fallback)</Label>
              <Input
                id="logo_text"
                value={draft.logo_text ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, logo_text: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="continent">Continent</Label>
              <Input
                id="continent"
                value={draft.continent ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, continent: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="e.g. Western Europe"
                value={draft.region ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
              />
            </div>
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
                id="pub"
                type="checkbox"
                checked={Boolean(draft.is_published)}
                onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
              />
              <Label htmlFor="pub" className="font-normal">
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
